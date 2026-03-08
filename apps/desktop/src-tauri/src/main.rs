#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::sync::{Mutex, Arc};
use tauri::{Manager, State, Window, WindowEvent, SystemTray, SystemTrayMenu, CustomMenuItem, SystemTrayEvent, GlobalShortcutManager};
use log::info;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::interval;

// Window state for persistence
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WindowState {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: 100.0,
            y: 100.0,
            width: 1200.0,
            height: 800.0,
            maximized: false,
        }
    }
}

// Gateway health status
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GatewayHealth {
    pub online: bool,
    pub last_check: Option<String>,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

impl Default for GatewayHealth {
    fn default() -> Self {
        Self {
            online: false,
            last_check: None,
            latency_ms: None,
            error: None,
        }
    }
}

// Application state
pub struct AppState {
    pub gateway_url: Mutex<String>,
    pub app_version: String,
    pub window_state_path: PathBuf,
    pub gateway_health: Arc<Mutex<GatewayHealth>>,
}

impl AppState {
    pub fn new(app_dir: PathBuf) -> Self {
        Self {
            gateway_url: Mutex::new("http://localhost:18789".to_string()),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            window_state_path: app_dir.join("window_state.json"),
            gateway_health: Arc::new(Mutex::new(GatewayHealth::default())),
        }
    }

    pub fn load_window_state(&self) -> WindowState {
        match fs::read_to_string(&self.window_state_path) {
            Ok(content) => {
                serde_json::from_str(&content).unwrap_or_default()
            }
            Err(_) => WindowState::default(),
        }
    }

    pub fn save_window_state(&self, state: &WindowState) -> Result<(), String> {
        let content = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
        fs::write(&self.window_state_path, content).map_err(|e| e.to_string())
    }

    pub fn get_gateway_health(&self) -> GatewayHealth {
        self.gateway_health.lock().unwrap().clone()
    }

    pub fn update_gateway_health(&self, health: GatewayHealth) {
        if let Ok(mut guard) = self.gateway_health.lock() {
            *guard = health;
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

// Get gateway status with health check
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

// Get cached gateway health
#[tauri::command]
fn get_gateway_health(state: State<AppState>) -> GatewayHealth {
    state.get_gateway_health()
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

// Toggle window visibility
fn toggle_window(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            Ok(false) => {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Err(e) => {
                log::error!("Failed to check window visibility: {}", e);
            }
        }
    }
}

// Quit application
#[tauri::command]
fn quit_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("Quitting application");
    app_handle.exit(0);
    Ok(())
}

// Save current window state
#[tauri::command]
fn save_window_bounds(window: Window, state: State<AppState>) -> Result<(), String> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let maximized = window.is_maximized().map_err(|e| e.to_string())?;
    
    let window_state = WindowState {
        x: position.x as f64,
        y: position.y as f64,
        width: size.width as f64,
        height: size.height as f64,
        maximized,
    };
    
    state.save_window_state(&window_state)?;
    info!("Window state saved: {:?}", window_state);
    Ok(())
}

// Background health check task
async fn health_check_task(app_handle: tauri::AppHandle, state: Arc<AppState>) {
    let mut interval = interval(Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        
        let url = match state.gateway_url.lock() {
            Ok(guard) => guard.clone(),
            Err(_) => continue,
        };
        
        let start = std::time::Instant::now();
        let health = match reqwest::get(format!("{}/health", url)).await {
            Ok(response) => {
                let latency = start.elapsed().as_millis() as u64;
                GatewayHealth {
                    online: response.status().is_success(),
                    last_check: Some(chrono::Local::now().to_rfc3339()),
                    latency_ms: Some(latency),
                    error: if response.status().is_success() {
                        None
                    } else {
                        Some(format!("Status: {}", response.status()))
                    },
                }
            }
            Err(e) => {
                GatewayHealth {
                    online: false,
                    last_check: Some(chrono::Local::now().to_rfc3339()),
                    latency_ms: None,
                    error: Some(e.to_string()),
                }
            }
        };
        
        state.update_gateway_health(health.clone());
        
        // Emit health update to frontend
        let _ = app_handle.emit_all("gateway-health-update", &health);
        
        // Update tray tooltip with status
        let tray = app_handle.tray_handle();
        let status_text = if health.online {
            format!("OpenBR - Connected ({}ms)", health.latency_ms.unwrap_or(0))
        } else {
            "OpenBR - Disconnected".to_string()
        };
        let _ = tray.set_tooltip(&status_text);
        
        info!("Health check completed: online={}, latency={:?}", 
              health.online, health.latency_ms);
    }
}

// Initialize logging
fn init_logging() {
    env_logger::init();
    info!("OpenBR Desktop started");
}

fn main() {
    init_logging();

    // Create system tray menu
    let show = CustomMenuItem::new("show", "Show");
    let hide = CustomMenuItem::new("hide", "Hide");
    let settings = CustomMenuItem::new("settings", "Settings");
    let quit = CustomMenuItem::new("quit", "Quit");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(settings)
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState::new(tauri::api::path::app_config_dir(&tauri::Config::default()).unwrap_or_else(|| PathBuf::from("."))))
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_gateway_status,
            get_gateway_health,
            set_gateway_url,
            get_gateway_url,
            show_window,
            hide_window,
            quit_app,
            save_window_bounds,
        ])
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "show" => {
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_window("main") {
                                window.hide().unwrap();
                            }
                        }
                        "settings" => {
                            if let Some(window) = app.get_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                                window.emit("open-settings", ()).unwrap();
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                }
                SystemTrayEvent::LeftClick { .. } => {
                    toggle_window(app);
                }
                _ => {}
            }
        })
        .setup(|app| {
            log::info!("Setting up OpenBR Desktop application");
            
            // Register global shortcut Cmd/Ctrl+Shift+O to toggle window
            let app_handle = app.handle();
            let mut shortcut_manager = app.global_shortcut_manager();
            #[cfg(target_os = "macos")]
            let shortcut = "Cmd+Shift+O";
            #[cfg(not(target_os = "macos"))]
            let shortcut = "Ctrl+Shift+O";
            
            if let Err(e) = shortcut_manager.register(shortcut, move || {
                toggle_window(&app_handle);
            }) {
                log::error!("Failed to register global shortcut: {}", e);
            } else {
                log::info!("Registered global shortcut: {}", shortcut);
            }
            
            // Restore window state if available
            let state = app.state::<AppState>();
            let window_state = state.load_window_state();
            
            if let Some(window) = app.get_window("main") {
                // Set window position and size
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: window_state.x as i32,
                    y: window_state.y as i32,
                }));
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: window_state.width as u32,
                    height: window_state.height as u32,
                }));
                
                // Restore maximized state
                if window_state.maximized {
                    let _ = window.maximize();
                }
            }
            
            // Spawn health check background task
            let state = app.state::<AppState>();
            let state_arc = Arc::new(AppState {
                gateway_url: Mutex::new(state.gateway_url.lock().unwrap().clone()),
                app_version: state.app_version.clone(),
                window_state_path: state.window_state_path.clone(),
                gateway_health: state.gateway_health.clone(),
            });
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                health_check_task(app_handle, state_arc).await;
            });
            
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
                WindowEvent::Resized(_) | WindowEvent::Moved(_) => {
                    // Auto-save window state on resize/move
                    let window = event.window();
                    let app_handle = window.app_handle();
                    if let Some(state) = app_handle.try_state::<AppState>() {
                        let position = window.outer_position().ok();
                        let size = window.outer_size().ok();
                        let maximized = window.is_maximized().unwrap_or(false);
                        
                        if let (Some(pos), Some(sz)) = (position, size) {
                            let window_state = WindowState {
                                x: pos.x as f64,
                                y: pos.y as f64,
                                width: sz.width as f64,
                                height: sz.height as f64,
                                maximized,
                            };
                            let _ = state.save_window_state(&window_state);
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
