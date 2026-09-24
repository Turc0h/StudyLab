use crate::domain::errors::StudyLabError;
use crate::domain::learning_state::evidence::{Evidence, EvidenceId, ObservationData};

/// The canonical 4 learning dimensions of StudyLab CognitiveOS.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MasteryDimension {
    Retention,
    Comprehension,
    Application,
    Synthesis, // Historically represented as 'transfer'
}

impl MasteryDimension {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Retention => "retention",
            Self::Comprehension => "comprehension",
            Self::Application => "application",
            Self::Synthesis => "synthesis",
        }
    }
}

/// An Assessment represents a calibrated evaluation of a specific dimension,
/// derived strictly from observed evidence, with full provenance tracking.
#[derive(Debug, Clone, PartialEq)]
pub struct DimensionAssessment {
    pub dimension: MasteryDimension,
    pub concept_id: String,
    /// Explicit provenance list of Evidence items that originated this assessment.
    pub evidence_ids: Vec<EvidenceId>,
    /// The calibrated score on [0.0, 1.0].
    pub score: f32,
    /// Number of distinct empirical evidence observations used.
    pub evidence_count: u32,
    /// Epistemic confidence in this assessment [0.0, 1.0].
    /// 0.0 indicates complete lack of evidence (pure baseline default).
    pub confidence: f32,
    /// True if this value relies on a neutral system baseline because evidence is missing.
    pub is_baseline: bool,
    pub evaluated_at_ms: u64,
}

impl DimensionAssessment {
    /// FSRS Retrievability calculation backed by domain::fsrs (single source of truth).
    /// Replaces the legacy 19/9 approximation with the unified FSRS mathematical model,
    /// matching masteryEngine.ts exactly.
    pub fn calculate_retrievability(elapsed_days: f32, stability: f32) -> f32 {
        crate::domain::fsrs::calculate_retrievability(elapsed_days as f64, stability as f64) as f32
    }

    /// Evaluates the Retention dimension for a concept based on its FSRS card review evidence.
    pub fn assess_retention(
        concept_id: &str,
        evidences: &[&Evidence],
        now_ms: u64,
    ) -> Result<Self, StudyLabError> {
        let card_reviews: Vec<(&EvidenceId, f32, f32)> = evidences
            .iter()
            .filter(|e| e.concept_id == concept_id)
            .filter_map(|e| match &e.observation {
                ObservationData::CardReview {
                    elapsed_days,
                    stability,
                    ..
                } => Some((&e.id, *elapsed_days, *stability)),
                _ => None,
            })
            .collect();

        if card_reviews.is_empty() {
            // Neutral baseline: 0.5 with 0.0 confidence
            return Ok(Self {
                dimension: MasteryDimension::Retention,
                concept_id: concept_id.to_string(),
                evidence_ids: Vec::new(),
                score: 0.5,
                evidence_count: 0,
                confidence: 0.0,
                is_baseline: true,
                evaluated_at_ms: now_ms,
            });
        }

        let mut total_r = 0.0;
        let mut ev_ids = Vec::with_capacity(card_reviews.len());

        for (id, elapsed_days, stability) in &card_reviews {
            ev_ids.push((*id).clone());
            total_r += Self::calculate_retrievability(*elapsed_days, *stability);
        }

        let count = card_reviews.len() as u32;
        let mean_r = (total_r / count as f32).clamp(0.0, 1.0);

        // Confidence saturates asymptotically with evidence count: 1 - e^(-0.5 * N)
        let confidence = (1.0 - (-0.5 * (count as f32)).exp()).clamp(0.1, 1.0);

        Ok(Self {
            dimension: MasteryDimension::Retention,
            concept_id: concept_id.to_string(),
            evidence_ids: ev_ids,
            score: (mean_r * 1000.0).round() / 1000.0,
            evidence_count: count,
            confidence: (confidence * 100.0).round() / 100.0,
            is_baseline: false,
            evaluated_at_ms: now_ms,
        })
    }

