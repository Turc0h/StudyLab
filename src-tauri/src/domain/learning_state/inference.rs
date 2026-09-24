use crate::domain::learning_state::assessment::DimensionAssessment;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiagnosisSeverity {
    Critical,
    Warning,
    Info,
}

impl DiagnosisSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::Warning => "warning",
            Self::Info => "info",
        }
    }
}

/// Inferred cognitive diagnosis on a student's learning state for a concept.
#[derive(Debug, Clone, PartialEq)]
pub enum CognitiveDiagnosis {
    /// Accelerated memory decay or impending forgetting (R < 0.75).
    RetentionDecaying { retrievability: f32 },
    /// Conceptual misunderstanding or repeated unresolved errors.
    PersistentMisconception { unresolved_errors_count: u32 },
    /// Foundational prerequisite with weak mastery that threatens downstream concepts.
    PrerequisiteBottleneck { composite_score: u8 },
    /// Concept is newly added or has zero empirical observations.
    UntestedConcept,
    /// Concept demonstrates solid retention, comprehension, and application.
    SufficientMastery { composite_score: u8 },
}

/// An Inference represents an interpretive, causal, or probabilistic deduction.
/// It is strictly separated from empirical observations (Evidence) and direct metrics (Assessment).
#[derive(Debug, Clone, PartialEq)]
pub struct LearningInference {
    pub id: String,
    pub concept_id: String,
    pub diagnosis: CognitiveDiagnosis,
    pub severity: DiagnosisSeverity,
    /// Epistemic confidence in this inference [0.0, 1.0].
    pub confidence: f32,
    /// Explanatory rationale detailing why the system made this inference.
    pub rationale: String,
    pub generated_at_ms: u64,
}

/// A bundle of the 4 calibrated dimension assessments for a concept.
#[derive(Debug, Clone, Copy)]
pub struct AssessmentBundle<'a> {
    pub retention: &'a DimensionAssessment,
    pub comprehension: &'a DimensionAssessment,
    pub application: &'a DimensionAssessment,
    pub synthesis: &'a DimensionAssessment,
}

