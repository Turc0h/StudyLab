use crate::application::telemetry_usecase;
use crate::domain::errors::StudyLabError;
use crate::dtos::telemetry_dto::{
    EvaluateStressRequest, EvaluateStressResponse, HeartRateReadingDto, ParseGattRequest,
};

/// Tauri 2 Command: Evaluates heart rate and HRV into an autonomic stress diagnosis.
#[tauri::command]
pub fn evaluate_biometric_stress(
    request: EvaluateStressRequest,
) -> Result<EvaluateStressResponse, StudyLabError> {
    telemetry_usecase::evaluate_stress(request)
}

/// Tauri 2 Command: Parses Bluetooth Low Energy GATT Heart Rate payload.
#[tauri::command]
pub fn parse_gatt_heart_rate(
    request: ParseGattRequest,
) -> Result<HeartRateReadingDto, StudyLabError> {
    telemetry_usecase::parse_gatt_reading(request)
}
