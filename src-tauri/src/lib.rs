mod audio;
mod config;
mod llm;
mod system;
mod transcription;
mod windows;

use crate::config::manage_config::WatcherState;
use crate::llm::get_models::LlmModel;
use crate::transcription::control::TranscriptionState;
use audio::devices::DeviceOption;
use log::LevelFilter;
use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;
use std::sync::Arc;
use tauri::utils::platform::resource_dir;
use tauri::Manager;
use tokio::sync::{Mutex, RwLock};

#[derive(Serialize)]
struct InitializeResponse {
    error: Option<String>,
    whisper_model_options: Vec<String>,
    listen_device_options: Vec<DeviceOption>,
    llm_model_options: Vec<LlmModel>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let resource_path = resource_dir(app.package_info(), &app.env())?;
                let pkg_path = resource_path.join("LocalEcho.pkg");

                if !pkg_path.exists() {
                    // The pkg hasn't been installed yet
                    Command::new("installer")
                        .args(&["-pkg", pkg_path.to_str().unwrap(), "-target", "/"])
                        .output()
                        .expect("Failed to install audio driver package");
                }
            }

            Ok(())
        })
        .manage(TranscriptionState {
            whisper_model: Arc::new(Mutex::new(None)),
            active_sessions: Arc::new(Mutex::new(HashMap::new())),
            listeners: Arc::new(RwLock::new(HashMap::new())),
        })
        .manage(WatcherState {
            watcher: Arc::new(Mutex::new(None)),
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            windows::agent_window::setup_agent_window,
            llm::talk::llm_talk,
            llm::get_models::get_llm_model_options,
            audio::devices::get_listen_device_options,
            audio::devices::get_hidden_device,
            transcription::model::list_available_transcription_models,
            transcription::control::start_transcription,
            transcription::control::stop_transcription,
            transcription::control::transcription_subscribe,
            transcription::control::transcription_unsubscribe,
            config::manage_config::get_all_agent_configs,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
