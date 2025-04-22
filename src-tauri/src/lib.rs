mod audio;
mod config;
mod llm;
mod system;
mod transcription;
mod util;

use crate::config::watcher::WatcherState;
use crate::llm::router::LlmRouterState;
use crate::llm::types::LlmModel;
use crate::transcription::control::TranscriptionState;
use audio::devices::DeviceOption;
use log::{error, LevelFilter};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tauri::image::Image;
use tokio::sync::{Mutex, RwLock};

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Listener, Manager, WebviewWindow};

#[derive(Serialize)]
struct InitializeResponse {
    error: Option<String>,
    whisper_model_options: Vec<String>,
    listen_device_options: Vec<DeviceOption>,
    llm_model_options: Vec<LlmModel>,
}

fn open_or_restore_main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    // Check if the `main` window already exists
    if let Some(main_window) = app.get_webview_window("main") {
        main_window
            .unminimize()
            .map_err(|e| format!("Failed to unminimize main window: {}", e))?;
        main_window
            .show()
            .map_err(|e| format!("Failed to show main window: {}", e))?;
        main_window
            .set_focus()
            .map_err(|e| format!("Failed to focus main window: {}", e))?;
        Ok(main_window)
    } else {
        tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
            .title("ollisten")
            .min_inner_size(800f64, 600f64)
            .build()
            .map_err(|e| format!("Failed to create main window: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TranscriptionState {
            whisper_model: Arc::new(Mutex::new(None)),
            active_sessions: Arc::new(Mutex::new(HashMap::new())),
        })
        .manage(WatcherState {
            watcher: Arc::new(Mutex::new(None)),
        })
        .manage(LlmRouterState {
            ollama: Arc::new(RwLock::new(None)),
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            llm::router::llm_talk,
            llm::ollama::setup_ollama,
            llm::ollama::start_and_get_llm_model_options_ollama,
            audio::devices::get_listen_device_options,
            audio::devices::get_hidden_device,
            audio::driver::is_driver_installed,
            audio::driver::install_driver,
            transcription::model::list_available_transcription_models,
            transcription::control::start_transcription,
            transcription::control::stop_transcription,
            config::agents::get_all_agent_configs,
            config::agents::save_agent_config,
            config::agents::delete_agent_config,
            config::app_config::read_app_config,
            config::app_config::set_app_config,
        ])
        .setup(|app| {
            let window = open_or_restore_main_window(app.handle()).unwrap();
            let is_dark_mode = window.theme().unwrap_or(tauri::Theme::Light) == tauri::Theme::Dark;
            setup_tray(app, is_dark_mode);
            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "main" => {
                open_or_restore_main_window(app);
            }
            "exit" => {
                app.exit(0);
            }
            _ => {
                println!("menu item {:?} not handled", event.id);
            }
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}

fn setup_tray(app: &App, is_dark_mode: bool) -> Result<(), String> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "main", "Open", true, None::<&str>)
                .map_err(|e| format!("Failed to create menu item: {}", e))?,
            &MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)
                .map_err(|e| format!("Failed to create menu item: {}", e))?,
        ],
    )
    .map_err(|e| format!("Failed to create menu: {}", e))?;
    TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .icon(
            Image::from_path(Path::new(
                is_dark_mode.then_some(ICON_DARK).unwrap_or(ICON_LIGHT),
            ))
            .map_err(|e| format!("Failed to load icon: {}", e))?,
        )
        .build(app)
        .map_err(|e| format!("Failed to create tray icon: {}", e))?;

    // Listen for theme changes
    let app_handle = app.handle().clone();
    app.listen_any("tauri://theme-changed", move |event| {
        let is_dark_mode = match event.payload() {
            "true" | "dark" | "\"dark\"" => true,
            "false" | "light" | "\"light\"" => false,
            _ => return,
        };
        update_tray_icon(&app_handle, is_dark_mode)
            .unwrap_or_else(|e| error!("Failed to update tray icon: {}", e));
    });

    Ok(())
}

const TRAY_ID: &str = "ollisten-tray";
const ICON_LIGHT: &str = "icons/ollisten-logo-circle-black.png";
const ICON_DARK: &str = "icons/ollisten-logo-circle-white.png";

fn update_tray_icon(app: &AppHandle, is_dark_mode: bool) -> Result<(), String> {
    app.tray_by_id(TRAY_ID)
        .ok_or_else(|| format!("Tray with ID {} not found", TRAY_ID))?
        .set_icon(Some(
            Image::from_path(Path::new(
                is_dark_mode.then_some(ICON_DARK).unwrap_or(ICON_LIGHT),
            ))
            .map_err(|e| format!("Failed to load icon: {}", e))?,
        ))
        .map_err(|e| format!("Failed to set tray icon: {}", e))?;
    Ok(())
}
