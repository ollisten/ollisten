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
use log::LevelFilter;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
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
        .manage(TranscriptionState {
            whisper_model: Arc::new(Mutex::new(None)),
            active_sessions: Arc::new(Mutex::new(HashMap::new())),
            listeners: Arc::new(RwLock::new(HashMap::new())),
        })
        .manage(WatcherState {
            watcher: Arc::new(Mutex::new(None)),
        })
        .manage(LlmRouterState {
            ollama: Arc::new(RwLock::new(None)),
            open_ai: Arc::new(RwLock::new(None)),
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
            llm::open_ai::setup_open_ai,
            llm::open_ai::get_llm_model_options_open_ai,
            audio::devices::get_listen_device_options,
            audio::devices::get_hidden_device,
            audio::driver::is_driver_installed,
            audio::driver::install_driver,
            transcription::model::list_available_transcription_models,
            transcription::control::start_transcription,
            transcription::control::stop_transcription,
            transcription::control::transcription_subscribe,
            transcription::control::transcription_unsubscribe,
            config::agents::get_all_agent_configs,
            config::agents::save_agent_config,
            config::agents::delete_agent_config,
            config::app_config::read_app_config,
            config::app_config::set_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
