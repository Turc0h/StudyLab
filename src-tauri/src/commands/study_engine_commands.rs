use crate::application::study_engine_usecase::{
    calculate_cognitive_triage_usecase, calculate_time_budget_usecase, generate_study_agenda_usecase,
    plan_reverse_exam_usecase,
};
use crate::domain::errors::StudyLabError;
use crate::domain::study_engine::{DailyStudyAgenda, ExamPlanSummary, TimeBudgetPlan, TriageResult};
use crate::dtos::study_engine_dto::{
    CalculateCognitiveTriageRequest, CalculateTimeBudgetRequest, GenerateStudyAgendaRequest,
    PlanReverseExamRequest,
};

#[tauri::command]
pub fn generate_study_agenda(
    request: GenerateStudyAgendaRequest,
) -> Result<DailyStudyAgenda, StudyLabError> {
    generate_study_agenda_usecase(request)
}

#[tauri::command]
pub fn calculate_cognitive_triage(
    request: CalculateCognitiveTriageRequest,
) -> Result<TriageResult, StudyLabError> {
    calculate_cognitive_triage_usecase(request)
}

#[tauri::command]
pub fn plan_reverse_exam(
    request: PlanReverseExamRequest,
) -> Result<ExamPlanSummary, StudyLabError> {
    plan_reverse_exam_usecase(request)
}

#[tauri::command]
pub fn calculate_time_budget(
    request: CalculateTimeBudgetRequest,
) -> Result<TimeBudgetPlan, StudyLabError> {
    calculate_time_budget_usecase(request)
}
