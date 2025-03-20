use log::{error, info};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Arc;
use tauri::{Emitter, EventTarget, State};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub name: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    #[serde(flatten)]
    pub agent: Agent,
    pub file_path: String, // Store the file path for reference
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum EventType {
    Created,
    Modified,
    Deleted,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    pub event_type: EventType,
    pub file_path: String,
    // Content for created/modified files, None for deleted
    pub agent: Option<Agent>,
}

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
}

#[tauri::command]
pub async fn get_all_agent_configs(
    app_handle: tauri::AppHandle,
    state: State<'_, WatcherState>,
) -> Result<Vec<AgentConfig>, String> {
    let agent_configs =
        read_agent_configs().map_err(|e| format!("Failed to read agent configs: {}", e))?;

    start_config_watcher(app_handle, state)
        .await
        .map_err(|e| format!("Failed to start config watcher: {}", e))?;

    Ok(agent_configs)
}

fn read_agent_configs() -> Result<Vec<AgentConfig>, String> {
    // Get the home directory
    let home_dir =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;

    // Create the full path to the agents directory
    let agents_dir = home_dir.join(".localecho").join("agent");

    // Create the directory if it doesn't exist
    if !agents_dir.exists() {
        fs::create_dir_all(&agents_dir)
            .map_err(|e| format!("Failed to create agents directory: {}", e))?;
    }

    // Read all yaml files in the directory
    let mut agent_configs = Vec::new();

    if agents_dir.exists() && agents_dir.is_dir() {
        for entry in fs::read_dir(&agents_dir)
            .map_err(|e| format!("Failed to read agents directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            // Only process yaml files
            if path.is_file()
                && path
                    .extension()
                    .map_or(false, |ext| ext == "yaml" || ext == "yml")
            {
                // Read file content
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read config file {}: {}", path.display(), e))?;

                let agent = parse_agent(&content).map_err(|e| {
                    format!("Failed to parse config file {}: {}", path.display(), e)
                })?;

                // Create AgentConfig
                let agent_config = AgentConfig {
                    agent,
                    file_path: path.to_string_lossy().to_string(),
                };

                agent_configs.push(agent_config);
            }
        }
    }

    Ok(agent_configs)
}

async fn start_config_watcher(
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
    let agents_dir = home_dir.join(".localecho").join("agent");

    // Create the directory if it doesn't exist
    if !agents_dir.exists() {
        fs::create_dir_all(&agents_dir)
            .map_err(|e| format!("Failed to create agents directory: {}", e))?;
    }

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

                        // Only process yaml files
                        if path.is_file()
                            && path
                                .extension()
                                .map_or(false, |ext| ext == "yaml" || ext == "yml")
                        {
                            // Determine event type
                            let event_type = match event.kind {
                                notify::EventKind::Create(_) => EventType::Created,
                                notify::EventKind::Modify(_) => EventType::Modified,
                                notify::EventKind::Remove(_) => EventType::Deleted,
                                _ => return, // Ignore other events
                            };

                            // For created or modified files, read the content
                            let agent = match event_type {
                                EventType::Deleted => None,
                                _ => match std::fs::read_to_string(path) {
                                    Ok(content) => Some(match parse_agent(&content) {
                                        Ok(agent) => agent,
                                        Err(e) => {
                                            error!(
                                                "Failed to parse agent {}: {}",
                                                path.display(),
                                                e
                                            );
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
                            let file_event = FileChangeEvent {
                                event_type: event_type,
                                file_path: path.to_string_lossy().to_string(),
                                agent,
                            };

                            // Emit event to frontend
                            if let Err(e) =
                                app.emit_to(EventTarget::any(), "agent-config-changed", file_event)
                            {
                                error!("Failed to emit event: {}", e);
                                return;
                            }
                        }
                    }
                }
                Err(e) => error!("Watch error: {:?}", e),
            }
        },
        Config::default()
            .with_follow_symlinks(true)
            .with_compare_contents(true),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Watch the directory
    watcher
        .watch(&agents_dir, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    info!("Watching for file changes in {}", agents_dir.display());

    // Store the watcher in app state to keep it alive
    *watcher_guard = Some(watcher);

    Ok(())
}

fn parse_agent(content: &str) -> Result<Agent, String> {
    let agent: Agent =
        serde_yaml::from_str(content).map_err(|e| format!("Failed to parse agent: {}", e))?;
    Ok(agent)
}
