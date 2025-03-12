use serde::Serialize;

#[derive(Serialize)]
pub struct DeviceOption {
    pub id: i32,
    pub name: String,
}

#[cfg(not(target_os = "macos"))]
pub fn list_available_audio_input_devices(devices: &mut Vec<DeviceOption>) -> Result<(), String> {
    devices.push(DeviceOption {
        id: -1,
        name: "Default".to_string(),
    });

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn list_available_audio_input_devices(devices: &mut Vec<DeviceOption>) -> Result<(), String> {
    use super::macos_core_audio::list_available_audio_input_devices;
    list_available_audio_input_devices(devices)
}
