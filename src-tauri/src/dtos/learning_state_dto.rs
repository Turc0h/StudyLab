use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ObservationDto {
    CardReview {
        card_id: String,
        rating: u8,
        latency_ms: u32,
        elapsed_days: f32,
        stability: f32,
    },
    AcademicEvaluation {
        evaluation_id: String,
        mastery_score: f32,
        omissions_count: u32,
        contradictions_count: u32,
    },
    StudentError {
        error_id: String,
        repetition_count: u32,
        resolved: bool,
        category: String,
    },
    GraphConnection {
        connected_concept_id: String,
        is_prerequisite: bool,
    },
    MathDerivationStep {
        is_correct: bool,
        score: f32,
        token_ratio: f32,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceDto {
    pub id: String,
    pub concept_id: String,
    pub timestamp_ms: u64,
    pub observation: ObservationDto,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputeLearningStateRequest {
    pub concept_id: String,
    pub concept_name: String,
    pub evidences: Vec<EvidenceDto>,
    pub unresolved_errors_count: u32,
    pub is_prerequisite_for_count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DimensionMetricDto {
    pub value: f32,
    pub confidence: f32,
    pub evidence_count: u32,
    pub is_baseline: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceDto {
    pub id: String,
    pub concept_id: String,
    pub diagnosis_type: String,
    pub severity: String,
    pub confidence: f32,
    pub rationale: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationDto {
    pub id: String,
    pub concept_id: String,
    pub strategy: String,
    pub priority: String,
    pub rationale: String,
    pub estimated_minutes: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDto {
    pub id: String,
    pub recommendation_id: String,
    pub concept_id: String,
    pub action_type: String,
    pub suggested_method: String,
    pub duration_minutes: u32,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningStateResponse {
    pub concept_id: String,
    pub concept_name: String,
    pub retention: DimensionMetricDto,
    pub comprehension: DimensionMetricDto,
    pub application: DimensionMetricDto,
    pub synthesis: DimensionMetricDto,
    pub composite_score: u8,
    pub overall_confidence: f32,
    pub evidence_count: u32,
    pub evidence_details: Vec<String>,
    pub inferences: Vec<InferenceDto>,
    pub recommendations: Vec<RecommendationDto>,
    pub suggested_actions: Vec<ActionDto>,
    pub evaluated_at_ms: u64,
}
