use crate::models::{
    AudioSettings, ConversionProfile, ConversionProgress, ConversionResult, ConversionRunRequest,
    MediaFormatInfo, MediaProbe, MediaStream, ResolutionSettings, ToolDescriptor, ToolSource,
    ToolingStatus, VideoSettings,
};
use serde::Deserialize;
use std::env;
use std::ffi::OsString;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug)]
pub struct ToolResolution {
    pub path: PathBuf,
    pub source: ToolSource,
}

#[derive(Deserialize)]
struct RawProbeOutput {
    format: RawFormat,
    streams: Vec<RawStream>,
}

#[derive(Deserialize)]
struct RawFormat {
    format_name: Option<String>,
    duration: Option<String>,
    bit_rate: Option<String>,
    size: Option<String>,
}

#[derive(Deserialize)]
struct RawStream {
    index: usize,
    codec_type: Option<String>,
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    avg_frame_rate: Option<String>,
    pix_fmt: Option<String>,
    bit_rate: Option<String>,
    sample_rate: Option<String>,
    channels: Option<u32>,
}

pub fn resolve_tooling_status(app: &AppHandle) -> Result<ToolingStatus, String> {
    Ok(ToolingStatus {
        ffmpeg: descriptor_from_resolution(resolve_tool(app, "ffmpeg", "FFMPEG_PATH")?),
        ffprobe: descriptor_from_resolution(resolve_tool(app, "ffprobe", "FFPROBE_PATH")?),
    })
}

pub fn probe_media_file(app: &AppHandle, input_path: &str) -> Result<MediaProbe, String> {
    let ffprobe = resolve_tool(app, "ffprobe", "FFPROBE_PATH")?
        .ok_or_else(|| "ffprobe was not found. Bundle it or install it on PATH.".to_string())?;

    let output = Command::new(ffprobe.path)
        .args([
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            input_path,
        ])
        .output()
        .map_err(|error| format!("failed to run ffprobe: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let parsed: RawProbeOutput =
        serde_json::from_slice(&output.stdout).map_err(|error| format!("invalid ffprobe output: {error}"))?;

    Ok(MediaProbe {
        format: MediaFormatInfo {
            path: input_path.to_string(),
            container: parsed
                .format
                .format_name
                .unwrap_or_else(|| "unknown".to_string()),
            duration_seconds: parse_f64(parsed.format.duration),
            bit_rate: parse_u64(parsed.format.bit_rate),
            size_bytes: parse_u64(parsed.format.size),
        },
        streams: parsed
            .streams
            .into_iter()
            .map(|stream| MediaStream {
                index: stream.index,
                codec_type: stream.codec_type.unwrap_or_else(|| "unknown".to_string()),
                codec_name: stream.codec_name,
                width: stream.width,
                height: stream.height,
                frame_rate: parse_frame_rate(stream.avg_frame_rate),
                pixel_format: stream.pix_fmt,
                bit_rate: parse_u64(stream.bit_rate),
                sample_rate: parse_u32(stream.sample_rate),
                channels: stream.channels,
            })
            .collect(),
    })
}

pub fn run_conversion_job(app: &AppHandle, request: ConversionRunRequest) -> Result<ConversionResult, String> {
    let ffmpeg = resolve_tool(app, "ffmpeg", "FFMPEG_PATH")?
        .ok_or_else(|| "ffmpeg was not found. Bundle it or install it on PATH.".to_string())?;

    let args = build_ffmpeg_args(&request.input_path, &request.output_path, &request.profile);
    let total_duration_seconds = probe_media_file(app, &request.input_path)
        .ok()
        .and_then(|probe| probe.format.duration_seconds);

    let mut child = Command::new(ffmpeg.path)
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to run ffmpeg: {error}"))?;

    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture ffmpeg stderr".to_string())?;

    let mut stderr_output = String::new();
    let mut progress = ConversionProgress {
        phase: "running".to_string(),
        percent: Some(0.0),
        frame: None,
        fps: None,
        speed: None,
        output_time_seconds: Some(0.0),
        total_duration_seconds,
        raw_line: Some("Starting conversion...".to_string()),
    };

    app.emit("conversion-progress", progress.clone())
        .map_err(|error| format!("failed to emit conversion progress: {error}"))?;

    for line in BufReader::new(stderr).lines() {
        let line = line.map_err(|error| format!("failed to read ffmpeg output: {error}"))?;
        if line.is_empty() {
            continue;
        }

        stderr_output.push_str(&line);
        stderr_output.push('\n');

        update_progress_from_line(&mut progress, &line);
        app.emit("conversion-progress", progress.clone())
            .map_err(|error| format!("failed to emit conversion progress: {error}"))?;
    }

    let status = child
        .wait()
        .map_err(|error| format!("failed to wait for ffmpeg: {error}"))?;

    progress.phase = if status.success() {
        "completed".to_string()
    } else {
        "failed".to_string()
    };
    progress.percent = if status.success() { Some(100.0) } else { progress.percent };
    progress.raw_line = Some(if status.success() {
        "Conversion completed.".to_string()
    } else {
        "Conversion failed.".to_string()
    });

    app.emit("conversion-progress", progress)
        .map_err(|error| format!("failed to emit final conversion progress: {error}"))?;

    Ok(ConversionResult {
        success: status.success(),
        exit_code: status.code().unwrap_or(-1),
        stderr: stderr_output,
    })
}

fn descriptor_from_resolution(resolution: Option<ToolResolution>) -> ToolDescriptor {
    if let Some(tool) = resolution {
        ToolDescriptor {
            available: true,
            source: tool.source,
            path: Some(tool.path.to_string_lossy().to_string()),
        }
    } else {
        ToolDescriptor {
            available: false,
            source: ToolSource::Missing,
            path: None,
        }
    }
}

fn resolve_tool(
    app: &AppHandle,
    base_name: &str,
    environment_key: &str,
) -> Result<Option<ToolResolution>, String> {
    if let Some(value) = env::var_os(environment_key) {
        let path = PathBuf::from(value);
        if path.exists() {
            return Ok(Some(ToolResolution {
                path,
                source: ToolSource::Environment,
            }));
        }
    }

    if let Some(path) = bundled_tool_path(app, base_name)? {
        return Ok(Some(ToolResolution {
            path,
            source: ToolSource::Bundled,
        }));
    }

    if let Some(path) = find_on_path(executable_name(base_name)) {
        return Ok(Some(ToolResolution {
            path,
            source: ToolSource::SystemPath,
        }));
    }

    Ok(None)
}

fn bundled_tool_path(app: &AppHandle, base_name: &str) -> Result<Option<PathBuf>, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("unable to resolve resource dir: {error}"))?;

    let candidate = resource_dir
        .join("resources")
        .join("bin")
        .join(platform_name())
        .join(executable_name(base_name));

    Ok(candidate.exists().then_some(candidate))
}

