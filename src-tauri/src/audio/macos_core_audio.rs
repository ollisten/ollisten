use crate::audio;
use audio::devices::DeviceOption;
use core_foundation::base::TCFType;
use core_foundation::string::{CFString, CFStringRef};
use coreaudio_sys::{
    kAudioDevicePropertyDeviceNameCFString, kAudioDevicePropertyScopeInput,
    kAudioDevicePropertyScopeOutput, kAudioDevicePropertyStreamConfiguration,
    kAudioHardwareNoError, kAudioHardwarePropertyDefaultInputDevice, kAudioHardwarePropertyDevices,
    kAudioHardwarePropertyTranslateUIDToDevice, kAudioObjectPropertyElementMaster,
    kAudioObjectPropertyScopeGlobal, kAudioObjectSystemObject, kCFAllocatorDefault,
    kCFStringEncodingUTF8, AudioDeviceID, AudioObjectGetPropertyData,
    AudioObjectGetPropertyDataSize, AudioObjectPropertyAddress, CFStringCreateWithCString,
};
use lazy_static::lazy_static;
use log::info;
use std::ffi::CString;
use std::mem;
use std::os::raw::c_void;
use std::ptr;
use std::sync::Mutex;

lazy_static! {
    static ref AudioDeviceMutex: Mutex<()> = Mutex::new(());
}

const LOCAL_ECHO_INTERNAL_UID: &str = "Ollisten_INTERNAL";
const LOCAL_ECHO_INTERNAL_DISPLAY_NAME: &str = "Ollisten";

pub fn fetch_hidden_output_device_macos() -> Result<Option<DeviceOption>, String> {
    // Acquire lock before audio operations
    let _guard = AudioDeviceMutex.lock().map_err(|e| e.to_string())?;

    // Return if None, otherwise keep getting the device name later
    let device_id = match get_device_by_uid(LOCAL_ECHO_INTERNAL_UID) {
        Ok(Some(id)) => id,
        Ok(None) => return Ok(None),
        Err(e) => {
            return Err(format!(
                "Failed to fetch {} output device: {}",
                LOCAL_ECHO_INTERNAL_UID, e
            ))
        }
    };

    let name = get_device_name(device_id).unwrap_or_else(|_| "Unknown Device".to_string());
    info!("Internal device {LOCAL_ECHO_INTERNAL_UID} found with id {device_id} name {name}");
    Ok(Some(DeviceOption {
        id: device_id as i32,
        name: LOCAL_ECHO_INTERNAL_DISPLAY_NAME.to_string(),
    }))
}

pub fn list_available_audio_input_devices_macos(
    devices: &mut Vec<DeviceOption>,
) -> Result<(), String> {
    // Acquire lock before audio operations
    let _guard = AudioDeviceMutex.lock().map_err(|e| e.to_string())?;

    // Default microphone
    devices.push(DeviceOption {
        id: -1,
        name: "Default".to_string(),
    });

    // All available other microphones
    list_audio_input_devices(devices)?;

    Ok(())
}

/// Fetches all audio device IDs from the system
fn fetch_all_device_ids() -> Result<Vec<AudioDeviceID>, String> {
    unsafe {
        // Set up property address for device enumeration
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMaster,
        };

        // Get size of the device array
        let mut property_size: u32 = 0;
        let status = AudioObjectGetPropertyDataSize(
            kAudioObjectSystemObject,
            &property_address,
            0,
            ptr::null(),
            &mut property_size,
        );

        if status as i32 != kAudioHardwareNoError as i32 {
            return Err(format!("Error getting device list size: {}", status));
        }

        // Allocate buffer for device IDs
        let device_count = property_size as usize / mem::size_of::<AudioDeviceID>();
        let mut device_ids = vec![0 as AudioDeviceID; device_count];

        // Get device IDs
        let status = AudioObjectGetPropertyData(
            kAudioObjectSystemObject,
            &property_address,
            0,
            ptr::null(),
            &mut property_size,
            device_ids.as_mut_ptr() as *mut _,
        );

        if status as i32 != kAudioHardwareNoError as i32 {
            return Err(format!("Error getting device IDs: {}", status));
        }

        Ok(device_ids)
    }
}

/// Get the default input device ID
fn get_default_input_device() -> Result<AudioDeviceID, String> {
    unsafe {
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMaster,
        };

        let mut device_id: AudioDeviceID = 0;
        let mut property_size = mem::size_of::<AudioDeviceID>() as u32;

        let status = AudioObjectGetPropertyData(
            kAudioObjectSystemObject,
            &property_address,
            0,
            ptr::null(),
            &mut property_size,
            &mut device_id as *mut AudioDeviceID as *mut _,
        );

        if status as i32 != kAudioHardwareNoError as i32 {
            return Err(format!("Error getting default input device: {}", status));
        }

        Ok(device_id)
    }
}

