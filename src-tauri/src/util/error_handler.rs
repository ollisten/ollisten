use crate::config::agents::{Agent, FileChangeEvent};
use log::error;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, EventTarget};

const RUST_ERROR_EVENT_TYPE: &str = "RustErrorEvent";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RustErrorEvent {
    pub r#type: String,
    pub message: String,
}

pub fn show_error(message: String, app_handle: AppHandle) {
    error!("{}", message);

    // Emit the error event to the frontend

    if let Err(e) = app_handle.emit(
        RUST_ERROR_EVENT_TYPE,
        RustErrorEvent {
            r#type: RUST_ERROR_EVENT_TYPE.to_string(),
            message,
        },
    ) {
        error!("Failed to emit event: {}", e);
    }
}
