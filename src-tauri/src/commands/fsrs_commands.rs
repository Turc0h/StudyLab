//! Tauri IPC commands for FSRS v4.5 operations.

use crate::application::fsrs_usecase;
use crate::dtos::fsrs_dto::*;

#[tauri::command]
pub fn preview_fsrs_next_states(
    request: FsrsPreviewRequest,
) -> Result<Vec<FsrsPredictionDto>, String> {
    fsrs_usecase::preview_next_states_usecase(request)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn execute_fsrs_review(
    request: ExecuteReviewRequest,
) -> Result<ExecuteReviewResponse, String> {
    fsrs_usecase::execute_review_usecase(request)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn detect_fsrs_card_leech(
    request: LeechDetectionRequest,
) -> Result<LeechDetectionResponse, String> {
    fsrs_usecase::detect_card_leech_usecase(request)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn calculate_fsrs_model_rmse(
    request: ModelRmseRequest,
) -> Result<ModelRmseResponse, String> {
    fsrs_usecase::calculate_model_rmse_usecase(request)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
pub fn plan_fsrs_load_balance(
    request: LoadBalanceRequest,
) -> Result<LoadBalanceResponse, String> {
    fsrs_usecase::load_balance_usecase(request)
        .map_err(|e| format!("{:?}", e))
}
