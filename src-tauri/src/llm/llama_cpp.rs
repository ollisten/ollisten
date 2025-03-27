// TODO holding off on using llama_cpp for now as it creates more problems than it solves
//
// use crate::llm::router::LlmRouterState;
// use crate::util::paths::{create_dir_if_not_exists, get_app_path};
// use anyhow::{Context, Result};
// use hf_hub::api::sync::Api;
// use llama_cpp_2::{
//     context::params::LlamaContextParams,
//     llama_backend::LlamaBackend,
//     llama_batch::LlamaBatch,
//     model::{params::LlamaModelParams, AddBos, LlamaModel, Special},
//     sampling::LlamaSampler,
// };
// use serde::{Deserialize, Serialize};
// use std::num::NonZeroU32;
// use std::{path::PathBuf, sync::Arc};
// use tauri::State;
//
// #[derive(Serialize, Deserialize, Debug, Clone)]
// pub struct LlamaCppLlmModel {
//     pub name: String,
//     pub path: String,
// }
//
// const PREDEFINED_MODELS: &[(&str, &str, &str)] = &[
//     (
//         "Mistral-7B-v0.1",
//         "TheBloke/Mistral-7B-v0.1-GGUF",
//         "mistral-7b-v0.1.Q4_K_M.gguf",
//     ),
//     (
//         "Llama2-7B-Chat",
//         "TheBloke/Llama-2-7B-Chat-GGUF",
//         "llama-2-7b-chat.Q4_K_M.gguf",
//     ),
//     (
//         "Llama2-13B-Chat",
//         "TheBloke/Llama-2-13B-Chat-GGUF",
//         "llama-2-13b-chat.Q4_K_M.gguf",
//     ),
// ];
//
// pub struct LlamaCppConfig {
//     backend: Arc<LlamaBackend>,
//     model: Option<LlamaModel>,
//     context_params: LlamaContextParams,
//     model_params: LlamaModelParams,
// }
//
// #[tauri::command]
// pub async fn setup_llama_cpp(
//     state: State<'_, LlmRouterState>,
//     model_name: &str,
// ) -> Result<(), String> {
//     let models_dir = get_models_dir?;
//
//     let (repo_id, file_name) = PREDEFINED_MODELS
//         .iter()
//         .find_map(|(name, repo, file)| (*name == model_name).then_some((*repo, *file)))
//         .ok_or_else(|| format!("Unknown model: {}", model_name))?;
//
//     let model_path = models_dir.join(file_name);
//     if !model_path.exists() {
//         let api = Api::new().map_err(|e| format!("HF API error: {}", e))?;
//         api.model(repo_id.to_string())
//             .get(file_name)
//             .map_err(|e| format!("Download failed: {}", e))?;
//     }
//
//     let backend =
//         Arc::new(LlamaBackend::init().map_err(|e| format!("Backend init failed: {}", e))?);
//
//     let model_params = LlamaModelParams::default().with_n_gpu_layers(1000);
//
//     let model = LlamaModel::load_from_file(&backend, &model_path, &model_params)
//         .map_err(|e| format!("Model load failed: {}", e))?;
//
//     let mut context_params = LlamaContextParams::default()
//         // expects NonZeroU32
//         .with_n_ctx(Some(NonZeroU32::new(2048).unwrap()))
//         .with_n_threads(4)
//         .with_n_threads_batch(4);
//
//     let mut config = state.llama_cpp.write().await;
//     *config = Some(LlamaCppConfig {
//         backend,
//         model: Some(model),
//         context_params,
//         model_params,
//     });
//
//     Ok(())
// }
//
// #[tauri::command]
// pub async fn get_llm_model_options() -> Result<Vec<LlamaCppLlmModel>, String> {
//     let models_dir = get_models_dir?;
//
//     let mut models = Vec::new();
//
//     // Add predefined models
//     for (name, _, file) in PREDEFINED_MODELS {
//         models.push(LlamaCppLlmModel {
//             name: name.to_string(),
//             path: file.to_string(),
//         });
//     }
//
//     // Add local models
//     if models_dir.exists() {
//         for entry in
//             std::fs::read_dir(models_dir).map_err(|e| format!("Directory read failed: {}", e))?
//         {
//             let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
//             let path = entry.path();
//             if path.is_file() && path.extension().map_or(false, |e| e == "gguf") {
//                 models.push(LlamaCppLlmModel {
//                     name: path.file_name().unwrap().to_str().unwrap().to_string(),
//                     path: path.to_str().unwrap().to_string(),
//                 });
//             }
//         }
//     }
//
//     Ok(models)
// }
//
// #[tauri::command]
// pub async fn llm_talk_llama_cpp(
//     state: State<'_, LlmRouterState>,
//     prompt: &str,
// ) -> Result<String, String> {
//     let config = state.llama_cpp.read().await;
//     let llama_config = config.as_ref().ok_or("Model not initialized")?;
//     let model = llama_config.model.as_ref().ok_or("Model not loaded")?;
//
//     // Tokenization
//     let tokens = model
//         .str_to_token(prompt, AddBos::Always)
//         .map_err(|e| format!("Tokenization failed: {}", e))?;
//
//     // Batch processing
//     let mut batch = LlamaBatch::new(512, 1);
//     for (i, token) in tokens.iter().enumerate() {
//         batch
//             .add(*token, i as i32, &[], i == tokens.len() - 1)
//             .map_err(|e| format!("Batch add failed: {}", e))?;
//     }
//
//     // Create context
//     let mut ctx = model
//         .new_context(&llama_config.backend, llama_config.context_params.clone())
//         .map_err(|e| format!("Context creation failed: {}", e))?;
//
//     ctx.decode(&mut batch)
//         .map_err(|e| format!("Decode failed: {}", e))?;
//
//     // Generation loop
//     let mut output = String::new();
//     let mut n_cur = batch.n_tokens();
//     let mut sampler =
//         LlamaSampler::chain_simple([LlamaSampler::dist(1234), LlamaSampler::greedy()]);
//
//     while n_cur < 512 {
//         let token = sampler.sample(&ctx, batch.n_tokens() - 1);
//         sampler.accept(token);
//
//         if model.is_eog_token(token) {
//             break;
//         }
//
//         let decoded = model
//             .token_to_str(token, Special::Tokenize)
//             .map_err(|e| format!("Decoding failed: {}", e))?;
//         output.push_str(&decoded);
//
//         batch.clear();
//         batch
//             .add(token, n_cur, &[], true)
//             .map_err(|e| format!("Batch add failed: {}", e))?;
//
//         ctx.decode(&mut batch)
//             .map_err(|e| format!("Decode failed: {}", e))?;
//
//         n_cur += 1;
//     }
//
//     Ok(output)
// }
//
// fn get_models_dir() -> Result<PathBuf> {
//     let models_dir = get_app_path()?
//         .join(".localecho")
//         .join("models")
//         .join("llama");
//     create_dir_if_not_exists(&models_dir)?;
//     Ok(models_dir)
// }
