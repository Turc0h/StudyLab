use crate::application::knowledge_graph_usecase;
use crate::domain::errors::StudyLabError;
use crate::dtos::knowledge_graph_dto::{CheckCycleRequest, CheckCycleResponse};

/// Tauri 2 Command: Checks whether adding an edge between concepts would create a cycle.
/// Returns Ok(CheckCycleResponse) or Err(StudyLabError) with structured error payload.
#[tauri::command]
pub fn check_knowledge_graph_cycle(
    request: CheckCycleRequest,
) -> Result<CheckCycleResponse, StudyLabError> {
    knowledge_graph_usecase::check_edge_cycle(request)
}
