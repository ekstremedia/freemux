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
    let pid = state
        .child_pid
        .lock()
        .map_err(|error| format!("failed to lock conversion state: {error}"))?
        .take();

    if let Some(pid) = pid {
        #[cfg(unix)]
        {
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
        }

        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }
    }

    Ok(())
}
