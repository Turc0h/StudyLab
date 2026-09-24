use crate::domain::errors::StudyLabError;
use std::collections::{HashMap, HashSet, VecDeque};

/// A pure directed edge representing a dependency between two concepts/nodes.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DirectedEdge {
    pub source_id: String,
    pub target_id: String,
}

impl DirectedEdge {
    pub fn new(source_id: impl Into<String>, target_id: impl Into<String>) -> Self {
        Self {
            source_id: source_id.into(),
            target_id: target_id.into(),
        }
    }
}

/// The result of a cycle check evaluation in a Directed Acyclic Graph (DAG).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CycleCheckResult {
    /// True if adding the candidate edge would introduce a directed cycle.
    pub would_create_cycle: bool,
    /// If a cycle is formed, the reconstructed ordered path showing the cycle.
    pub cycle_path: Option<Vec<String>>,
    /// Number of distinct nodes visited during the cycle reachability search.
    pub visited_nodes_count: usize,
}

/// Pure domain evaluation of DAG acyclicity.
///
/// Given a set of existing directed edges and a proposed new edge `source -> target`,
/// determines whether adding `source -> target` would create a cycle.
/// In a DAG, adding `source -> target` creates a cycle if and only if `source` is already
/// reachable from `target`.
pub fn check_candidate_edge_cycle(
    existing_edges: &[DirectedEdge],
    new_source: &str,
    new_target: &str,
) -> Result<CycleCheckResult, StudyLabError> {
    let source = new_source.trim();
    let target = new_target.trim();

    if source.is_empty() {
        return Err(StudyLabError::invalid_input(
            "source_id",
            "Source concept identifier cannot be empty",
        ));
    }

    if target.is_empty() {
        return Err(StudyLabError::invalid_input(
            "target_id",
            "Target concept identifier cannot be empty",
        ));
    }

    // Direct self-loop check (e.g. A -> A)
    if source == target {
        return Ok(CycleCheckResult {
            would_create_cycle: true,
            cycle_path: Some(vec![source.to_string(), target.to_string()]),
            visited_nodes_count: 1,
        });
    }

    // Build adjacency list: node -> list of targets it points to
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in existing_edges {
        let src = edge.source_id.trim();
        let tgt = edge.target_id.trim();
        if !src.is_empty() && !tgt.is_empty() {
            adj.entry(src).or_default().push(tgt);
        }
    }

    // BFS search from new_target searching for new_source.
    // We maintain a parent map to reconstruct the exact cycle path if reachable.
    let mut visited: HashSet<&str> = HashSet::new();
    let mut parent: HashMap<&str, &str> = HashMap::new();
    let mut queue: VecDeque<&str> = VecDeque::new();

    visited.insert(target);
    queue.push_back(target);

    let mut found_path = false;

    while let Some(current) = queue.pop_front() {
        if current == source {
            found_path = true;
            break;
        }

        if let Some(neighbors) = adj.get(current) {
            for &neighbor in neighbors {
                if !visited.contains(neighbor) {
                    visited.insert(neighbor);
                    parent.insert(neighbor, current);
                    queue.push_back(neighbor);
                }
            }
        }
    }

    if found_path {
        // Reconstruct path from target to source
        let mut path_rev = Vec::new();
        let mut curr = source;
        path_rev.push(curr.to_string());

        while let Some(&p) = parent.get(curr) {
            path_rev.push(p.to_string());
            curr = p;
            if curr == target {
                break;
            }
        }

        path_rev.reverse();
        // Complete the cycle by appending target to complete the loop: source -> target
        path_rev.push(target.to_string());

        Ok(CycleCheckResult {
            would_create_cycle: true,
            cycle_path: Some(path_rev),
            visited_nodes_count: visited.len(),
        })
    } else {
        Ok(CycleCheckResult {
            would_create_cycle: false,
            cycle_path: None,
            visited_nodes_count: visited.len(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_graph_allows_new_edge() {
        let edges = vec![];
        let res = check_candidate_edge_cycle(&edges, "A", "B").unwrap();
        assert!(!res.would_create_cycle);
        assert!(res.cycle_path.is_none());
        assert_eq!(res.visited_nodes_count, 1);
    }

    #[test]
    fn test_self_loop_immediately_detected() {
        let edges = vec![];
        let res = check_candidate_edge_cycle(&edges, "A", "A").unwrap();
        assert!(res.would_create_cycle);
        assert_eq!(res.cycle_path, Some(vec!["A".to_string(), "A".to_string()]));
    }

    #[test]
    fn test_simple_cycle_detected() {
        // Existing: A -> B
        // Candidate: B -> A
        let edges = vec![DirectedEdge::new("A", "B")];
        let res = check_candidate_edge_cycle(&edges, "B", "A").unwrap();
        assert!(res.would_create_cycle);
        assert_eq!(
            res.cycle_path,
            Some(vec!["A".to_string(), "B".to_string(), "A".to_string()])
        );
    }

    #[test]
    fn test_long_chain_cycle_detected() {
        // A -> B -> C -> D
        // Candidate: D -> A
        let edges = vec![
            DirectedEdge::new("A", "B"),
            DirectedEdge::new("B", "C"),
            DirectedEdge::new("C", "D"),
        ];
        let res = check_candidate_edge_cycle(&edges, "D", "A").unwrap();
        assert!(res.would_create_cycle);
        let path = res.cycle_path.unwrap();
        assert_eq!(
            path,
            vec![
                "A".to_string(),
                "B".to_string(),
                "C".to_string(),
                "D".to_string(),
                "A".to_string()
            ]
        );
    }

    #[test]
    fn test_diamond_dag_valid_no_cycle() {
        // A -> B -> D
        // A -> C -> D
        // Candidate: A -> D (transitive edge, completely valid in DAG)
        let edges = vec![
            DirectedEdge::new("A", "B"),
            DirectedEdge::new("B", "D"),
            DirectedEdge::new("A", "C"),
            DirectedEdge::new("C", "D"),
        ];
        let res = check_candidate_edge_cycle(&edges, "A", "D").unwrap();
        assert!(!res.would_create_cycle);
        assert!(res.cycle_path.is_none());
    }

    #[test]
    fn test_invalid_empty_identifiers() {
        let edges = vec![];
        assert!(check_candidate_edge_cycle(&edges, "", "B").is_err());
        assert!(check_candidate_edge_cycle(&edges, "A", "   ").is_err());
    }
}
