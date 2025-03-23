use serde::Serialize;

// Event types for the transcription channel
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type")]
pub enum TranscriptionEvent {
    #[serde(rename_all = "camelCase")]
    TranscriptionStarting,
    #[serde(rename_all = "camelCase")]
    TranscriptionDownloadProgress {
        source: String,
        size: u64,
        progress: u64,
    },
    #[serde(rename_all = "camelCase")]
    TranscriptionLoadingProgress {
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
    TranscriptionError { message: String },
    #[serde(rename_all = "camelCase")]
    TranscriptionStopped,
}