fn executable_name(base_name: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{base_name}.exe")
    } else {
        base_name.to_string()
    }
}

fn platform_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn find_on_path(executable: String) -> Option<PathBuf> {
    let path_var = env::var_os("PATH")?;

    env::split_paths(&path_var).find_map(|candidate_dir| {
        let candidate = candidate_dir.join(&executable);
        if candidate.exists() && is_executable(&candidate) {
            Some(candidate)
        } else {
            None
        }
    })
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(path) {
            return metadata.permissions().mode() & 0o111 != 0;
        }
        false
    }

    #[cfg(not(unix))]
    {
        true
    }
}

fn parse_u64(value: Option<String>) -> Option<u64> {
    value.and_then(|item| item.parse::<u64>().ok())
}

fn parse_u32(value: Option<String>) -> Option<u32> {
    value.and_then(|item| item.parse::<u32>().ok())
}

fn parse_f64(value: Option<String>) -> Option<f64> {
    value.and_then(|item| item.parse::<f64>().ok())
}

fn parse_frame_rate(value: Option<String>) -> Option<f64> {
    let raw = value?;
    let parts: Vec<&str> = raw.split('/').collect();

    if parts.len() == 2 {
        let numerator = parts[0].parse::<f64>().ok()?;
        let denominator = parts[1].parse::<f64>().ok()?;
        if denominator == 0.0 {
            return None;
        }
        return Some(numerator / denominator);
    }

    raw.parse::<f64>().ok()
}

