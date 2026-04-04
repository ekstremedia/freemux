mod commands;
mod ffmpeg;
mod models;
mod profiles;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_tooling_status,
            commands::probe_media,
            commands::load_profiles,
            commands::save_profile,
            commands::delete_profile,
            commands::run_conversion,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
