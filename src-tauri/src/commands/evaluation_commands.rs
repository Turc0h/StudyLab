use crate::application::evaluation_usecase;
use crate::domain::errors::StudyLabError;
use crate::dtos::evaluation_dto::{DetectSmokeRequest, DetectSmokeResponse};

/// Tauri 2 Command: Audits spoken or written answer for evasion or lack of technical rigor.
#[tauri::command]
pub fn detect_oral_smoke(
    request: DetectSmokeRequest,
) -> Result<DetectSmokeResponse, StudyLabError> {
    evaluation_usecase::detect_oral_smoke_usecase(request)
}
