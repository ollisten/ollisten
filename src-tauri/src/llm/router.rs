use crate::llm::ollama::{llm_talk_ollama, OllamaConfig};
use log::info;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

pub struct LlmRouterState {
    pub ollama: Arc<RwLock<Option<OllamaConfig>>>,
}

#[tauri::command]
pub async fn llm_talk(
    state: State<'_, LlmRouterState>,
    text: &str,
    structured_output_schema_string: Option<&str>,
) -> Result<String, String> {
    info!(
        "LLM request: {}",
        // Cut to 100 chars and remove newlines
        &text
            .chars()
            .take(100)
            .collect::<String>()
            .replace('\n', " ")
    );

    if let Some(ollama) = state.ollama.read().await.as_ref() {
        let response = llm_talk_ollama(ollama, text, structured_output_schema_string).await?;
        info!(
            "LLM ollama response: {}",
            &response
                .chars()
                .take(100)
                .collect::<String>()
                .replace('\n', " ")
        );
        return Ok(response);
    }

    Err("No LLM endpoint is configured".to_string())
}
