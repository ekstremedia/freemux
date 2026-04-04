use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionSettings {
    pub mode: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSettings {
    pub codec: String,
    pub bitrate_kbps: Option<u32>,
    pub crf: Option<u32>,
    pub preset: Option<String>,
    pub frame_rate: Option<f64>,
    pub pixel_format: Option<String>,
    pub resolution: ResolutionSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub codec: String,
    pub bitrate_kbps: Option<u32>,
    pub channels: Option<u32>,
    pub sample_rate: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProfile {
    pub id: String,
    pub name: String,
    pub container: String,
    pub video: VideoSettings,
    pub audio: AudioSettings,
    pub extra_args: Vec<String>,
    pub overwrite_output: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionRunRequest {
    pub input_path: String,
    pub output_path: String,
    pub profile: ConversionProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionResult {
    pub success: bool,
    pub exit_code: i32,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub phase: String,
    pub percent: Option<f64>,
    pub frame: Option<u64>,
    pub fps: Option<f64>,
    pub speed: Option<f64>,
    pub output_time_seconds: Option<f64>,
    pub total_duration_seconds: Option<f64>,
    pub raw_line: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaFormatInfo {
    pub path: String,
    pub container: String,
    pub duration_seconds: Option<f64>,
    pub bit_rate: Option<u64>,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaStream {
    pub index: usize,
    pub codec_type: String,
    pub codec_name: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<f64>,
    pub pixel_format: Option<String>,
    pub bit_rate: Option<u64>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbe {
    pub format: MediaFormatInfo,
    pub streams: Vec<MediaStream>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ToolSource {
    Bundled,
    Environment,
    SystemPath,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolDescriptor {
    pub available: bool,
    pub source: ToolSource,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolingStatus {
    pub ffmpeg: ToolDescriptor,
    pub ffprobe: ToolDescriptor,
}