impl LearningInference {
    /// Infers learning diagnoses from calibrated dimension assessments.
    pub fn infer_from_assessments(
        concept_id: &str,
        assessments: &AssessmentBundle,
        unresolved_errors_count: u32,
        is_prerequisite_for_count: u32,
        now_ms: u64,
    ) -> Vec<Self> {
        let retention = assessments.retention;
        let comprehension = assessments.comprehension;
        let application = assessments.application;
        let synthesis = assessments.synthesis;

        let mut inferences = Vec::new();

        // Check if concept is untested
        let total_evidence = retention.evidence_count
            + comprehension.evidence_count
            + application.evidence_count
            + synthesis.evidence_count;

        if total_evidence == 0 {
            inferences.push(Self {
                id: format!("inf_untested_{concept_id}"),
                concept_id: concept_id.to_string(),
                diagnosis: CognitiveDiagnosis::UntestedConcept,
                severity: DiagnosisSeverity::Info,
                confidence: 1.0,
                rationale: "El concepto aún no cuenta con observaciones empíricas registradas en el sistema.".to_string(),
                generated_at_ms: now_ms,
            });
            return inferences;
        }

        // 1. Retention Decay Inference
        if !retention.is_baseline && retention.score < 0.75 {
            let severity = if retention.score < 0.50 {
                DiagnosisSeverity::Critical
            } else {
                DiagnosisSeverity::Warning
            };

            inferences.push(Self {
                id: format!("inf_decay_{concept_id}"),
                concept_id: concept_id.to_string(),
                diagnosis: CognitiveDiagnosis::RetentionDecaying {
                    retrievability: retention.score,
                },
                severity,
                confidence: retention.confidence,
                rationale: format!(
                    "Retención estimada en {:.0}%, por debajo del umbral de estabilidad óptimo (75%).",
                    retention.score * 100.0
                ),
                generated_at_ms: now_ms,
            });
        }

        // 2. Persistent Misconception Inference
        if unresolved_errors_count >= 2 || (comprehension.score < 0.60 && !comprehension.is_baseline) {
            let severity = if unresolved_errors_count >= 3 || comprehension.score < 0.40 {
                DiagnosisSeverity::Critical
            } else {
                DiagnosisSeverity::Warning
            };

            let confidence = (comprehension.confidence * 0.7 + (unresolved_errors_count as f32 * 0.15).min(0.3)).clamp(0.2, 1.0);

            inferences.push(Self {
                id: format!("inf_misconception_{concept_id}"),
                concept_id: concept_id.to_string(),
                diagnosis: CognitiveDiagnosis::PersistentMisconception {
                    unresolved_errors_count,
                },
                severity,
                confidence: (confidence * 100.0).round() / 100.0,
                rationale: format!(
                    "Detectadas lagunas conceptuales persistentes ({} error(es) pendientes y comprensión evaluada en {:.0}%).",
                    unresolved_errors_count,
                    comprehension.score * 100.0
                ),
                generated_at_ms: now_ms,
            });
        }

        // Calculate composite score for bottleneck & mastery checks
        let composite = (retention.score * 0.35
            + comprehension.score * 0.30
            + application.score * 0.20
            + synthesis.score * 0.15)
            * 100.0;
        let composite_int = composite.round() as u8;

        // 3. Prerequisite Bottleneck Inference
        if is_prerequisite_for_count >= 2 && composite_int < 70 {
            inferences.push(Self {
                id: format!("inf_bottleneck_{concept_id}"),
                concept_id: concept_id.to_string(),
                diagnosis: CognitiveDiagnosis::PrerequisiteBottleneck {
                    composite_score: composite_int,
                },
                severity: DiagnosisSeverity::Critical,
                confidence: ((retention.confidence + comprehension.confidence + application.confidence) / 3.0).clamp(0.2, 1.0),
                rationale: format!(
                    "Concepto fundacional con dominio insuficiente ({}%) que bloquea el avance en {} nodos dependientes.",
                    composite_int, is_prerequisite_for_count
                ),
                generated_at_ms: now_ms,
            });
        } else if composite_int >= 75 && total_evidence >= 2 {
            // 4. Sufficient Mastery Inference
            inferences.push(Self {
                id: format!("inf_mastery_{concept_id}"),
                concept_id: concept_id.to_string(),
                diagnosis: CognitiveDiagnosis::SufficientMastery {
                    composite_score: composite_int,
                },
                severity: DiagnosisSeverity::Info,
                confidence: ((retention.confidence + comprehension.confidence) / 2.0).clamp(0.3, 1.0),
                rationale: format!(
                    "El estudiante demuestra dominio robusto ({:.0}%) respaldado por {} observaciones empíricas.",
                    composite_int, total_evidence
                ),
                generated_at_ms: now_ms,
            });
        }

        inferences
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::learning_state::assessment::MasteryDimension;

    #[test]
    fn test_untested_concept_inference() {
        let baseline = DimensionAssessment {
            dimension: MasteryDimension::Retention,
            concept_id: "c_new".into(),
            evidence_ids: vec![],
            score: 0.5,
            evidence_count: 0,
            confidence: 0.0,
            is_baseline: true,
            evaluated_at_ms: 1000,
        };

        let bundle = AssessmentBundle {
            retention: &baseline,
            comprehension: &baseline,
            application: &baseline,
            synthesis: &baseline,
        };

        let infs = LearningInference::infer_from_assessments(
            "c_new", &bundle, 0, 0, 1000,
        );

        assert_eq!(infs.len(), 1);
        assert_eq!(infs[0].diagnosis, CognitiveDiagnosis::UntestedConcept);
        assert_eq!(infs[0].severity, DiagnosisSeverity::Info);
    }
}
