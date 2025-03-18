use log::info;
use std::fs;

const MODEL_PATH: &str = "models/";
const MODEL_EXTENSION: &str = ".bin";

#[deprecated]
#[tauri::command]
async fn get_whisper_model_options() -> Result<Vec<String>, String> {
    info!("Command: get_whisper_model_options");
    get_models().map_err(|e| format!("Failed to fetch transcription models: {}", e))
}

#[deprecated]
pub fn get_models() -> Result<Vec<String>, String> {
    // Get just the extension without the dot
    let extension = MODEL_EXTENSION.trim_start_matches('.');

    // Safely handle read_dir failure by returning an empty vector
    let dir =
        fs::read_dir(MODEL_PATH).map_err(|e| format!("Failed to read model directory: {}", e))?;

    // Use iterator methods to filter and extract model names
    let models: Vec<String> = dir
        .filter_map(|res| res.ok())
        .filter(|entry| {
            let path = entry.path();
            path.is_file() && path.extension().map_or(false, |ext| ext == extension)
        })
        .filter_map(|entry| {
            entry
                .path()
                .file_stem()
                .and_then(|stem| stem.to_str())
                .map(String::from)
        })
        .collect();

    Ok(models)
}

pub fn get_model_path(model_name: &str) -> String {
    format!("{}{}{}", MODEL_PATH, model_name, MODEL_EXTENSION)
}
