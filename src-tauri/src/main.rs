// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Set WebKit environment variable BEFORE Tauri/WebKit initializes
    // This fixes white screen issues on NVIDIA GPU systems
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    freemux_lib::run()
}
