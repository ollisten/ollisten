use crate::transcription::cpal_macos_hack::create_cpal_mic;
use crate::transcription::event::TranscriptionEvent;
use crate::transcription::model::TranscriptionModel;
use crate::transcription::voice_audio_detector_ext_v2::VoiceActivityRechunkerStreamV2;
use kalosm::sound::*;
use log::{error, info};
use rodio::cpal::platform::CoreAudioDevice;
use rodio::{cpal, Device};
use std::any::Any;
use std::cmp::PartialEq;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, MutexGuard};
use tokio::task::AbortHandle;

pub struct TranscriptionSession {
    pub model_type: TranscriptionModel,
    pub model: Whisper,
    pub listeners: HashMap<i32, Box<dyn FnMut() + Send + Sync>>,
}

pub struct TranscriptionState {
    pub session: Arc<Mutex<Option<TranscriptionSession>>>,
}

#[tauri::command]
pub async fn start_transcription(
    app_handle: AppHandle,
    model_type: TranscriptionModel,
    device_ids: Vec<i32>,
    state: State<'_, TranscriptionState>,
) -> Result<(), String> {
    let main_app_handle = app_handle.clone();

    let mut session = state.session.lock().await;

    // Check if we are already listening with same configuration
    if let Some(ref session) = *session {
        let active_sessions = &session.listeners;
        let active_model_type = session.model_type;
        let active_device_ids: Vec<i32> = active_sessions.keys().cloned().collect();
        if active_device_ids == device_ids && active_model_type == model_type {
            info!("Already listening to the same device ids and using the same model, skipping start.");
            return Ok(());
        }
    }

    // Emit model initializing event
    send_event(
        main_app_handle.clone(),
        TranscriptionEvent::TranscriptionStarting,
    )
    .await
    .map_err(|e| format!("Failed to send started event: {}", e))?;

    // Stop any existing transcription
    abort_all_handles(&mut session)?;

    info!(
        "Command: Starting transcription with model: {:?}",
        model_type
    );

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

    let mut listeners: HashMap<i32, Box<dyn FnMut() + Send + Sync>> = HashMap::new();
    for device_id in device_ids {
        // Set up the microphone
        let mic = match device_id < 0 {
            true => MicInput::default(),
            false => create_cpal_mic(device_id as u32)?,
        };

        // Create the audio stream
        let mut mic_stream = mic.stream();
        let stream = mic_stream.voice_activity_stream();
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
        let (abort_sender, abort_receiver) = tokio::sync::oneshot::channel();
        let task_handle = main_app_handle.clone();
        let handle = tokio::spawn(async move {
            tokio::select! {
                _ = abort_receiver => {},
                _ = async {
                    let mut text_stream = stream.transcribe(model_clone);
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
                        break;
                    }
                } => {}
            }
        });

        // Store the abort handle
        listeners.insert(
            device_id,
            Box::new({
                let mut abort_sender = Some(abort_sender);
                move || {
                    if let Some(sender) = abort_sender.take() {
                        let _ = sender.send(());
                    }
                    handle.abort();
                }
            }),
        );
    }

    // Update handles and model in session
    *session = Some(TranscriptionSession {
        listeners,
        model_type,
        model: model.clone(),
    });

    // Release the lock
    drop(session);

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
    let mut session = state.session.lock().await;

    // Stop any existing transcription
    abort_all_handles(&mut session)?;

    // Unlock
    drop(session);

    // Emit model initializing event
    send_event(app_handle, TranscriptionEvent::TranscriptionStopped)
        .await
        .map_err(|e| format!("Failed to send stopped event: {}", e))?;

    Ok(())
}

/// Abort all handles for given session
fn abort_all_handles(session: &mut MutexGuard<Option<TranscriptionSession>>) -> Result<(), String> {
    if let Some(ref mut session) = **session {
        for (id, mut abort) in session.listeners.drain() {
            info!("Stopping transcription for device {}", id);
            abort();
        }
    }
    Ok(())
}

async fn send_event(app_handle: AppHandle, event: TranscriptionEvent) -> Result<(), String> {
    info!("Sending {:?}", event);

    app_handle
        .emit(event.variant_name(), event)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}
