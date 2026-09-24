use serde::{Deserialize, Serialize};

/// Edge data transfer object representing a dependency between two concepts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdgeDto {
    pub source_id: String,
    pub target_id: String,
}

/// Request payload for cycle detection in a knowledge graph DAG.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckCycleRequest {
    pub edges: Vec<EdgeDto>,
    pub source_id: String,
    pub target_id: String,
}

/// Response payload containing the cycle verification evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckCycleResponse {
    pub would_create_cycle: bool,
    pub cycle_path: Option<Vec<String>>,
    pub visited_nodes_count: usize,
    pub checked_at_ms: u64,
}
