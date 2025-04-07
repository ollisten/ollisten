// TODO holding off on using open ai for now
// use crate::llm::router::LlmRouterState;
// use crate::llm::types::LlmModel;
// use langchain_rust::language_models::llm::LLM;
// use langchain_rust::llm::{OpenAI, OpenAIConfig};
// use tauri::State;
//
// #[tauri::command]
// pub async fn setup_open_ai(
//     state: State<'_, LlmRouterState>,
//     api_base: Option<&str>,
//     api_key: &str,
//     model_name: &str,
// ) -> Result<(), String> {
//     let mut open_ai_guard = state.open_ai.write().await;
//
//     let mut open_ai_config = OpenAIConfig::default().with_api_key(api_key);
//     if let Some(api_base) = api_base {
//         open_ai_config = open_ai_config.with_api_base(api_base);
//     }
//
//     let open_ai = OpenAI::default()
//         .with_config(open_ai_config)
//         .with_model(model_name);
//
//     *open_ai_guard = Some(open_ai);
//     Ok(())
// }
//
// #[tauri::command]
// pub async fn get_llm_model_options_open_ai() -> Result<Vec<LlmModel>, String> {
//     Ok(vec![
//         LlmModel {
//             name: "gpt-4o".to_string(),
//             description: "in $2.50 out $10.00".to_string(),
//         },
//         LlmModel {
//             name: "gpt-4o-mini".to_string(),
//             description: "in $0.15 out $0.60".to_string(),
//         },
//         LlmModel {
//             name: "o1".to_string(),
//             description: "in $15.00 out $60.00".to_string(),
//         },
//         LlmModel {
//             name: "o3-mini".to_string(),
//             description: "in $1.10 out $4.40".to_string(),
//         },
//     ])
// }
//
// pub async fn llm_talk_open_ai(
//     open_ai: &OpenAI<OpenAIConfig>,
//     text: &str,
// ) -> Result<String, String> {
//     open_ai
//         .invoke(text)
//         .await
//         .map_err(|e| format!("Error invoking OpenAI: {}", e))
// }
