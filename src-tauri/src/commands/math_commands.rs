use crate::application::math_usecase;
use crate::domain::errors::StudyLabError;
use crate::dtos::math_dto::{ValidateDerivationRequest, ValidateDerivationResponse};

/// Tauri 2 Command: Validates mathematical formula derivation step.
#[tauri::command]
pub fn validate_math_derivation_step(
    request: ValidateDerivationRequest,
) -> Result<ValidateDerivationResponse, StudyLabError> {
    math_usecase::validate_math_derivation(request)
}
