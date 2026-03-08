#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use openbr_desktop::{init_logging, AppState};
use tauri::{Manager, WindowEvent};

fn main() {
    init_logging();

    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            openbr_desktop::get_app_version,
            openbr_desktop::get_gateway_status,
            openbr_desktop::set_gateway_url,
            openbr_desktop::get_gateway_url,
            openbr_desktop::open_settings,
            openbr_desktop::show_window,
            openbr_desktop::hide_window,
            openbr_desktop::quit_app,
        ])
        .setup(|app| {
            log::info!("Setting up OpenBR Desktop application");

            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                WindowEvent::CloseRequested { api, .. } => {
                    // Prevent default close behavior
                    api.prevent_close();
                    // Hide window instead of closing
                    if let Err(e) = event.window().hide() {
                        log::error!("Failed to hide window: {}", e);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