/// Determines if a device has input channels
fn has_input_channels(device_id: AudioDeviceID) -> bool {
    unsafe {
        // Check if device has input capabilities
        let input_stream_config_address = AudioObjectPropertyAddress {
            mSelector: kAudioDevicePropertyStreamConfiguration,
            mScope: kAudioDevicePropertyScopeInput,
            mElement: kAudioObjectPropertyElementMaster,
        };

        let mut input_config_size: u32 = 0;
        let status = AudioObjectGetPropertyDataSize(
            device_id,
            &input_stream_config_address,
            0,
            ptr::null(),
            &mut input_config_size,
        );

        // Return true if the device has input capabilities
        status as i32 == kAudioHardwareNoError as i32 && input_config_size > 0
    }
}

/// Determines if a device has output channels
fn has_output_channels(device_id: AudioDeviceID) -> bool {
    unsafe {
        // Check if device has output capabilities
        let output_stream_config_address = AudioObjectPropertyAddress {
            mSelector: kAudioDevicePropertyStreamConfiguration,
            mScope: kAudioDevicePropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMaster,
        };

        let mut output_config_size: u32 = 0;
        let status = AudioObjectGetPropertyDataSize(
            device_id,
            &output_stream_config_address,
            0,
            ptr::null(),
            &mut output_config_size,
        );

        // Return true if the device has output capabilities
        status as i32 == kAudioHardwareNoError as i32 && output_config_size > 0
    }
}

/// Determines if a device is primarily an input device
fn is_primary_input_device(device_id: AudioDeviceID) -> bool {
    // Get the device name
    let name = match get_device_name(device_id) {
        Ok(name) => name,
        Err(_) => return false,
    };

    // Device with "Microphone" in name is definitely an input
    if name.contains("Microphone") || name.contains("Input") {
        return true;
    }

    // If the device has no output channels, it's exclusively an input device
    if !has_output_channels(device_id) {
        return true;
    }

    // If it has "Speaker" or "Output" in the name, it's primarily an output
    if name.contains("Speaker") || name.contains("Output") || name.contains("Headphone") {
        return false;
    }

    // For devices with ambiguous status, check if it's the default input
    if let Ok(default_id) = get_default_input_device() {
        if device_id == default_id {
            return true;
        }
    }

    // By default, consider it not a primary input device
    false
}

/// Gets the name of an audio device given its ID
fn get_device_name(device_id: AudioDeviceID) -> Result<String, String> {
    unsafe {
        let name_address = AudioObjectPropertyAddress {
            mSelector: kAudioDevicePropertyDeviceNameCFString,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMaster,
        };
        let mut property_size = mem::size_of::<CFStringRef>() as u32;

        let mut device_name_ref: CFStringRef = ptr::null_mut();
        let status = AudioObjectGetPropertyData(
            device_id,
            &name_address,
            0,
            ptr::null(),
            &mut property_size,
            &mut device_name_ref as *mut _ as *mut _,
        );

        if status as i32 == kAudioHardwareNoError as i32 && !device_name_ref.is_null() {
            let cf_string: CFString = TCFType::wrap_under_get_rule(device_name_ref);
            Ok(cf_string.to_string())
        } else {
            Err("Unknown Device".to_string())
        }
    }
}

/// Lists audio input devices with improved filtering
fn list_audio_input_devices(devices: &mut Vec<DeviceOption>) -> Result<(), String> {
    // Get all device IDs
    let all_device_ids = fetch_all_device_ids()?;

    // Filter to get only true input devices
    for &device_id in &all_device_ids {
        if has_input_channels(device_id) && is_primary_input_device(device_id) {
            match get_device_name(device_id) {
                Ok(name) => {
                    info!("Found device {name} found with id {device_id}");
                    devices.push(DeviceOption {
                        id: device_id as i32,
                        name,
                    });
                }
                Err(_) => {
                    info!("Found device with no name with id {device_id}");
                    // Skip devices with unknown names
                    continue;
                }
            }
        }
    }

    Ok(())
}

/// Get the device ID for a given UID, only way to get a hidden device
fn get_device_by_uid(uid: &str) -> Result<Option<AudioDeviceID>, String> {
    unsafe {
        let cstr_uid = CString::new(uid).unwrap();
        let cf_uid = CFStringCreateWithCString(
            kCFAllocatorDefault,
            cstr_uid.as_ptr(),
            kCFStringEncodingUTF8,
        );
        let cf_uid_size = size_of::<CFStringRef>();
        let property_address = AudioObjectPropertyAddress {
            mSelector: kAudioHardwarePropertyTranslateUIDToDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMaster,
        };
        let mut device_id: AudioDeviceID = 0;
        let mut property_size = size_of::<AudioDeviceID>() as u32;

        let status = AudioObjectGetPropertyData(
            kAudioObjectSystemObject,
            &property_address,
            cf_uid_size as u32,
            &cf_uid as *const _ as *const c_void,
            &mut property_size,
            &mut device_id as *mut AudioDeviceID as *mut _,
        );

        // More detailed error reporting
        if status as i32 != kAudioHardwareNoError as i32 {
            return Err(format!(
                "Error getting device by UID '{}': status={} ({})",
                uid, status, status as i32
            ));
        } else if device_id != 0 {
            return Ok(Some(device_id));
        } else {
            // Device wasn't found, but no error occurred
            return Ok(None);
        }
    }
}
