use crate::llm::router::LlmRouterState;
use crate::llm::types::LlmModel;
use langchain_rust::language_models::llm::LLM;
use langchain_rust::llm::client::OllamaClient;
use langchain_rust::llm::ollama::client::Ollama;
use log::info;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Duration;
use tauri::State;
use tokio::process::Command;
use tokio::time::sleep;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct OllamaConfig {
    pub model_name: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum OllamaStatus {
    Running,
    Stopped,
    Missing,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaLlmModels {
    pub models: Vec<LlmModel>,
    pub status: OllamaStatus,
}

#[tauri::command]
pub async fn start_and_get_llm_model_options_ollama() -> Result<OllamaLlmModels, String> {
    // Attempt to fetch models
    match get_llm_model_options_ollama().await {
        Ok(models) => {
            return Ok(OllamaLlmModels {
                models,
                status: OllamaStatus::Running,
            });
        }
        Err(err) => {
            info!(
                "Error fetching models, assuming ollama is not running: {}",
                err
            );
            // Assume Ollama is not running
        }
    }

    // Check if it's installed
    if !is_ollama_installed() {
        return Ok(OllamaLlmModels {
            models: vec![],
            status: OllamaStatus::Missing,
        });
    }

    // Attempt to start Ollama
    start_ollama_serve().map_err(|e| format!("Error starting Ollama: {}", e))?;

    // Wait for Ollama to start
    // check get models every second for 20 seconds then error out
    let mut i = 0;
    loop {
        match get_llm_model_options_ollama().await {
            Ok(models) => {
                return Ok(OllamaLlmModels {
                    models,
                    status: OllamaStatus::Running,
                })
            }
            Err(_) => {
                if i >= 20 {
                    return Ok(OllamaLlmModels {
                        models: vec![],
                        status: OllamaStatus::Stopped,
                    });
                }
                i += 1;
                sleep(Duration::from_secs(1)).await;
            }
        }
    }
}

fn is_ollama_installed() -> bool {
    if which::which("ollama").is_ok() {
        return true;
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, check user's home directory
        if let Ok(home) = std::env::var("USERPROFILE") {
            if Path::new(&format!("{}\\AppData\\Local\\Ollama", home)).exists() {
                return true;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, check Applications folder
        if Path::new("/Applications/Ollama.app").exists() {
            return true;
        }
    }

    false
}

fn start_ollama_serve() -> Result<(), std::io::Error> {
    // On Windows, Ollama runs as a service after installation
    #[cfg(target_os = "windows")]
    {
        // This will start the Ollama service
        Command::new("cmd")
            .args(["/C", "start", "ollama"])
            .spawn()?;
    }

    // For other platforms, you can use the CLI's serve command
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("ollama").arg("serve").spawn()?;
    }

    Ok(())
}
pub async fn get_llm_model_options_ollama() -> Result<Vec<LlmModel>, String> {
    OllamaClient::default()
        .list_local_models()
        .await
        .map(|models| {
            models
                .into_iter()
                .map(|model| LlmModel {
                    name: model.name,
                    description: format!("({})", to_friendly_size(model.size)),
                })
                .collect()
        })
        .map_err(|err| format!("Error fetching available models: {err}"))
}

#[tauri::command]
pub async fn setup_ollama(state: State<'_, LlmRouterState>, llm_model: &str) -> Result<(), String> {
    info!("LLM ollama setup: {}", llm_model);
    let mut ollama = state.ollama.write().await;
    *ollama = Some(OllamaConfig {
        model_name: llm_model.to_string(),
    });

    Ok(())
}

pub async fn llm_talk_ollama(ollama_config: &OllamaConfig, text: &str) -> Result<String, String> {
    Ollama::default()
        .with_model(ollama_config.model_name.to_string())
        .invoke(text)
        .await
        .map_err(|e| format!("Error invoking Ollama: {}", e))
}

fn to_friendly_size(bytes: u64) -> String {
    // Convert bytes to human readable size
    let sizes = ["B", "KB", "MB", "GB", "TB"];
    let mut i = 0;
    let mut size = bytes as f64;
    while size > 1024.0 && i < sizes.len() - 1 {
        size /= 1024.0;
        i += 1;
    }
    format!("{:.2}{}", size, sizes[i])
}
