use std::fs;
use std::path::PathBuf;

pub fn get_app_sub_path(sub_path: &str) -> Result<PathBuf, String> {
    let sub_path_dir = get_app_path()?.join(sub_path);

    create_dir_if_not_exists(&sub_path_dir)?;

    Ok(sub_path_dir)
}

pub fn get_app_path() -> Result<PathBuf, String> {
    let home_dir =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;

    let app_dir = home_dir.join(".localecho");

    create_dir_if_not_exists(&app_dir)?;

    Ok(app_dir)
}

pub fn create_dir_if_not_exists(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    Ok(())
}