    /// Evaluates the Comprehension dimension based on Socratic evaluations and Feynman audits.
    pub fn assess_comprehension(
        concept_id: &str,
        evidences: &[&Evidence],
        now_ms: u64,
    ) -> Result<Self, StudyLabError> {
        let evals: Vec<(&EvidenceId, f32)> = evidences
            .iter()
            .filter(|e| e.concept_id == concept_id)
            .filter_map(|e| match &e.observation {
                ObservationData::AcademicEvaluation { mastery_score, .. } => {
                    Some((&e.id, *mastery_score))
                }
                _ => None,
            })
            .collect();

        if evals.is_empty() {
            return Ok(Self {
                dimension: MasteryDimension::Comprehension,
                concept_id: concept_id.to_string(),
                evidence_ids: Vec::new(),
                score: 0.5,
                evidence_count: 0,
                confidence: 0.0,
                is_baseline: true,
                evaluated_at_ms: now_ms,
            });
        }

        let mut total_score = 0.0;
        let mut ev_ids = Vec::with_capacity(evals.len());

        for (id, score) in &evals {
            ev_ids.push((*id).clone());
            total_score += score;
        }

        let count = evals.len() as u32;
        let avg_score = (total_score / count as f32) / 100.0;
        let score = avg_score.clamp(0.0, 1.0);
        let confidence = (1.0 - (-0.6 * (count as f32)).exp()).clamp(0.1, 1.0);

        Ok(Self {
            dimension: MasteryDimension::Comprehension,
            concept_id: concept_id.to_string(),
            evidence_ids: ev_ids,
            score: (score * 1000.0).round() / 1000.0,
            evidence_count: count,
            confidence: (confidence * 100.0).round() / 100.0,
            is_baseline: false,
            evaluated_at_ms: now_ms,
        })
    }

    /// Evaluates the Application dimension based on problem solving, mathematical steps and errors.
    pub fn assess_application(
        concept_id: &str,
        evidences: &[&Evidence],
        now_ms: u64,
    ) -> Result<Self, StudyLabError> {
        let errors: Vec<(&EvidenceId, bool)> = evidences
            .iter()
            .filter(|e| e.concept_id == concept_id)
            .filter_map(|e| match &e.observation {
                ObservationData::StudentError { resolved, .. } => Some((&e.id, *resolved)),
                _ => None,
            })
            .collect();

        let math_steps: Vec<(&EvidenceId, bool, f32)> = evidences
            .iter()
            .filter(|e| e.concept_id == concept_id)
            .filter_map(|e| match &e.observation {
                ObservationData::MathDerivationStep {
                    is_correct, score, ..
                } => Some((&e.id, *is_correct, *score)),
                _ => None,
            })
            .collect();

        let total_evidence_count = (errors.len() + math_steps.len()) as u32;

        if total_evidence_count == 0 {
            return Ok(Self {
                dimension: MasteryDimension::Application,
                concept_id: concept_id.to_string(),
                evidence_ids: Vec::new(),
                score: 0.6, // Canonical baseline
                evidence_count: 0,
                confidence: 0.0,
                is_baseline: true,
                evaluated_at_ms: now_ms,
            });
        }

        let mut ev_ids = Vec::new();
        let mut score = 0.6f32;

        if !errors.is_empty() {
            let resolved_count = errors.iter().filter(|(_, res)| *res).count();
            let resolution_ratio = resolved_count as f32 / errors.len() as f32;
            let unresolved = (errors.len() - resolved_count) as f32;

            // Canonical formula from masteryEngine.ts:
            score = (0.4 + resolution_ratio * 0.5 - unresolved * 0.1).clamp(0.1, 1.0);
            for (id, _) in &errors {
                ev_ids.push((*id).clone());
            }
        }

        if !math_steps.is_empty() {
            let correct_steps = math_steps.iter().filter(|(_, ok, _)| *ok).count() as f32;
            let step_ratio = correct_steps / math_steps.len() as f32;
            // Integrate mathematical step accuracy
            score = (score * 0.7 + step_ratio * 0.3).clamp(0.1, 1.0);
            for (id, _, _) in &math_steps {
                ev_ids.push((*id).clone());
            }
        }

        let confidence = (1.0 - (-0.4 * (total_evidence_count as f32)).exp()).clamp(0.1, 1.0);

        Ok(Self {
            dimension: MasteryDimension::Application,
            concept_id: concept_id.to_string(),
            evidence_ids: ev_ids,
            score: (score * 1000.0).round() / 1000.0,
            evidence_count: total_evidence_count,
            confidence: (confidence * 100.0).round() / 100.0,
            is_baseline: false,
            evaluated_at_ms: now_ms,
        })
    }

