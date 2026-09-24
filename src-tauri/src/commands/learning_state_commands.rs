use crate::application::learning_state_usecase;
use crate::domain::errors::StudyLabError;
use crate::dtos::learning_state_dto::{ComputeLearningStateRequest, LearningStateResponse};

/// Tauri 2 Command: Evaluates the complete 4D Mastery and Epistemic Chain (Evidence -> Assessment -> Inference -> Recommendation -> Action)
/// for a concept, with full auditability and zero false certainty.
#[tauri::command]
pub fn compute_learning_state(
    request: ComputeLearningStateRequest,
) -> Result<LearningStateResponse, StudyLabError> {
    learning_state_usecase::compute_concept_learning_state(request)
}
