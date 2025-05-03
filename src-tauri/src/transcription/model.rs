use kalosm::sound::WhisperSource;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
pub enum TranscriptionModel {
    Tiny,
    QuantizedTiny,
    TinyEn,
    QuantizedTinyEn,
    Base,
    BaseEn,
    Small,
    SmallEn,
    Medium,
    MediumEn,
    QuantizedDistilMediumEn,
    Large,
    LargeV2,
    DistilMediumEn,
    DistilLargeV2,
    DistilLargeV3,
    QuantizedDistilLargeV3,
    QuantizedLargeV3Turbo,
}

impl TranscriptionModel {
    pub fn to_whisper_source(&self) -> WhisperSource {
        match self {
            TranscriptionModel::Tiny => WhisperSource::Tiny,
            TranscriptionModel::QuantizedTiny => WhisperSource::QuantizedTiny,
            TranscriptionModel::TinyEn => WhisperSource::TinyEn,
            TranscriptionModel::QuantizedTinyEn => WhisperSource::QuantizedTinyEn,
            TranscriptionModel::Base => WhisperSource::Base,
            TranscriptionModel::BaseEn => WhisperSource::BaseEn,
            TranscriptionModel::Small => WhisperSource::Small,
            TranscriptionModel::SmallEn => WhisperSource::SmallEn,
            TranscriptionModel::Medium => WhisperSource::Medium,
            TranscriptionModel::MediumEn => WhisperSource::MediumEn,
            TranscriptionModel::QuantizedDistilMediumEn => WhisperSource::QuantizedDistilMediumEn,
            TranscriptionModel::Large => WhisperSource::Large,
            TranscriptionModel::LargeV2 => WhisperSource::LargeV2,
            TranscriptionModel::DistilMediumEn => WhisperSource::DistilMediumEn,
            TranscriptionModel::DistilLargeV2 => WhisperSource::DistilLargeV2,
            TranscriptionModel::DistilLargeV3 => WhisperSource::DistilLargeV3,
            TranscriptionModel::QuantizedDistilLargeV3 => WhisperSource::QuantizedDistilLargeV3,
            TranscriptionModel::QuantizedLargeV3Turbo => WhisperSource::QuantizedLargeV3Turbo,
        }
    }
}

#[tauri::command]
pub fn list_available_transcription_models() -> Vec<TranscriptionModel> {
    vec![
        TranscriptionModel::Tiny,
        TranscriptionModel::QuantizedTiny,
        TranscriptionModel::TinyEn,
        TranscriptionModel::QuantizedTinyEn,
        TranscriptionModel::Base,
        TranscriptionModel::BaseEn,
        TranscriptionModel::Small,
        TranscriptionModel::SmallEn,
        TranscriptionModel::Medium,
        TranscriptionModel::MediumEn,
        TranscriptionModel::QuantizedDistilMediumEn,
        TranscriptionModel::Large,
        TranscriptionModel::LargeV2,
        TranscriptionModel::DistilMediumEn,
        TranscriptionModel::DistilLargeV2,
        TranscriptionModel::DistilLargeV3,
        TranscriptionModel::QuantizedDistilLargeV3,
        TranscriptionModel::QuantizedLargeV3Turbo,
    ]
}
