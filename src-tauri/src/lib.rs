mod commands;
mod ffmpeg;
mod models;
mod profiles;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(models::ConversionState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_tooling_status,
            commands::probe_media,
            commands::get_available_encoders,
            commands::get_file_size,
            commands::load_profiles,
            commands::save_profile,
            commands::replace_profiles,
            commands::delete_profile,
            commands::import_profiles,
            commands::export_profiles,
            commands::get_profiles_file_path,
            commands::run_conversion,
            commands::get_thumbnail,
            commands::cancel_conversion,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
