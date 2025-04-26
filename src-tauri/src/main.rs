// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio;
mod config;
mod llm;
mod system;
mod transcription;
mod util;

use crate::audio::devices::DeviceOption;
use crate::config::watcher::WatcherState;
use crate::llm::router::LlmRouterState;
use crate::llm::types::LlmModel;
use crate::transcription::control::TranscriptionState;
use log::{error, info, LevelFilter};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::utils::platform::resource_dir;
use tauri::{async_runtime, App, AppHandle, Listener, Manager, RunEvent, WebviewWindow};
use tokio::sync::{Mutex, RwLock};

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
#[tokio::main]
async fn main() {
    let should_exit = Arc::new(AtomicBool::new(false));
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
            if let Err(e) = setup_tray(app, is_dark_mode) {
                error!("Failed to setup tray: {}", e);
            }
            Ok(())
        })
        .on_menu_event({
            let should_exit = should_exit.clone();
            move |app, event| match event.id.as_ref() {
                "main" => {
                    if let Err(e) = open_or_restore_main_window(app) {
                        error!("Failed to open main window: {}", e);
                    }
                }
                "exit" => {
                    should_exit.store(true, Ordering::SeqCst);
                    app.exit(0);
                }
                _ => {
                    println!("menu item {:?} not handled", event.id);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error starting Tauri application")
        .run({
            let should_exit = should_exit.clone();
            move |_app_handle, event| match event {
                RunEvent::ExitRequested { api, .. } => {
                    #[cfg(target_os = "macos")]
                    {
                        if !should_exit.load(Ordering::SeqCst) {
                            info!("Preventing exit on macOS, instead releasing resources");
                            api.prevent_exit();
                            let _app_handle = _app_handle.clone();
                            async_runtime::spawn(async move {
                                if let Err(e) = release_all_resources(_app_handle.clone()).await {
                                    error!("Failed to release resources: {}", e);
                                }
                            });
                        }
                    }
                }
                _ => {}
            }
        });
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

    let resource_path = resource_dir(app.package_info(), &app.env())
        .map_err(|e| format!("Failed to locate resource directory: {}", e))?;
    let icon_path = resource_path
        .join("resources")
        .join("icons")
        .join(is_dark_mode.then_some(ICON_DARK).unwrap_or(ICON_LIGHT));
    TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .icon(Image::from_path(icon_path).map_err(|e| format!("Failed to load icon: {}", e))?)
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
const ICON_LIGHT: &str = "ollisten-logo-circle-black.png";
const ICON_DARK: &str = "ollisten-logo-circle-white.png";

fn update_tray_icon(app: &AppHandle, is_dark_mode: bool) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "Tray icon not found".to_string())?;

    let resource_path = resource_dir(app.package_info(), &app.env())
        .map_err(|e| format!("Failed to locate resource directory: {}", e))?;
    let icon_path = resource_path
        .join("resources")
        .join("icons")
        .join(is_dark_mode.then_some(ICON_DARK).unwrap_or(ICON_LIGHT));
    let icon = Image::from_path(icon_path).map_err(|e| format!("Failed to load icon: {}", e))?;

    tray.set_icon(Some(icon))
        .map_err(|e| format!("Failed to set tray icon: {}", e))?;

    Ok(())
}

async fn release_all_resources(app: AppHandle) -> Result<(), String> {
    // Stop transcription
    transcription::control::stop_transcription(app.clone(), app.state::<TranscriptionState>()).await
}
