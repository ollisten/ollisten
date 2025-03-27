use crate::llm::ollama::{llm_talk_ollama, OllamaConfig};
use crate::llm::open_ai::llm_talk_open_ai;
use langchain_rust::llm::{OpenAI, OpenAIConfig};
use log::info;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

pub struct LlmRouterState {
    pub ollama: Arc<RwLock<Option<OllamaConfig>>>,
    pub open_ai: Arc<RwLock<Option<OpenAI<OpenAIConfig>>>>,
}

#[tauri::command]
pub async fn llm_talk(state: State<'_, LlmRouterState>, text: &str) -> Result<String, String> {
    info!("LLM request: {}", text);

    if let Some(ollama) = state.ollama.read().await.as_ref() {
        let response = llm_talk_ollama(ollama, text).await?;
        info!("LLM ollama response: {}", response);
        return Ok(response);
    }

    if let Some(open_ai) = state.open_ai.read().await.as_ref() {
        let response = llm_talk_open_ai(open_ai, text).await?;
        info!("LLM openai response: {}", response);
        return Ok(response);
    }

    Err("No LLM endpoint is configured".to_string())
}
