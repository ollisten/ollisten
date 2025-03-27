use crate::audio::macos_core_audio::fetch_hidden_output_device_macos;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::utils::platform::resource_dir;
use tauri::Manager;

#[tauri::command]
pub async fn is_driver_installed() -> Result<bool, String> {
    use std::path::Path;

    // Log the command execution
    info!("Command: is_driver_installed");

    // Define the path to check
    let driver_path = "/Library/Audio/Plug-Ins/HAL/LocalEcho.driver";

    // Check if the directory exists
    if Path::new(driver_path).exists() {
        Ok(true) // Return true if the directory exists
    } else {
        Ok(false) // Return false if the directory does not exist
    }
}

#[tauri::command]
pub async fn install_driver(app: tauri::AppHandle) -> Result<(), String> {
    info!("Command: install_driver");

    // Locate the bundled resource directory
    let resource_path = resource_dir(app.package_info(), &app.env())
        .map_err(|e| format!("Failed to locate resource directory: {}", e))?;
    let pkg_path = resource_path.join("resources").join("LocalEcho.pkg");

    // Ensure the package exists
    if !pkg_path.exists() {
        return Err(format!(
            "Driver package not found at path: {}",
            pkg_path.display()
        ));
    }

    // Execute the installer command
    let output = Command::new("open")
        .arg(&pkg_path)
        .output()
        .map_err(|e| format!("Failed to execute installer: {}", e))?;

    // Check for installation success
    if !output.status.success() {
        error!(
            "Installation failed with status {} {}{}",
            output.status,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        return Err(format!(
            "Installation failed with status {} {}{}",
            output.status,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}