    /// Evaluates the Synthesis / Transfer dimension based on cross-concept connectivity in DAG.
    pub fn assess_synthesis(
        concept_id: &str,
        evidences: &[&Evidence],
        now_ms: u64,
    ) -> Result<Self, StudyLabError> {
        let connections: Vec<&EvidenceId> = evidences
            .iter()
            .filter(|e| e.concept_id == concept_id)
            .filter_map(|e| match &e.observation {
                ObservationData::GraphConnection { .. } => Some(&e.id),
                _ => None,
            })
            .collect();

        if connections.is_empty() {
            return Ok(Self {
                dimension: MasteryDimension::Synthesis,
                concept_id: concept_id.to_string(),
                evidence_ids: Vec::new(),
                score: 0.3, // Canonical baseline
                evidence_count: 0,
                confidence: 0.0,
                is_baseline: true,
                evaluated_at_ms: now_ms,
            });
        }

        let count = connections.len() as u32;
        // Canonical formula from masteryEngine.ts: Math.min(1.0, Math.max(0.2, 0.3 + totalConnections * 0.15))
        let raw_transfer = 0.3 + (count as f32) * 0.15;
        let score = raw_transfer.clamp(0.2, 1.0);
        let confidence = (1.0 - (-0.5 * (count as f32)).exp()).clamp(0.2, 1.0);

        let ev_ids = connections.into_iter().cloned().collect();

        Ok(Self {
            dimension: MasteryDimension::Synthesis,
            concept_id: concept_id.to_string(),
            evidence_ids: ev_ids,
            score: (score * 1000.0).round() / 1000.0,
            evidence_count: count,
            confidence: (confidence * 100.0).round() / 100.0,
            is_baseline: false,
            evaluated_at_ms: now_ms,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retention_assessment_with_evidence() {
        let ev1 = Evidence::new(
            "ev_c1",
            "concept_algebra",
            1000,
            ObservationData::CardReview {
                card_id: "c1".into(),
                rating: 3,
                latency_ms: 1000,
                elapsed_days: 1.0,
                stability: 10.0,
            },
        )
        .unwrap();

        let evidences = vec![&ev1];
        let assessment = DimensionAssessment::assess_retention("concept_algebra", &evidences, 2000).unwrap();

        assert_eq!(assessment.dimension, MasteryDimension::Retention);
        assert!(!assessment.is_baseline);
        assert_eq!(assessment.evidence_count, 1);
        // Corrected for unified FSRS: t=1.0, s=10.0 -> (1 + 19*1/10)^-0.5 = 2.9^-0.5 ~= 0.5872
        assert!((assessment.score - 0.5872).abs() < 0.001);
        assert!(assessment.confidence > 0.0);
        assert_eq!(assessment.evidence_ids, vec![EvidenceId::new("ev_c1")]);
    }

    #[test]
    fn test_retention_assessment_empty_is_baseline() {
        let evidences = vec![];
        let assessment = DimensionAssessment::assess_retention("concept_algebra", &evidences, 2000).unwrap();

        assert!(assessment.is_baseline);
        assert_eq!(assessment.evidence_count, 0);
        assert_eq!(assessment.confidence, 0.0);
        assert_eq!(assessment.score, 0.5);
    }

    #[test]
    fn test_retention_assessment_parity_with_mastery_engine() {
        // Compare against masteryEngine.ts lines 36-41 with identical inputs:
        // Card with elapsed_days = 2.0, stability = 5.0
        // TS masteryEngine.ts calculation:
        // calculateRetrievability(2.0, 5.0) = (1.0 + 19.0 * 2.0 / 5.0)^-0.5 = (1.0 + 7.6)^-0.5 = 8.6^-0.5 ~= 0.34099716
        // Old Phase 3 calculation (with / 9):
        // (1.0 + 19.0 * 2.0 / (9.0 * 5.0))^-0.5 = (1.0 + 38/45)^-0.5 ~= 0.7371
        let ev = Evidence::new(
            "ev_card_ts",
            "concept_ts",
            1000,
            ObservationData::CardReview {
                card_id: "card_ts".into(),
                rating: 3,
                latency_ms: 1200,
                elapsed_days: 2.0,
                stability: 5.0,
            },
        )
        .unwrap();

        let evidences = vec![&ev];
        let assessment = DimensionAssessment::assess_retention("concept_ts", &evidences, 2000).unwrap();

        let expected_raw = 1.0_f64 / (1.0_f64 + 19.0 * 2.0 / 5.0).sqrt();
        let expected_ts_mastery = ((expected_raw * 1000.0).round() / 1000.0) as f32;
        assert_eq!(
            assessment.score, expected_ts_mastery,
            "Parity with masteryEngine.ts failed: actual={}, expected={}",
            assessment.score,
            expected_ts_mastery
        );
        assert_eq!(assessment.score, 0.341);
    }
}
