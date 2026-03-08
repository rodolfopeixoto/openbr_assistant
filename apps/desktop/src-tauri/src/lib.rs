use serde::{Deserialize, Serialize};
use tauri::{Manager, State, Window};
use std::sync::Mutex;
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
pub fn get_app_version(state: State<AppState>) -> String {
    state.app_version.clone()
}

// Get gateway status
#[tauri::command]
pub async fn get_gateway_status(state: State<'_, AppState>) -> Result<GatewayStatus, String> {
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
pub fn set_gateway_url(url: String, state: State<AppState>) -> Result<(), String> {
    let mut gateway_url = state.gateway_url.lock().map_err(|e| e.to_string())?;
    *gateway_url = url;
    info!("Gateway URL updated to: {}", gateway_url);
    Ok(())
}

// Get current gateway URL
#[tauri::command]
pub fn get_gateway_url(state: State<AppState>) -> Result<String, String> {
    let url = state.gateway_url.lock().map_err(|e| e.to_string())?;
    Ok(url.clone())
}

// Open settings window
#[tauri::command]
pub fn open_settings(window: Window) -> Result<(), String> {
    info!("Opening settings");
    // For now, just emit an event to the frontend
    window.emit("open-settings", ()).map_err(|e| e.to_string())
}

// Show window
#[tauri::command]
pub fn show_window(window: Window) -> Result<(), String> {
    info!("Showing window");
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

// Hide window
#[tauri::command]
pub fn hide_window(window: Window) -> Result<(), String> {
    info!("Hiding window");
    window.hide().map_err(|e| e.to_string())
}

// Quit application
#[tauri::command]
pub fn quit_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Quitting application");
    app_handle.exit(0);
    Ok(())
}

// Initialize logging
pub fn init_logging() {
    env_logger::init();
    info!("OpenBR Desktop started");
}
