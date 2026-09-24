use crate::domain::errors::StudyLabError;
use crate::domain::knowledge_graph::dag::{check_candidate_edge_cycle, DirectedEdge};
use crate::dtos::knowledge_graph_dto::{CheckCycleRequest, CheckCycleResponse};
use std::time::{SystemTime, UNIX_EPOCH};

/// Application Use Case: Checks whether adding a dependency edge between concepts
/// violates the DAG invariant by creating a cycle.
pub fn check_edge_cycle(request: CheckCycleRequest) -> Result<CheckCycleResponse, StudyLabError> {
    // Map DTO edges to pure domain entities
    let domain_edges: Vec<DirectedEdge> = request
        .edges
        .into_iter()
        .map(|dto| DirectedEdge::new(dto.source_id, dto.target_id))
        .collect();

    // Execute pure domain logic
    let result = check_candidate_edge_cycle(&domain_edges, &request.source_id, &request.target_id)?;

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(CheckCycleResponse {
        would_create_cycle: result.would_create_cycle,
        cycle_path: result.cycle_path,
        visited_nodes_count: result.visited_nodes_count,
        checked_at_ms: now_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dtos::knowledge_graph_dto::EdgeDto;

    #[test]
    fn test_application_usecase_flow() {
        let req = CheckCycleRequest {
            edges: vec![EdgeDto {
                source_id: "NodeA".to_string(),
                target_id: "NodeB".to_string(),
            }],
            source_id: "NodeB".to_string(),
            target_id: "NodeA".to_string(),
        };

        let response = check_edge_cycle(req).expect("use case execution succeeds");
        assert!(response.would_create_cycle);
        assert!(response.cycle_path.is_some());
        assert!(response.checked_at_ms > 0);
    }
}
