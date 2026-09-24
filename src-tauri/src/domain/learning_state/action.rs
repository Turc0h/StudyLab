use crate::domain::learning_state::recommendation::{LearningRecommendation, PedagogicalStrategy};

/// An Action represents the concrete intervention scheduled or performed by StudyLab.
/// Strictly separated from the recommendation that suggested it.
#[derive(Debug, Clone, PartialEq)]
pub struct SystemStudyAction {
    pub id: String,
    pub recommendation_id: String,
    pub concept_id: String,
    pub action_type: String,
    pub suggested_method: String,
    pub duration_minutes: u32,
    pub description: String,
    pub created_at_ms: u64,
}

impl SystemStudyAction {
    /// Transforms a validated recommendation into an actionable study intervention.
    pub fn from_recommendation(rec: &LearningRecommendation, now_ms: u64) -> Self {
        let (action_type, suggested_method) = match rec.strategy {
            PedagogicalStrategy::SpacedRepetitionReview => {
                ("SCHEDULE_SESSION", "spaced-repetition")
            }
            PedagogicalStrategy::FeynmanConceptualAudit => ("SCHEDULE_SESSION", "feynman"),
            PedagogicalStrategy::PrerequisiteReinforcement => {
                ("SCHEDULE_SESSION", "feynman")
            }
            PedagogicalStrategy::ActiveRecallPractice => {
                ("SCHEDULE_SESSION", "active-recall")
            }
            PedagogicalStrategy::MaintenanceReading => {
                ("SCHEDULE_READING", "deep-work")
            }
        };

        Self {
            id: format!("act_{}", rec.id),
            recommendation_id: rec.id.clone(),
            concept_id: rec.concept_id.clone(),
            action_type: action_type.to_string(),
            suggested_method: suggested_method.to_string(),
            duration_minutes: rec.estimated_minutes,
            description: rec.rationale.clone(),
            created_at_ms: now_ms,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::learning_state::inference::DiagnosisSeverity;

    #[test]
    fn test_action_creation_from_recommendation() {
        let rec = LearningRecommendation {
            id: "rec_1".into(),
            concept_id: "c_1".into(),
            inference_ids: vec!["inf_1".into()],
            strategy: PedagogicalStrategy::FeynmanConceptualAudit,
            priority: DiagnosisSeverity::Warning,
            rationale: "Feynman session suggested".into(),
            estimated_minutes: 20,
            generated_at_ms: 1000,
        };

        let act = SystemStudyAction::from_recommendation(&rec, 1000);
        assert_eq!(act.recommendation_id, "rec_1");
        assert_eq!(act.suggested_method, "feynman");
        assert_eq!(act.duration_minutes, 20);
    }
}