fn build_ffmpeg_args(input_path: &str, output_path: &str, profile: &ConversionProfile) -> Vec<OsString> {
    let mut args = vec![
        OsString::from(if profile.overwrite_output { "-y" } else { "-n" }),
        OsString::from("-i"),
        OsString::from(input_path),
    ];

    apply_video_args(&mut args, &profile.container, &profile.video);
    apply_audio_args(&mut args, &profile.audio);

    for extra_arg in &profile.extra_args {
        args.push(OsString::from(extra_arg));
    }

    args.push(OsString::from("-progress"));
    args.push(OsString::from("pipe:2"));
    args.push(OsString::from("-nostats"));
    args.push(OsString::from(output_path));
    args
}

fn update_progress_from_line(progress: &mut ConversionProgress, line: &str) {
    progress.raw_line = Some(line.to_string());

    let Some((key, value)) = line.split_once('=') else {
        return;
    };

    match key {
        "frame" => progress.frame = value.parse::<u64>().ok(),
        "fps" => progress.fps = value.parse::<f64>().ok(),
        "speed" => progress.speed = value.trim_end_matches('x').parse::<f64>().ok(),
        "out_time_ms" => {
            let micros = value.parse::<f64>().ok();
            progress.output_time_seconds = micros.map(|item| item / 1_000_000.0);
            progress.percent =
                calculate_percent(progress.output_time_seconds, progress.total_duration_seconds);
        }
        "out_time_us" => {
            let micros = value.parse::<f64>().ok();
            progress.output_time_seconds = micros.map(|item| item / 1_000_000.0);
            progress.percent =
                calculate_percent(progress.output_time_seconds, progress.total_duration_seconds);
        }
        "progress" if value == "end" => {
            progress.phase = "completed".to_string();
            progress.percent = Some(100.0);
        }
        "progress" => progress.phase = "running".to_string(),
        _ => {}
    }
}

fn calculate_percent(
    output_time_seconds: Option<f64>,
    total_duration_seconds: Option<f64>,
) -> Option<f64> {
    let current = output_time_seconds?;
    let total = total_duration_seconds?;
    if total <= 0.0 {
        return None;
    }

    Some((current / total * 100.0).clamp(0.0, 100.0))
}

fn apply_video_args(args: &mut Vec<OsString>, container: &str, video: &VideoSettings) {
    if container == "mp3" {
        args.push(OsString::from("-vn"));
        return;
    }

    if video.codec == "copy" {
        args.push(OsString::from("-c:v"));
        args.push(OsString::from("copy"));
        return;
    }

    args.push(OsString::from("-c:v"));
    args.push(OsString::from(&video.codec));

    if let Some(bitrate) = video.bitrate_kbps {
        args.push(OsString::from("-b:v"));
        args.push(OsString::from(format!("{bitrate}k")));
    }

    if let Some(crf) = video.crf {
        args.push(OsString::from("-crf"));
        args.push(OsString::from(crf.to_string()));
    }

    if let Some(preset) = &video.preset {
        args.push(OsString::from("-preset"));
        args.push(OsString::from(preset));
    }

    if let Some(frame_rate) = video.frame_rate {
        args.push(OsString::from("-r"));
        args.push(OsString::from(frame_rate.to_string()));
    }

    if let Some(pixel_format) = &video.pixel_format {
        args.push(OsString::from("-pix_fmt"));
        args.push(OsString::from(pixel_format));
    }

    if let ResolutionSettings {
        mode,
        width: Some(width),
        height: Some(height),
    } = &video.resolution
    {
        if mode == "custom" {
            args.push(OsString::from("-vf"));
            args.push(OsString::from(format!("scale={width}:{height}")));
        }
    }
}

fn apply_audio_args(args: &mut Vec<OsString>, audio: &AudioSettings) {
    if audio.codec == "none" {
        args.push(OsString::from("-an"));
        return;
    }

    if audio.codec == "copy" {
        args.push(OsString::from("-c:a"));
        args.push(OsString::from("copy"));
        return;
    }

    args.push(OsString::from("-c:a"));
    args.push(OsString::from(&audio.codec));

    if let Some(bitrate) = audio.bitrate_kbps {
        args.push(OsString::from("-b:a"));
        args.push(OsString::from(format!("{bitrate}k")));
    }

    if let Some(channels) = audio.channels {
        args.push(OsString::from("-ac"));
        args.push(OsString::from(channels.to_string()));
    }

    if let Some(sample_rate) = audio.sample_rate {
        args.push(OsString::from("-ar"));
        args.push(OsString::from(sample_rate.to_string()));
    }
}
