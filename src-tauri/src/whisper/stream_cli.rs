use crate::audio::shared::DeviceOption;
use crate::session_event::SessionEvent;
use crate::whisper::whisper_buf_reader::whisper_buf_reader;
use log::{error, info};
use serde::Serialize;
use std::any::Any;
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
