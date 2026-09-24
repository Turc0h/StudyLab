use crate::domain::errors::StudyLabError;

/// Unique identifier for an empirical observation recorded by StudyLab.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct EvidenceId(pub String);

impl EvidenceId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// The specific empirical observation recorded by StudyLab.
/// Evidence represents ONLY directly observed facts or measurements,
/// NEVER system interpretations, baselines or unverified inferences.
#[derive(Debug, Clone, PartialEq)]
pub enum ObservationData {
    /// Direct card review event with user rating (1..4) and measured latency.
    CardReview {
        card_id: String,
        rating: u8,
        latency_ms: u32,
        elapsed_days: f32,
        stability: f32,
    },
    /// Socratic explanation evaluation score with detected errors.
    AcademicEvaluation {
        evaluation_id: String,
        mastery_score: f32, // 0..100
        omissions_count: u32,
        contradictions_count: u32,
    },
    /// Student error recorded in the error bank.
    StudentError {
        error_id: String,
        repetition_count: u32,
        resolved: bool,
        category: String,
    },
    /// Explicit topological relationship in the Knowledge Graph.
    GraphConnection {
        connected_concept_id: String,
        is_prerequisite: bool,
    },
    /// Mathematical derivation attempt evaluation.
    MathDerivationStep {
        is_correct: bool,
        score: f32,
        token_ratio: f32,
    },
}

/// An empirical evidence record anchored to a specific concept and timestamp.
#[derive(Debug, Clone, PartialEq)]
pub struct Evidence {
    pub id: EvidenceId,
    pub concept_id: String,
    pub timestamp_ms: u64,
    pub observation: ObservationData,
}

impl Evidence {
    pub fn new(
        id: impl Into<String>,
        concept_id: impl Into<String>,
        timestamp_ms: u64,
        observation: ObservationData,
    ) -> Result<Self, StudyLabError> {
        let cid = concept_id.into();
        let eid = id.into();

        if cid.trim().is_empty() {
            return Err(StudyLabError::invalid_input(
                "concept_id",
                "Concept identifier cannot be empty in Evidence",
            ));
        }
        if eid.trim().is_empty() {
            return Err(StudyLabError::invalid_input(
                "id",
                "Evidence identifier cannot be empty",
            ));
        }

        Ok(Self {
            id: EvidenceId::new(eid),
            concept_id: cid,
            timestamp_ms,
            observation,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_evidence_creation() {
        let ev = Evidence::new(
            "ev_1",
            "concept_calculus",
            1700000000000,
            ObservationData::CardReview {
                card_id: "c_1".into(),
                rating: 3,
                latency_ms: 1200,
                elapsed_days: 2.5,
                stability: 4.8,
            },
        )
        .expect("evidence creates successfully");

        assert_eq!(ev.id.as_str(), "ev_1");
        assert_eq!(ev.concept_id, "concept_calculus");
    }

    #[test]
    fn test_invalid_evidence_empty_concept() {
        let res = Evidence::new(
            "ev_2",
            "   ",
            1700000000000,
            ObservationData::StudentError {
                error_id: "err_1".into(),
                repetition_count: 1,
                resolved: false,
                category: "misconception".into(),
            },
        );
        assert!(res.is_err());
    }
}
