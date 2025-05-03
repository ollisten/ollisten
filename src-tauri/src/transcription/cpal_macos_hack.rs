use crate::transcription::cpal_macos_hack::cpal::platform::CoreAudioDevice;
use coreaudio_sys::AudioDeviceID;
use kalosm::sound::rodio::{cpal, DeviceTrait};
use kalosm::sound::MicInput;
use rodio::cpal::traits::HostTrait;

/// Works with modified code in cpal and floneum that exposes creation of hidden devices
/// https://github.com/floneum/floneum/pull/377
/// https://github.com/RustAudio/cpal/pull/974
pub fn create_cpal_mic(audio_device_id: AudioDeviceID) -> Result<MicInput, String> {
    let device_inner: CoreAudioDevice = CoreAudioDevice::new(audio_device_id);
    let device = cpal::platform::Device::from(device_inner);
    let mic_input = MicInput::from_device(device);
    Ok(mic_input)
}

/// Previous attempt at creating a hidden device
/// This has the issue of not clearing up resources properly, but works without modifying
/// underlying cpal and floneum code
#[deprecated]
pub fn create_cpal_mic_unsafe(audio_device_id: AudioDeviceID) -> MicInput {
    let device = create_cpal_device_unsafe(audio_device_id);
    let config = device.default_input_config().unwrap();
    let mic_input = MicInputImposter {
        host: cpal::default_host(),
        device,
        config,
    };

    unsafe { std::mem::transmute(mic_input) }
}

#[deprecated]
fn create_cpal_device_unsafe(audio_device_id: AudioDeviceID) -> CoreAudioDevice {
    let my_device = CoreAudioDeviceImposter {
        audio_device_id,
        is_default: false,
    };

    unsafe { std::mem::transmute(my_device) }
}

/// Matches cpal::platform::CoreAudioDevice
#[derive(Clone, PartialEq, Eq)]
struct CoreAudioDeviceImposter {
    pub(crate) audio_device_id: AudioDeviceID,
    is_default: bool,
}

/// Matches kalosm::MicInput
pub struct MicInputImposter {
    host: cpal::Host,
    device: CoreAudioDevice,
    config: cpal::SupportedStreamConfig,
}
