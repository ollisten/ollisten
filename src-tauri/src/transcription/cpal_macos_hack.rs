use crate::transcription::cpal_macos_hack::cpal::platform::CoreAudioDevice;
use coreaudio_sys::AudioDeviceID;
use kalosm::sound::rodio::{cpal, DeviceTrait};
use kalosm::sound::MicInput;

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

fn create_cpal_device(audio_device_id: AudioDeviceID) -> CoreAudioDevice {
    let my_device = CoreAudioDeviceImposter {
        audio_device_id,
        is_default: false,
    };

    unsafe { std::mem::transmute(my_device) }
}

pub fn create_cpal_mic(audio_device_id: AudioDeviceID) -> MicInput {
    let device = create_cpal_device(audio_device_id);
    let config = device.default_input_config().unwrap();
    let mic_input = MicInputImposter {
        host: cpal::default_host(),
        device,
        config,
    };

    unsafe { std::mem::transmute(mic_input) }
}
