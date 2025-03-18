use langchain_rust::language_models::llm::LLM;
use langchain_rust::llm::client::OllamaClient;
use langchain_rust::llm::ollama::client::Ollama;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LlmModel {
    pub name: String,
    pub size: u64,
}

#[tauri::command]
pub async fn get_llm_model_options() -> Result<Vec<LlmModel>, String> {
    OllamaClient::default()
        .list_local_models()
        .await
        .map(|models| {
            models
                .into_iter()
                .map(|model| LlmModel {
                    name: model.name,
                    size: model.size,
                })
                .collect()
        })
        .map_err(|err| format!("Error fetching available models: {err}"))
}
