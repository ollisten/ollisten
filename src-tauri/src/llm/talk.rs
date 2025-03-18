use langchain_rust::language_models::llm::LLM;
use langchain_rust::llm::ollama::client::Ollama;

#[tauri::command]
pub async fn llm_talk(llm_model: &str, text: &str) -> Result<String, String> {
    Ollama::default()
        .with_model(llm_model.to_string())
        .invoke(text)
        .await
        .map_err(|e| format!("Error invoking Ollama: {}", e))
}
