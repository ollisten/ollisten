use crate::config::watcher::{start_config_watcher, WatcherState};
use crate::util::paths::get_app_sub_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StructuredOutput {
    pub schema: String,
    pub mapper: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub interval_in_sec: Option<f64>,
    pub transcription_history_max_chars: Option<u64>,
    pub prompt: String,
    pub structured_output: Option<StructuredOutput>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    pub name: String,
    pub agent: Agent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    pub r#type: String,
    pub name: String,
    // Content for created/modified files, None for deleted
    pub agent: Option<Agent>,
}

#[tauri::command]
pub async fn open_agent_config_folder() -> Result<(), String> {
    let agents_dir =
        get_app_sub_path("agent").map_err(|e| format!("Failed to get agents directory: {}", e))?;

    tauri_plugin_opener::open_path(agents_dir, None::<&str>)
        .map_err(|e| format!("Failed to open agents directory: {}", e))?;

    Ok(())
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
    let agents_dir = get_app_sub_path("agent")?;

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
                // Check file size limit (1MB max for config files)
                let metadata = fs::metadata(&path)
                    .map_err(|e| format!("Failed to read file metadata {}: {}", path.display(), e))?;
                if metadata.len() > 1_048_576 {
                    return Err(format!("Config file {} exceeds maximum size of 1MB", path.display()));
                }

                // Read file content
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read config file {}: {}", path.display(), e))?;

                let agent = parse_agent(&content).map_err(|e| {
                    format!("Failed to parse config file {}: {}", path.display(), e)
                })?;

                // Create AgentConfig
                let agent_name = parse_name_from_file_path(&path)?;
                let agent_config = AgentConfig {
                    agent,
                    name: agent_name,
                };

                agent_configs.push(agent_config);
            }
        }
    }

    Ok(agent_configs)
}

#[tauri::command]
pub fn save_agent_config(initial_name: String, agent_config: AgentConfig) -> Result<(), String> {
    let agents_dir =
        get_app_sub_path("agent").map_err(|e| format!("Failed to get agents directory: {}", e))?;

    // Validate agent name to prevent path traversal
    validate_agent_name(&agent_config.name)?;
    if !initial_name.is_empty() {
        validate_agent_name(&initial_name)?;
    }

    // Write the agent config to a file
    let agent_file_path = agents_dir.join(format!("{}.yaml", agent_config.name));

    // Ensure the resolved path is still within the agents directory
    validate_path_within_directory(&agent_file_path, &agents_dir)?;

    let agent_file_content = serde_yaml::to_string(&agent_config.agent)
        .map_err(|e| format!("Failed to serialize agent: {}", e))?;

    fs::write(&agent_file_path, agent_file_content).map_err(|e| {
        format!(
            "Failed to write agent file {}: {}",
            agent_file_path.display(),
            e
        )
    })?;

    if initial_name != agent_config.name {
        delete_agent_config(initial_name)?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_agent_config(name: String) -> Result<(), String> {
    let agents_dir =
        get_app_sub_path("agent").map_err(|e| format!("Failed to get agents directory: {}", e))?;

    // Validate agent name to prevent path traversal
    validate_agent_name(&name)?;

    let file_path = agents_dir.join(format!("{}.yaml", name));

    // Ensure the resolved path is still within the agents directory
    validate_path_within_directory(&file_path, &agents_dir)?;

    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete agent file {}: {}", file_path.display(), e))?;

    Ok(())
}

pub fn parse_agent(content: &str) -> Result<Agent, String> {
    let agent: Agent =
        serde_yaml::from_str(content).map_err(|e| format!("Failed to parse agent: {}", e))?;
    Ok(agent)
}

/// parse file name without extension via PathBug
pub fn parse_name_from_file_path(path_buf: &PathBuf) -> Result<String, String> {
    Ok(path_buf
        .as_path()
        .file_name()
        .ok_or_else(|| format!("Unknown file name: {}", path_buf.as_path().display()))?
        .to_str()
        .ok_or_else(|| format!("Unknown file name: {}", path_buf.as_path().display()))?
        .split('.')
        .collect::<Vec<&str>>()[0]
        .to_string())
}

/// Validate agent name to prevent path traversal attacks
fn validate_agent_name(name: &str) -> Result<(), String> {
    // Check for empty name
    if name.is_empty() {
        return Err("Agent name cannot be empty".to_string());
    }

    // Check for path separators and other dangerous characters
    if name.contains('/') || name.contains('\\') || name.contains("..") || name.contains('\0') {
        return Err(format!("Agent name '{}' contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.", name));
    }

    // Check for special names
    if name == "." || name == ".." {
        return Err(format!("Agent name '{}' is reserved", name));
    }

    Ok(())
}

/// Validate that a path is within a given directory (prevents path traversal)
fn validate_path_within_directory(path: &Path, directory: &Path) -> Result<(), String> {
    let canonical_path = path.canonicalize()
        .or_else(|_| {
            // If path doesn't exist yet, canonicalize the parent
            if let Some(parent) = path.parent() {
                parent.canonicalize().map(|p| p.join(path.file_name().unwrap()))
            } else {
                Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Invalid path"))
            }
        })
        .map_err(|e| format!("Failed to resolve path: {}", e))?;

    let canonical_dir = directory.canonicalize()
        .map_err(|e| format!("Failed to resolve directory: {}", e))?;

    if !canonical_path.starts_with(&canonical_dir) {
        return Err(format!("Path '{}' is outside allowed directory", path.display()));
    }

    Ok(())
}
