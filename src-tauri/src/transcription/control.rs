use crate::audio::devices::DeviceOption;
use crate::transcription::cpal_macos_hack::create_cpal_mic;
use crate::transcription::event::TranscriptionEvent;
use crate::transcription::model::TranscriptionModel;
// Using tokio's RwLock instead of std
use crate::transcription::voice_audio_detector_ext_v2::VoiceActivityRechunkerStreamV2;
use kalosm::sound::*;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::{Manager, Runtime, State};
use tokio::sync::{Mutex, RwLock};
use tokio::task::AbortHandle;

pub struct TranscriptionState {
    pub whisper_model: Arc<Mutex<Option<Whisper>>>,
    // Track transcription tasks by device ID
    pub active_sessions: Arc<Mutex<HashMap<i32, AbortHandle>>>,
    // Changed from std::sync::RwLock to tokio::sync::RwLock
    pub listeners: Arc<RwLock<HashMap<String, Channel<TranscriptionEvent>>>>,
}

#[tauri::command]
pub async fn transcription_subscribe(
    state: State<'_, TranscriptionState>,
    session_channel: Channel<TranscriptionEvent>,
    subscriber_name: String,
) -> Result<(), String> {
    let mut listeners = state.listeners.write().await;
    listeners.insert(subscriber_name, session_channel);
    Ok(())
}

#[tauri::command]
pub async fn transcription_unsubscribe(
    state: State<'_, TranscriptionState>,
    // Fixed typo in parameter name (was "subcsriber_name")
    subscriber_name: String,
) -> Result<(), String> {
    let mut listeners = state.listeners.write().await;
    listeners.remove(&subscriber_name);
    Ok(())
}

#[tauri::command]
pub async fn start_transcription(
    model_type: TranscriptionModel,
    device_ids: Vec<i32>,
    state: State<'_, TranscriptionState>,
) -> Result<(), String> {
    info!(
        "Command: Starting transcription with model: {:?}",
        model_type
    );

    // First, stop any existing transcription
    stop_transcription(state.clone()).await?;

    // Extract listeners from state
    let listeners = Arc::clone(&state.listeners);

    // Emit model initializing event
    send_event(&listeners, TranscriptionEvent::Starting)
        .await
        .map_err(|e| format!("Failed to send started event: {}", e))?;

    // Create a channel for asynchronous communication from the loading handler
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);

    // Handle events from the loading handler in a separate task
    let listeners_clone = Arc::clone(&listeners);
    let event_handler = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let Err(e) = send_event(&listeners_clone, event).await {
                error!("Failed to send event: {}", e);
            }
        }
    });

    // Build transcription model with loading handler to track progress
    let tx_clone = tx.clone();
    let model = WhisperBuilder::default()
        .with_source(model_type.to_whisper_source())
        .build_with_loading_handler(move |loading| match loading {
            ModelLoadingProgress::Downloading { source, progress } => {
                let _ = tx_clone.try_send(TranscriptionEvent::DownloadProgress {
                    source: source.to_string(),
                    size: progress.size,
                    progress: progress.progress,
                });
            }
            ModelLoadingProgress::Loading { progress } => {
                let _ = tx_clone.try_send(TranscriptionEvent::LoadingProgress { progress });
            }
        })
        .await
        .map_err(|e| format!("Failed to load model: {}", e))?;

    // Store the model in state
    let mut whisper_model = state.whisper_model.lock().await;
    *whisper_model = Some(model.clone());
    drop(whisper_model); // Release the lock

    // Start transcription for each device
    let mut active_sessions = state.active_sessions.lock().await;

    for device_id in device_ids {
        // Set up the microphone
        let mic = match device_id < 0 {
            true => MicInput::default(),
            false => create_cpal_mic(device_id as u32),
        };

        // Create the audio stream
        let stream = mic.stream();
        let stream = stream.voice_activity_stream();

        let stream = VoiceActivityRechunkerStreamV2::new(
            stream,
            0.6,                          // start_threshold
            Duration::from_millis(250),   // start_window
            0.3,                          // end_threshold
            Duration::from_millis(100),   // end_window
            Duration::from_millis(750),   // time_before_speech
            Duration::from_millis(10000), // max_duration
            3.0,                          // decay_factor
        );

        // Clone necessary values for the task
        let model_clone = model.clone();

        // Emit transcription started event
        send_event(
            &listeners,
            TranscriptionEvent::TranscriptionStarted { device_id },
        )
        .await
        .map_err(|e| format!("Failed to send transcription event: {}", e))?;

        // Spawn a task to handle the transcription
        let listeners_clone = Arc::clone(&listeners);
        let handle = tokio::spawn(async move {
            // Transcribe the audio stream
            let mut text_stream = stream.transcribe(model_clone);

            // Process the transcription stream
            while let Some(chunk) = text_stream.next().await {
                // Emit the transcribed text with device identifier
                if let Err(e) = send_event(
                    &listeners_clone,
                    TranscriptionEvent::TranscriptionData {
                        device_id,
                        text: chunk.text().to_string(),
                        confidence: chunk.confidence(),
                    },
                )
                .await
                {
                    error!("Failed to send transcription event: {}", e);
                }
            }
        });

        // Store the abort handle
        active_sessions.insert(device_id as i32, handle.abort_handle());
    }

    // Clean up the channel
    drop(tx);

    // Abort the event handler when it's no longer needed
    event_handler.abort();

    Ok(())
}

#[tauri::command]
pub async fn stop_transcription(state: State<'_, TranscriptionState>) -> Result<(), String> {
    let mut active_sessions = state.active_sessions.lock().await;

    // Stop all devices
    for (id, handle) in active_sessions.drain() {
        info!("Stopping transcription for device {}", id);
        handle.abort();
    }

    // Emit model initializing event
    send_event(&state.listeners, TranscriptionEvent::Stopped)
        .await
        .map_err(|e| format!("Failed to send stopped event: {}", e))?;

    Ok(())
}

async fn send_event(
    listeners: &Arc<RwLock<HashMap<String, Channel<TranscriptionEvent>>>>,
    event: TranscriptionEvent,
) -> Result<(), String> {
    let listeners_guard = listeners.read().await;
    info!(
        "Sending event to {} subscribers: {:?}",
        listeners_guard.len(),
        event
    );
    for listener in listeners_guard.values() {
        listener
            .send(event.clone())
            .map_err(|e| format!("Failed to send event: {}", e))?;
    }
    Ok(())
}
