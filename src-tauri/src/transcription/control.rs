use crate::transcription::cpal_macos_hack::create_cpal_mic;
use crate::transcription::event::TranscriptionEvent;
use crate::transcription::model::TranscriptionModel;
use crate::transcription::voice_audio_detector_ext_v2::VoiceActivityRechunkerStreamV2;
use kalosm::sound::*;
use log::{error, info};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, RwLock};
use tokio::task::AbortHandle;

pub struct TranscriptionState {
    pub whisper_model: Arc<Mutex<Option<Whisper>>>,
    pub active_sessions: Arc<Mutex<HashMap<i32, AbortHandle>>>,
}

#[tauri::command]
pub async fn start_transcription(
    app_handle: AppHandle,
    model_type: TranscriptionModel,
    device_ids: Vec<i32>,
    state: State<'_, TranscriptionState>,
) -> Result<(), String> {
    info!(
        "Command: Starting transcription with model: {:?}",
        model_type
    );
    let main_app_handle = app_handle.clone();

    // First, stop any existing transcription
    let mut active_sessions = state.active_sessions.lock().await;
    for (id, handle) in active_sessions.drain() {
        info!("Stopping transcription for device {}", id);
        handle.abort();
    }

    // Emit model initializing event
    send_event(
        main_app_handle.clone(),
        TranscriptionEvent::TranscriptionStarting,
    )
    .await
    .map_err(|e| format!("Failed to send started event: {}", e))?;

    // Create a channel for asynchronous communication from the loading handler
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);

    // Handle events from the loading handler in a separate task
    let event_handler_handle = main_app_handle.clone();
    let event_handler = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let Err(e) = send_event(event_handler_handle.clone(), event).await {
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
                let _ = tx_clone.try_send(TranscriptionEvent::TranscriptionDownloadProgress {
                    source: source.to_string(),
                    size: progress.size,
                    progress: progress.progress,
                });
            }
            ModelLoadingProgress::Loading { progress } => {
                let _ = tx_clone
                    .try_send(TranscriptionEvent::TranscriptionLoadingProgress { progress });
            }
        })
        .await
        .map_err(|e| format!("Failed to load model: {}", e))?;

    // Store the model in state
    let mut whisper_model = state.whisper_model.lock().await;
    *whisper_model = Some(model.clone());
    drop(whisper_model); // Release the lock

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
            main_app_handle.clone(),
            TranscriptionEvent::TranscriptionStarted { device_id },
        )
        .await
        .map_err(|e| format!("Failed to send transcription event: {}", e))?;

        // Spawn a task to handle the transcription
        let task_handle = main_app_handle.clone();
        let handle = tokio::spawn(async move {
            // Transcribe the audio stream
            let mut text_stream = stream.transcribe(model_clone);

            // Process the transcription stream
            while let Some(chunk) = text_stream.next().await {
                // Skip empty chunks
                if chunk.text().is_empty() {
                    continue;
                }

                // Emit the transcribed text with device identifier
                if let Err(e) = send_event(
                    task_handle.clone(),
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
    tokio::spawn(async move {
        event_handler.await.ok();
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_transcription(
    app_handle: AppHandle,
    state: State<'_, TranscriptionState>,
) -> Result<(), String> {
    let mut active_sessions = state.active_sessions.lock().await;

    // Stop all devices
    for (id, handle) in active_sessions.drain() {
        info!("Stopping transcription for device {}", id);
        handle.abort();
    }

    // Emit model initializing event
    send_event(app_handle, TranscriptionEvent::TranscriptionStopped)
        .await
        .map_err(|e| format!("Failed to send stopped event: {}", e))?;

    Ok(())
}

async fn send_event(app_handle: AppHandle, event: TranscriptionEvent) -> Result<(), String> {
    info!("Sending {:?}", event);

    app_handle
        .emit(event.variant_name(), event)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}
