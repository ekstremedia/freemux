#[cfg(unix)]
extern crate libc;

use crate::ffmpeg::{generate_thumbnail, probe_media_file, resolve_tooling_status, run_conversion_job};
use crate::models::{
    ConversionProfile, ConversionResult, ConversionRunRequest, ConversionState, MediaProbe,
    ToolingStatus,
};
use crate::profiles::ProfilesRepository;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn get_tooling_status(app: AppHandle) -> Result<ToolingStatus, String> {
    resolve_tooling_status(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn probe_media(app: AppHandle, input_path: String) -> Result<MediaProbe, String> {
    probe_media_file(&app, &input_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn load_profiles(app: AppHandle) -> Result<Vec<ConversionProfile>, String> {
    let repository = ProfilesRepository::new(app.path().app_data_dir().map_err(|error| error.to_string())?);
    repository.load().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn save_profile(app: AppHandle, profile: ConversionProfile) -> Result<ConversionProfile, String> {
    let repository = ProfilesRepository::new(app.path().app_data_dir().map_err(|error| error.to_string())?);
    repository.save(profile).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn delete_profile(app: AppHandle, profile_id: String) -> Result<(), String> {
    let repository = ProfilesRepository::new(app.path().app_data_dir().map_err(|error| error.to_string())?);
    repository.delete(&profile_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn run_conversion(
    app: AppHandle,
    request: ConversionRunRequest,
) -> Result<ConversionResult, String> {
    run_conversion_job(&app, request).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, input_path: String) -> Result<String, String> {
    generate_thumbnail(&app, &input_path)
}

#[tauri::command]
pub async fn cancel_conversion(state: State<'_, ConversionState>) -> Result<(), String> {
    let pid = *state
        .child_pid
        .lock()
        .map_err(|error| format!("failed to lock conversion state: {error}"))?;

    if let Some(pid) = pid {
        #[cfg(unix)]
        {
            let result = unsafe { libc::kill(pid as i32, libc::SIGTERM) };
            if result != 0 {
                return Err(format!(
                    "failed to terminate ffmpeg pid {pid}: {}",
                    std::io::Error::last_os_error()
                ));
            }
        }

        #[cfg(windows)]
        {
            let output = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output()
                .map_err(|error| format!("failed to run taskkill for pid {pid}: {error}"))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let details = if stderr.is_empty() {
                    format!("taskkill exited with status {}", output.status)
                } else {
                    stderr
                };
                return Err(format!("failed to terminate ffmpeg pid {pid}: {details}"));
            }
        }

        let mut child_pid = state
            .child_pid
            .lock()
            .map_err(|error| format!("failed to lock conversion state: {error}"))?;
        if *child_pid == Some(pid) {
            child_pid.take();
        }
    }

    Ok(())
}
