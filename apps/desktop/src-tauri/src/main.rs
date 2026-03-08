#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State, Window, WindowEvent};
use log::info;

// Application state
pub struct AppState {
    pub gateway_url: Mutex<String>,
    pub app_version: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            gateway_url: Mutex::new("http://localhost:18789".to_string()),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

// Gateway status response
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GatewayStatus {
    pub online: bool,
    pub version: Option<String>,
    pub url: String,
    pub error: Option<String>,
}

// Get application version
#[tauri::command]
fn get_app_version(state: State<AppState>) -> String {
    state.app_version.clone()
}

// Get gateway status
#[tauri::command]
async fn get_gateway_status(state: State<'_, AppState>) -> Result<GatewayStatus, String> {
    let url = state.gateway_url.lock().map_err(|e| e.to_string())?.clone();
    
    info!("Checking gateway status at: {}", url);
    
    // Try to connect to gateway
    match reqwest::get(format!("{}/health", url)).await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(GatewayStatus {
                    online: true,
                    version: None,
                    url,
                    error: None,
                })
            } else {
                Ok(GatewayStatus {
                    online: false,
                    version: None,
                    url,
                    error: Some(format!("Gateway returned status: {}", response.status())),
                })
            }
        }
        Err(e) => {
            Ok(GatewayStatus {
                online: false,
                version: None,
                url,
                error: Some(format!("Failed to connect: {}", e)),
            })
        }
    }
}

// Set gateway URL
#[tauri::command]
fn set_gateway_url(url: String, state: State<AppState>) -> Result<(), String> {
    let mut gateway_url = state.gateway_url.lock().map_err(|e| e.to_string())?;
    *gateway_url = url;
    info!("Gateway URL updated to: {}", gateway_url);
    Ok(())
}

// Get current gateway URL
#[tauri::command]
fn get_gateway_url(state: State<AppState>) -> Result<String, String> {
    let url = state.gateway_url.lock().map_err(|e| e.to_string())?;
    Ok(url.clone())
}

// Show window
#[tauri::command]
fn show_window(window: Window) -> Result<(), String> {
    info!("Showing window");
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

// Hide window
#[tauri::command]
fn hide_window(window: Window) -> Result<(), String> {
    info!("Hiding window");
    window.hide().map_err(|e| e.to_string())
}

// Quit application
#[tauri::command]
fn quit_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Quitting application");
    app_handle.exit(0);
    Ok(())
}

// Initialize logging
fn init_logging() {
    env_logger::init();
    info!("OpenBR Desktop started");
}

fn main() {
    init_logging();

    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_gateway_status,
            set_gateway_url,
            get_gateway_url,
            show_window,
            hide_window,
            quit_app,
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
