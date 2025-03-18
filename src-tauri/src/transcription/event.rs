use serde::Serialize;

// Event types for the transcription channel
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "event", content = "data")]
pub enum TranscriptionEvent {
    #[serde(rename_all = "camelCase")]
    Starting,
    #[serde(rename_all = "camelCase")]
    DownloadProgress {
        source: String,
        size: u64,
        progress: u64,
    },
    #[serde(rename_all = "camelCase")]
    LoadingProgress {
        progress: f32, // from 0 to 1
    },
    #[serde(rename_all = "camelCase")]
    TranscriptionStarted { device_id: i32 },
    #[serde(rename_all = "camelCase")]
    TranscriptionData {
        device_id: i32,
        text: String,
        confidence: f64,
    },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
    #[serde(rename_all = "camelCase")]
    Stopped,
}
