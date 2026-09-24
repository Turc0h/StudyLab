use serde::{Deserialize, Serialize};
use crate::domain::study_engine::{
    BottleneckSignalInput, DueCardConceptInput, ExamAlertItem, GapSignalInput, TriageAnswers,
};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateStudyAgendaRequest {
    pub target_date: Option<String>,
    pub now_ms: Option<u64>,
    pub total_due_cards: u32,
    pub due_card_concepts: Vec<DueCardConceptInput>,
    pub gap_signals: Vec<GapSignalInput>,
    pub bottleneck_signals: Vec<BottleneckSignalInput>,
    pub exam_alerts: Vec<ExamAlertItem>,
    pub total_concepts_registered: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalculateCognitiveTriageRequest {
    pub answers: TriageAnswers,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanReverseExamRequest {
    pub subject_id: String,
    pub subject_name: String,
    pub exam_date_ms: u64,
    pub now_ms: Option<u64>,
    pub available_minutes_per_day: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalculateTimeBudgetRequest {
    pub budget_minutes: u32,
    pub urgent_cards_count: u32,
    pub top_concept_name: Option<String>,
    pub primary_gap_concept_name: Option<String>,
}
