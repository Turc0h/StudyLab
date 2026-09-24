use crate::domain::learning_state::inference::{CognitiveDiagnosis, DiagnosisSeverity, LearningInference};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PedagogicalStrategy {
    SpacedRepetitionReview,
    FeynmanConceptualAudit,
    PrerequisiteReinforcement,
    ActiveRecallPractice,
    MaintenanceReading,
}

impl PedagogicalStrategy {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SpacedRepetitionReview => "spaced-repetition",
            Self::FeynmanConceptualAudit => "feynman",
            Self::PrerequisiteReinforcement => "prerequisite-reinforcement",
            Self::ActiveRecallPractice => "active-recall",
            Self::MaintenanceReading => "maintenance-reading",
        }
    }
}

/// A pedagogical recommendation derived strictly from learning inferences.
/// Explicitly articulates "Why StudyLab is recommending this" through inference provenance.
#[derive(Debug, Clone, PartialEq)]
pub struct LearningRecommendation {
    pub id: String,
    pub concept_id: String,
    /// Provenance: IDs of the inferences that justified this recommendation.
    pub inference_ids: Vec<String>,
    pub strategy: PedagogicalStrategy,
    pub priority: DiagnosisSeverity,
    /// Explicit educational rationale.
    pub rationale: String,
    pub estimated_minutes: u32,
    pub generated_at_ms: u64,
}

impl LearningRecommendation {
    /// Generates targeted pedagogical recommendations from active learning inferences.
    pub fn generate_from_inferences(
        concept_id: &str,
        inferences: &[LearningInference],
        now_ms: u64,
    ) -> Vec<Self> {
        let mut recommendations = Vec::new();

        for inf in inferences {
            if inf.concept_id != concept_id {
                continue;
            }

            match &inf.diagnosis {
                CognitiveDiagnosis::RetentionDecaying { retrievability } => {
                    recommendations.push(Self {
                        id: format!("rec_rev_{concept_id}"),
                        concept_id: concept_id.to_string(),
                        inference_ids: vec![inf.id.clone()],
                        strategy: PedagogicalStrategy::SpacedRepetitionReview,
                        priority: inf.severity,
                        rationale: format!(
                            "Repaso urgente de tarjetas espaciadas: la retención estimada cayó a {:.0}%, arriesgando pérdida del trazo mnémico.",
                            retrievability * 100.0
                        ),
                        estimated_minutes: 10,
                        generated_at_ms: now_ms,
                    });
                }
                CognitiveDiagnosis::PersistentMisconception { unresolved_errors_count } => {
                    recommendations.push(Self {
                        id: format!("rec_feynman_{concept_id}"),
                        concept_id: concept_id.to_string(),
                        inference_ids: vec![inf.id.clone()],
                        strategy: PedagogicalStrategy::FeynmanConceptualAudit,
                        priority: inf.severity,
                        rationale: format!(
                            "Sesión Feynman focalizada: existen {} error(es) pendientes. Conviene re-explicar la noción y contrastar con la fuente original.",
                            unresolved_errors_count
                        ),
                        estimated_minutes: 20,
                        generated_at_ms: now_ms,
                    });
                }
                CognitiveDiagnosis::PrerequisiteBottleneck { composite_score } => {
                    recommendations.push(Self {
                        id: format!("rec_prereq_{concept_id}"),
                        concept_id: concept_id.to_string(),
                        inference_ids: vec![inf.id.clone()],
                        strategy: PedagogicalStrategy::PrerequisiteReinforcement,
                        priority: DiagnosisSeverity::Critical,
                        rationale: format!(
                            "Desbloqueo de cuello de botella: el concepto base tiene solo {}% de dominio y frena el aprendizaje en temas posteriores.",
                            composite_score
                        ),
                        estimated_minutes: 25,
                        generated_at_ms: now_ms,
                    });
                }
                CognitiveDiagnosis::UntestedConcept => {
                    recommendations.push(Self {
                        id: format!("rec_init_{concept_id}"),
                        concept_id: concept_id.to_string(),
                        inference_ids: vec![inf.id.clone()],
                        strategy: PedagogicalStrategy::ActiveRecallPractice,
                        priority: DiagnosisSeverity::Info,
                        rationale: "Evaluación diagnóstica inicial: el concepto no tiene observaciones previas.".to_string(),
                        estimated_minutes: 15,
                        generated_at_ms: now_ms,
                    });
                }
                CognitiveDiagnosis::SufficientMastery { .. } => {
                    // Concept is mastered; no urgent intervention required
                }
            }
        }

        recommendations
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recommendation_generation_from_decay() {
        let inf = LearningInference {
            id: "inf_decay_1".into(),
            concept_id: "concept_math".into(),
            diagnosis: CognitiveDiagnosis::RetentionDecaying { retrievability: 0.42 },
            severity: DiagnosisSeverity::Critical,
            confidence: 0.85,
            rationale: "Retención baja".into(),
            generated_at_ms: 1000,
        };

        let recs = LearningRecommendation::generate_from_inferences("concept_math", &[inf], 1000);
        assert_eq!(recs.len(), 1);
        assert_eq!(recs[0].strategy, PedagogicalStrategy::SpacedRepetitionReview);
        assert_eq!(recs[0].priority, DiagnosisSeverity::Critical);
        assert_eq!(recs[0].inference_ids, vec!["inf_decay_1"]);
    }
}
