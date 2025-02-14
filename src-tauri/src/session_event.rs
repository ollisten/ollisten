use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum SessionEvent {
    Started,
    Transcription { text: String },
    QuestionAnswer { text: String },
}
