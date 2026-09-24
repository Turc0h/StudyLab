use crate::domain::errors::StudyLabError;
use crate::domain::learning_state::evidence::{Evidence, ObservationData};
use crate::domain::learning_state::inference::CognitiveDiagnosis;
use crate::domain::learning_state::mastery::ConceptMasteryState;
use crate::dtos::learning_state_dto::{
    ActionDto, ComputeLearningStateRequest, DimensionMetricDto, InferenceDto,
    LearningStateResponse, ObservationDto, RecommendationDto,
};
use std::time::{SystemTime, UNIX_EPOCH};

/// Application Use Case: Computes the 4D Mastery State and Epistemic Chain for a concept.
pub fn compute_concept_learning_state(
    request: ComputeLearningStateRequest,
) -> Result<LearningStateResponse, StudyLabError> {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Map DTO evidences to Domain Evidence
    let mut domain_evidences = Vec::with_capacity(request.evidences.len());

    for dto in request.evidences {
        let obs = match dto.observation {
            ObservationDto::CardReview {
                card_id,
                rating,
                latency_ms,
                elapsed_days,
                stability,
            } => ObservationData::CardReview {
                card_id,
                rating,
                latency_ms,
                elapsed_days,
                stability,
            },
            ObservationDto::AcademicEvaluation {
                evaluation_id,
                mastery_score,
                omissions_count,
                contradictions_count,
            } => ObservationData::AcademicEvaluation {
                evaluation_id,
                mastery_score,
                omissions_count,
                contradictions_count,
            },
            ObservationDto::StudentError {
                error_id,
                repetition_count,
                resolved,
                category,
            } => ObservationData::StudentError {
                error_id,
                repetition_count,
                resolved,
                category,
            },
            ObservationDto::GraphConnection {
                connected_concept_id,
                is_prerequisite,
            } => ObservationData::GraphConnection {
                connected_concept_id,
                is_prerequisite,
            },
            ObservationDto::MathDerivationStep {
                is_correct,
                score,
                token_ratio,
            } => ObservationData::MathDerivationStep {
                is_correct,
                score,
                token_ratio,
            },
        };

        let ev = Evidence::new(dto.id, dto.concept_id, dto.timestamp_ms, obs)?;
        domain_evidences.push(ev);
    }

    // Execute pure domain logic
    let state = ConceptMasteryState::compute_from_evidences(
        &request.concept_id,
        &request.concept_name,
        &domain_evidences,
        request.unresolved_errors_count,
        request.is_prerequisite_for_count,
        now_ms,
    )?;

    // Map domain result to response DTO
    let inferences = state
        .inferences
        .into_iter()
        .map(|inf| {
            let diag_str = match inf.diagnosis {
                CognitiveDiagnosis::RetentionDecaying { .. } => "retention_decay",
                CognitiveDiagnosis::PersistentMisconception { .. } => "persistent_misconception",
                CognitiveDiagnosis::PrerequisiteBottleneck { .. } => "prerequisite_bottleneck",
                CognitiveDiagnosis::UntestedConcept => "untested_concept",
                CognitiveDiagnosis::SufficientMastery { .. } => "sufficient_mastery",
            };

            InferenceDto {
                id: inf.id,
                concept_id: inf.concept_id,
                diagnosis_type: diag_str.to_string(),
                severity: inf.severity.as_str().to_string(),
                confidence: inf.confidence,
                rationale: inf.rationale,
            }
        })
        .collect();

    let recommendations = state
        .recommendations
        .into_iter()
        .map(|rec| RecommendationDto {
            id: rec.id,
            concept_id: rec.concept_id,
            strategy: rec.strategy.as_str().to_string(),
            priority: rec.priority.as_str().to_string(),
            rationale: rec.rationale,
            estimated_minutes: rec.estimated_minutes,
        })
        .collect();

    let suggested_actions = state
        .suggested_actions
        .into_iter()
        .map(|act| ActionDto {
            id: act.id,
            recommendation_id: act.recommendation_id,
            concept_id: act.concept_id,
            action_type: act.action_type,
            suggested_method: act.suggested_method,
            duration_minutes: act.duration_minutes,
            description: act.description,
        })
        .collect();

    Ok(LearningStateResponse {
        concept_id: state.concept_id,
        concept_name: state.concept_name,
        retention: DimensionMetricDto {
            value: state.retention.value,
            confidence: state.retention.confidence,
            evidence_count: state.retention.evidence_count,
            is_baseline: state.retention.is_baseline,
        },
        comprehension: DimensionMetricDto {
            value: state.comprehension.value,
            confidence: state.comprehension.confidence,
            evidence_count: state.comprehension.evidence_count,
            is_baseline: state.comprehension.is_baseline,
        },
        application: DimensionMetricDto {
            value: state.application.value,
            confidence: state.application.confidence,
            evidence_count: state.application.evidence_count,
            is_baseline: state.application.is_baseline,
        },
        synthesis: DimensionMetricDto {
            value: state.synthesis.value,
            confidence: state.synthesis.confidence,
            evidence_count: state.synthesis.evidence_count,
            is_baseline: state.synthesis.is_baseline,
        },
        composite_score: state.composite_score,
        overall_confidence: state.overall_confidence,
        evidence_count: state.evidence_count,
        evidence_details: state.evidence_details,
        inferences,
        recommendations,
        suggested_actions,
        evaluated_at_ms: state.evaluated_at_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dtos::learning_state_dto::EvidenceDto;

    #[test]
    fn test_compute_learning_state_usecase_flow() {
        let req = ComputeLearningStateRequest {
            concept_id: "c_calculus".to_string(),
            concept_name: "Cálculo Diferencial".to_string(),
            evidences: vec![EvidenceDto {
                id: "ev_1".to_string(),
                concept_id: "c_calculus".to_string(),
                timestamp_ms: 1000,
                observation: ObservationDto::CardReview {
                    card_id: "card_1".to_string(),
                    rating: 4,
                    latency_ms: 800,
                    elapsed_days: 0.5,
                    stability: 15.0,
                },
            }],
            unresolved_errors_count: 0,
            is_prerequisite_for_count: 0,
        };

        let res = compute_concept_learning_state(req).expect("use case computes state");
        assert_eq!(res.concept_id, "c_calculus");
        assert!(!res.retention.is_baseline);
        // Corrected for unified FSRS: t=0.5, s=15.0 -> 1/sqrt(1 + 19*0.5/15) ~= 0.782
        assert_eq!(res.retention.value, 0.782);
        assert_eq!(res.evidence_count, 1);
    }
}
