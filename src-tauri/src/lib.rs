mod audio;
mod config;
mod llm;
mod system;
mod transcription;

use crate::llm::get_models::LlmModel;
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
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            llm::talk::llm_talk,
            llm::get_models::get_llm_model_options,
            audio::devices::get_listen_device_options,
            audio::devices::get_hidden_device,
            transcription::model::list_available_transcription_models,
            transcription::control::start_transcription,
            transcription::control::stop_transcription,
            transcription::control::transcription_subscribe,
            transcription::control::transcription_unsubscribe,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
