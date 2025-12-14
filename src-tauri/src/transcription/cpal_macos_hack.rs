use coreaudio_sys::AudioDeviceID;
use kalosm::sound::MicInput;
use rodio::cpal::platform::CoreAudioDevice;

/// Works with modified code in cpal and floneum that exposes creation of hidden devices
/// https://github.com/floneum/floneum/pull/377
/// https://github.com/RustAudio/cpal/pull/974
///
/// Note: The kalosm fork already includes the necessary cpal changes (v0.15.3 with patches)
/// so we use the unsafe transmute method which works with the current setup
pub fn create_cpal_mic(audio_device_id: AudioDeviceID) -> Result<MicInput, String> {
    Ok(create_cpal_mic_unsafe(audio_device_id))
}

/// Creates a hidden device using unsafe transmute
/// This works with the kalosm fork which includes the necessary cpal modifications
fn create_cpal_mic_unsafe(audio_device_id: AudioDeviceID) -> MicInput {
    use rodio::cpal::traits::DeviceTrait;

    let device = create_cpal_device_unsafe(audio_device_id);
    let config = device.default_input_config()
        .expect("Failed to get default input config for audio device - device may not support input or is unavailable");
    let mic_input = MicInputImposter {
        host: rodio::cpal::default_host(),
        device,
        config,
    };

    unsafe { std::mem::transmute(mic_input) }
}

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
    host: rodio::cpal::Host,
    device: CoreAudioDevice,
    config: rodio::cpal::SupportedStreamConfig,
}
