use crate::util::paths::get_app_path;
use tokio::fs;

#[tauri::command]
pub async fn set_app_config(app_config: String) -> Result<(), String> {
    let app_config_path = get_app_path()?.join("ollisten.yaml");
    fs::write(&app_config_path, app_config)
        .await
        .map_err(|e| format!("Failed to write app config file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn read_app_config() -> Result<String, String> {
    let app_config_path = get_app_path()?.join("ollisten.yaml");

    if !app_config_path.is_file() {
        return Ok("".to_string());
    }

    let file_contents = fs::read_to_string(&app_config_path)
        .await
        .map_err(|e| format!("Failed to read app config file: {}", e))?;

    Ok(file_contents)
}
