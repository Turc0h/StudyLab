use crate::domain::errors::StudyLabError;
use crate::domain::learning_state::action::SystemStudyAction;
use crate::domain::learning_state::assessment::DimensionAssessment;
use crate::domain::learning_state::evidence::Evidence;
use crate::domain::learning_state::inference::LearningInference;
use crate::domain::learning_state::recommendation::LearningRecommendation;

pub const MASTERY_WEIGHTS: (f32, f32, f32, f32) = (0.35, 0.30, 0.20, 0.15);

/// Detailed dimensional breakdown for a single learning dimension.
#[derive(Debug, Clone, PartialEq)]
pub struct DimensionMetric {
    pub value: f32,
    pub confidence: f32,
    pub evidence_count: u32,
    pub is_baseline: bool,
}

/// The calibrated 4D Mastery evaluation for a concept, with full epistemic auditability.
#[derive(Debug, Clone, PartialEq)]
pub struct ConceptMasteryState {
    pub concept_id: String,
    pub concept_name: String,
    pub retention: DimensionMetric,
    pub comprehension: DimensionMetric,
    pub application: DimensionMetric,
    pub synthesis: DimensionMetric,
    pub composite_score: u8,
    pub overall_confidence: f32,
    pub evidence_count: u32,
    pub evidence_details: Vec<String>,
    pub inferences: Vec<LearningInference>,
    pub recommendations: Vec<LearningRecommendation>,
    pub suggested_actions: Vec<SystemStudyAction>,
    pub evaluated_at_ms: u64,
}

impl ConceptMasteryState {
    /// Computes the complete 4D Mastery State and Epistemic Chain from empirical evidences.
    pub fn compute_from_evidences(
        concept_id: &str,
        concept_name: &str,
        evidences: &[Evidence],
        unresolved_errors_count: u32,
        is_prerequisite_for_count: u32,
        now_ms: u64,
    ) -> Result<Self, StudyLabError> {
        let refs: Vec<&Evidence> = evidences.iter().collect();

        // 1. Evidence -> Assessments
        let retention = DimensionAssessment::assess_retention(concept_id, &refs, now_ms)?;
        let comprehension = DimensionAssessment::assess_comprehension(concept_id, &refs, now_ms)?;
        let application = DimensionAssessment::assess_application(concept_id, &refs, now_ms)?;
        let synthesis = DimensionAssessment::assess_synthesis(concept_id, &refs, now_ms)?;

        let bundle = crate::domain::learning_state::inference::AssessmentBundle {
            retention: &retention,
            comprehension: &comprehension,
            application: &application,
            synthesis: &synthesis,
        };

        // 2. Assessments -> Inferences
        let inferences = LearningInference::infer_from_assessments(
            concept_id,
            &bundle,
            unresolved_errors_count,
            is_prerequisite_for_count,
            now_ms,
        );

        // 3. Inferences -> Recommendations
        let recommendations = LearningRecommendation::generate_from_inferences(
            concept_id,
            &inferences,
            now_ms,
        );

        // 4. Recommendations -> Actions
        let actions: Vec<SystemStudyAction> = recommendations
            .iter()
            .map(|rec| SystemStudyAction::from_recommendation(rec, now_ms))
            .collect();

        // Composite calculation using canonical weights (0.35, 0.30, 0.20, 0.15)
        let raw_composite = retention.score * MASTERY_WEIGHTS.0
            + comprehension.score * MASTERY_WEIGHTS.1
            + application.score * MASTERY_WEIGHTS.2
            + synthesis.score * MASTERY_WEIGHTS.3;

        let composite_score = (raw_composite * 100.0).round().clamp(0.0, 100.0) as u8;

        let overall_confidence = retention.confidence * MASTERY_WEIGHTS.0
            + comprehension.confidence * MASTERY_WEIGHTS.1
            + application.confidence * MASTERY_WEIGHTS.2
            + synthesis.confidence * MASTERY_WEIGHTS.3;

        let total_evidence_count = retention.evidence_count
            + comprehension.evidence_count
            + application.evidence_count
            + synthesis.evidence_count;

        let mut evidence_details = Vec::new();
        if retention.evidence_count > 0 {
            evidence_details.push(format!(
                "{} tarjeta(s) FSRS auditadas (Retención media: {:.0}%)",
                retention.evidence_count,
                retention.score * 100.0
            ));
        }
        if comprehension.evidence_count > 0 {
            evidence_details.push(format!(
                "{} auditoría(s) socráticas NLI (Comprensión: {:.0}%)",
                comprehension.evidence_count,
                comprehension.score * 100.0
            ));
        }
        if application.evidence_count > 0 {
            evidence_details.push(format!(
                "{} caso(s) en Error Bank / pasos algebraicos evaluados",
                application.evidence_count
            ));
        }
        if synthesis.evidence_count > 0 {
            evidence_details.push(format!(
                "{} conexión(es) activa(s) en el Grafo de Conocimiento",
                synthesis.evidence_count
            ));
        }

        Ok(Self {
            concept_id: concept_id.to_string(),
            concept_name: concept_name.to_string(),
            retention: DimensionMetric {
                value: retention.score,
                confidence: retention.confidence,
                evidence_count: retention.evidence_count,
                is_baseline: retention.is_baseline,
            },
            comprehension: DimensionMetric {
                value: comprehension.score,
                confidence: comprehension.confidence,
                evidence_count: comprehension.evidence_count,
                is_baseline: comprehension.is_baseline,
            },
            application: DimensionMetric {
                value: application.score,
                confidence: application.confidence,
                evidence_count: application.evidence_count,
                is_baseline: application.is_baseline,
            },
            synthesis: DimensionMetric {
                value: synthesis.score,
                confidence: synthesis.confidence,
                evidence_count: synthesis.evidence_count,
                is_baseline: synthesis.is_baseline,
            },
            composite_score,
            overall_confidence: (overall_confidence * 100.0).round() / 100.0,
            evidence_count: total_evidence_count,
            evidence_details,
            inferences,
            recommendations,
            suggested_actions: actions,
            evaluated_at_ms: now_ms,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::learning_state::evidence::ObservationData;

    #[test]
    fn test_compute_mastery_epistemic_flow() {
        let ev1 = Evidence::new(
            "ev_c1",
            "concept_physics",
            1000,
            ObservationData::CardReview {
                card_id: "card_1".into(),
                rating: 1, // Forgotten
                latency_ms: 4500,
                elapsed_days: 10.0,
                stability: 2.0, // Retrievability drops
            },
        )
        .unwrap();

        let state = ConceptMasteryState::compute_from_evidences(
            "concept_physics",
            "Termodinámica",
            &[ev1],
            0,
            0,
            2000,
        )
        .expect("computes state");

        assert_eq!(state.concept_id, "concept_physics");
        assert_eq!(state.evidence_count, 1);
        assert!(!state.retention.is_baseline);
        // Retention should be decaying (< 0.75)
        assert!(state.retention.value < 0.75);
        // Should produce a RetentionDecaying inference
        assert!(state.inferences.iter().any(|i| i.id.contains("inf_decay")));
        // Should produce a SpacedRepetition recommendation
        assert!(state.recommendations.iter().any(|r| r.id.contains("rec_rev")));
        // Should produce a SCHEDULE_SESSION action
        assert!(!state.suggested_actions.is_empty());
    }
}
