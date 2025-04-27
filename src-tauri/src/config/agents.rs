use crate::config::watcher::{start_config_watcher, WatcherState};
use crate::util::paths::get_app_sub_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
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

    // Write the agent config to a file
    let agent_file_path = agents_dir.join(format!("{}.yaml", agent_config.name));
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

    let file_path = agents_dir.join(format!("{}.yaml", name));
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
