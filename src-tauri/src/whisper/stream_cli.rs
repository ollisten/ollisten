use crate::session_event::SessionEvent;
use crate::whisper::whisper_buf_reader::whisper_buf_reader;
use cpal::traits::{DeviceTrait, HostTrait};
use log::{error, info};
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::ipc::Channel;

/// This is using whisper-stream CLI to transcribe audio chunks.
pub struct Runner {
    child: Arc<Mutex<Option<Child>>>,
}

#[derive(Serialize)]
pub struct DeviceOption {
    name: String,
    id: i32,
}

impl Runner {
    pub fn new(
        device_id: i32,
        model_path: &str,
        session_channel: Arc<Channel<SessionEvent>>,
        transcribed_text_send: Sender<String>,
    ) -> Self {
        info!("Starting whisper cli");
        let child = Arc::new(Mutex::new(None));
        let model_path = model_path.to_string();

        // let session_channel = Arc::clone(&session_channel);
        let child_clone = Arc::clone(&child);
        thread::spawn(move || {
            let mut cmd = Command::new("stdbuf") // Disable buffering
                .arg("-o0")
                .arg("whisper-stream")
                .arg("--capture") // capture device ID; -1 for default
                .arg(device_id.to_string())
                .arg("--model") // Path to the model to user
                .arg(model_path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("Failed to start whisper-stream");
            let stdout_reader = BufReader::new(cmd.stdout.take().unwrap());
            let stderr_reader = BufReader::new(cmd.stderr.take().unwrap());
            child_clone.lock().unwrap().replace(cmd);

            thread::spawn(move || {
                for line in stderr_reader.lines() {
                    match line {
                        Ok(text) => {
                            error!("whisper-stream: {}", text);
                        }
                        Err(e) => {
                            error!("stderr completed: {}", e);
                            return;
                        }
                    }
                }
            });

            for line in whisper_buf_reader(stdout_reader) {
                match line {
                    Ok(text) => {
                        info!("Sending transcription: {text}");
                        if let Err(e) = session_channel.send(SessionEvent::Transcription {
                            // transcription followed by question mark
                            text: text.clone(),
                        }) {
                            error!("Failed to send transcription to front-end: {}", e);
                        }
                        if let Err(e) = transcribed_text_send.send(text) {
                            error!("Failed to send transcription to sub-system: {}", e);
                        }
                    }
                    Err(e) => {
                        error!("stdout completed: {}", e);
                        return;
                    }
                }
            }

            info!("Reading complete for whisper");
        });

        Runner { child }
    }

    pub fn stop(&self) {
        self.child
            .lock()
            .unwrap()
            .as_mut()
            .unwrap()
            .kill()
            .expect("Failed to kill process");
    }
}

pub fn get_input_audio_devices() -> Result<Vec<DeviceOption>, String> {
    let mut devices = Vec::new();
    let host = cpal::default_host();

    // Add the default device
    devices.push(DeviceOption {
        name: "Default".to_string(),
        id: -1,
    });

    // Attempt to retrieve input devices
    let input_devices = host.input_devices().map_err(|e| e.to_string())?;
    for (index, device) in input_devices.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        devices.push(DeviceOption {
            name,
            id: index as i32,
        });
    }

    Ok(devices)
}
