mod session_event;
use log::{error, info, LevelFilter};
use serde::{Deserialize, Serialize};
use session_event::SessionEvent;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;

mod audio;
mod llm;
mod system;
mod whisper;

use crate::llm::llm::{fetch_available_models, LlmModel};
use audio::shared::{list_available_audio_input_devices, DeviceOption};
use whisper::stream_cli;

const MODEL_PATH: &str = "models/";
const MODEL_NAME_WHISPER_TINY: &str = "ggml-tiny.bin";
const MODEL_NAME_LAMA_33: &str = "llama3.3";

struct Session {
    whisper: stream_cli::Runner,
    llm: llm::llm::Llm,
    channel: Arc<Channel<SessionEvent>>,
}

struct AppState {
    session: Mutex<Option<Session>>,
}

#[derive(Serialize)]
struct InitializeResponse {
    error: Option<String>,
    whisper_model_options: Vec<String>,
    listen_device_options: Vec<DeviceOption>,
    llm_model_options: Vec<LlmModel>,
}

#[tauri::command]
async fn initialize() -> InitializeResponse {
    info!("Frontend initializing");

    let llm_model_options = match fetch_available_models().await {
        Ok(models) => models,
        Err(err) => return error_response(format!("Failed to fetch LLM models: {}", err)),
    };

    let mut listen_device_options = Vec::new();
    match list_available_audio_input_devices(&mut listen_device_options) {
        Ok(_) => {}
        Err(err) => return error_response(format!("Failed to fetch input audio devices: {}", err)),
    };

    InitializeResponse {
        error: None,
        whisper_model_options: vec![MODEL_NAME_WHISPER_TINY.to_string()],
        listen_device_options,
        llm_model_options,
    }
}

fn error_response(message: String) -> InitializeResponse {
    InitializeResponse {
        error: Some(message),
        whisper_model_options: vec![],
        listen_device_options: vec![],
        llm_model_options: vec![],
    }
}
#[tauri::command]
fn start_session(
    app_state: tauri::State<AppState>,
    session_channel: Channel<SessionEvent>,
    listen_device_id: i32,
    whisper_model: String,
    llm_model: String,
) {
    // Stop first
    app_state.session.lock().unwrap().take().map(|session| {
        session.whisper.stop();
    });

    info!("Starting with model {whisper_model} listening on device {listen_device_id}");

    // Wrap the session_channel in an Arc for shared ownership
    let session_channel = Arc::new(session_channel);

    // Create a channel for communication between threads
    let (transcribed_text_send, transcribed_text_receive): (Sender<String>, Receiver<String>) =
        channel();

    // Start the whisper-stream runner in a separate thread
    let whisper = stream_cli::Runner::new(
        listen_device_id,
        format!("{MODEL_PATH}{whisper_model}").as_str(),
        Arc::clone(&session_channel),
        transcribed_text_send,
    );

    // Start the LLM processing in another thread
    let llm = llm::llm::Llm::new(
        transcribed_text_receive,
        Arc::clone(&session_channel),
        llm_model,
    );

    // Let FE know we started
    if let Err(e) = session_channel.send(SessionEvent::Started) {
        error!("Failed to send we started: {}", e);
        whisper.stop();
        return;
    }

    // Store the session state in app_state
    let mut session = app_state.session.lock().unwrap();
    *session = Some(Session {
        channel: Arc::clone(&session_channel),
        whisper,
        llm,
    });
}

#[tauri::command]
fn stop_session(app_state: tauri::State<AppState>) {
    app_state.session.lock().unwrap().take().map(|session| {
        session.whisper.stop();
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            session: Mutex::new(None),
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            initialize,
            start_session,
            stop_session
        ])
        .run(tauri::generate_context!())
        .expect("error while session tauri application");
}
