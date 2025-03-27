use crate::audio::macos_core_audio::fetch_hidden_output_device_macos;
use log::info;
use serde::{Deserialize, Serialize};

#[tauri::command]
pub async fn get_listen_device_options() -> Result<Vec<DeviceOption>, String> {
    info!("Command: get_listen_device_options");

    let mut listen_device_options = Vec::new();
    list_available_audio_input_devices(&mut listen_device_options)
        .map_err(|e| format!("Failed to fetch input audio devices: {}", e))?;
    Ok(listen_device_options)
}

#[tauri::command]
pub async fn get_hidden_device() -> Result<Option<DeviceOption>, String> {
    info!("Command: fetch_hidden_output_device");
    fetch_hidden_output_device()
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DeviceOption {
    pub id: i32,
    pub name: String,
}

#[cfg(not(target_os = "macos"))]
pub fn list_available_audio_input_devices(devices: &mut Vec<DeviceOption>) -> Result<(), String> {
    Err("Platform not supported")
}

#[cfg(not(target_os = "macos"))]
fn fetch_hidden_output_device() -> Result<Option<DeviceOption>, String> {
    Err("Platform not supported")
}

#[cfg(target_os = "macos")]
fn list_available_audio_input_devices(devices: &mut Vec<DeviceOption>) -> Result<(), String> {
    use super::macos_core_audio::list_available_audio_input_devices_macos;
    list_available_audio_input_devices_macos(devices)
}

#[cfg(target_os = "macos")]
fn fetch_hidden_output_device() -> Result<Option<DeviceOption>, String> {
    use super::macos_core_audio::fetch_hidden_output_device_macos;
    fetch_hidden_output_device_macos()
}
