use crate::session_event::SessionEvent;
use langchain_rust::language_models::llm::LLM;
use langchain_rust::llm::client::OllamaClient;
use langchain_rust::llm::ollama::client::Ollama;
use log::{error, info};
use serde::Serialize;
use std::env;
use std::sync::mpsc::Receiver;
use std::sync::Arc;
use tauri::ipc::Channel;

#[derive(Serialize)]
pub struct LlmModel {
    pub name: String,
    pub size: u64,
}

pub struct Llm {
    ollama: Ollama,
}

impl Llm {
    pub fn new(
        transcribed_text_receive: Receiver<String>,
        session_channel: Arc<Channel<SessionEvent>>,
        llm_model: String,
    ) -> Self {
        // Initialize the Ollama client
        let ollama = Ollama::default().with_model(llm_model);

        // Clone the Ollama client for use in the thread
        let ollama_clone = ollama.clone();

        // Spawn a thread for LLM processing
        tokio::spawn(async move {
            loop {
                match transcribed_text_receive.recv() {
                    Ok(transcribed) => {
                        // Process the text asynchronously
                        match process_text(&ollama_clone, transcribed).await {
                            Ok(answer) => {
                                info!("Sending question answer: {answer}");
                                if let Err(e) = session_channel
                                    .send(SessionEvent::QuestionAnswer { text: answer })
                                {
                                    error!("Failed to send question answer event: {}", e);
                                    break;
                                }
                            }
                            Err(err) => {
                                error!("Error processing text: {}", err);
                            }
                        }
                    }
                    Err(_) => {
                        info!("Stopping LLM, channel closed.");
                        break;
                    }
                }
            }
        });

        Llm { ollama }
    }
}

/// Fetches available models from Ollama
pub async fn fetch_available_models() -> Result<Vec<LlmModel>, String> {
    match OllamaClient::default().list_local_models().await {
        Ok(models) => Ok(models
            .into_iter()
            .map(|model| LlmModel {
                name: model.name,
                size: model.size,
            })
            .collect()),
        Err(err) => Err(format!("Error fetching available models: {err}")),
    }
}

async fn process_text(ollama: &Ollama, text: String) -> Result<String, String> {
    match ollama
        .invoke(format!("I need you to be very brief with no more than 15 words. The following is a transcription from a meeting. Do you have any follow up questions to suggest the listener? Transcription: {text}").as_str())
        .await
    {
        Ok(response) => Ok(response),
        Err(err) => Err(format!("Error invoking Ollama: {err}")),
    }
}
