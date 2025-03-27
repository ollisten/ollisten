use crate::config::agents::{parse_agent, parse_name_from_file_path, FileChangeEvent};
use crate::util::paths::{get_app_path, get_app_sub_path};
use log::{error, info};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, EventTarget, State};
use tokio::sync::{Mutex, RwLock};

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
}

pub async fn start_config_watcher(
    app_handle: tauri::AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    // Get the watcher state
    let mut watcher_guard = state.watcher.lock().await;

    // If watcher already exists, don't create another one
    if watcher_guard.is_some() {
        return Ok(());
    }

    // Get home directory
    let home_dir =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;

    // Create the full path to the agents directory
    let agents_dir = get_app_sub_path("agent")?;

    // Clone app handle for the watcher callback
    let app = app_handle.clone();

    // Create a watcher instance with proper configuration
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            match res {
                Ok(event) => {
                    // Process the file change event
                    if !event.paths.is_empty() {
                        let path = &event.paths[0];

                        // Only process yaml files based on extension
                        let is_yaml = path
                            .extension()
                            .map_or(false, |ext| ext == "yaml" || ext == "yml");
                        if !is_yaml {
                            return;
                        }

                        // For create/modify events, verify it's a file
                        match event.kind {
                            notify::EventKind::Create(_) | notify::EventKind::Modify(_) => {
                                if !path.is_file() {
                                    return;
                                }
                            }
                            _ => {}
                        }

                        // Determine event type
                        let event_type = match event.kind {
                            notify::EventKind::Create(_) => "file-agent-created",
                            notify::EventKind::Modify(_) => "file-agent-modified",
                            notify::EventKind::Remove(_) => "file-agent-deleted",
                            _ => return, // Ignore other events
                        };

                        // For created or modified files, read the content
                        let agent = match event.kind {
                            notify::EventKind::Remove(_) => None,
                            _ => match std::fs::read_to_string(path) {
                                Ok(content) => Some(match parse_agent(&content) {
                                    Ok(agent) => agent,
                                    Err(e) => {
                                        error!("Failed to parse agent {}: {}", path.display(), e);
                                        return;
                                    }
                                }),
                                Err(e) => {
                                    error!("Failed to read file {}: {}", path.display(), e);
                                    return;
                                }
                            },
                        };

                        // Create event payload
                        let agent_name = parse_name_from_file_path(&path);
                        let file_event = FileChangeEvent {
                            r#type: event_type.to_string(),
                            name: agent_name,
                            agent,
                        };

                        // Emit event to frontend
                        info!("Emitting agent-config-changed event: {:?}", file_event);
                        if let Err(e) = app.emit_to(EventTarget::any(), event_type, file_event) {
                            error!("Failed to emit event: {}", e);
                            return;
                        }
                    }
                }
                Err(e) => error!("Watch error: {:?}", e),
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Watch the directory
    watcher
        .watch(&agents_dir, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    info!("Watching for file changes in {}", agents_dir.display());

    // Store the watcher in app state to keep it alive
    *watcher_guard = Some(watcher);

    Ok(())
}
