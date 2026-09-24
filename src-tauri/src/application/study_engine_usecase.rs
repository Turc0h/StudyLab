use crate::domain::errors::StudyLabError;
use crate::domain::study_engine::{
    calculate_time_budget_core, calculate_triage_core, generate_study_agenda_pure,
    plan_reverse_exam_core, DailyStudyAgenda, ExamPlanSummary, TimeBudgetPlan, TriageResult,
};
use crate::dtos::study_engine_dto::{
    CalculateCognitiveTriageRequest, CalculateTimeBudgetRequest, GenerateStudyAgendaRequest,
    PlanReverseExamRequest,
};

pub fn generate_study_agenda_usecase(
    req: GenerateStudyAgendaRequest,
) -> Result<DailyStudyAgenda, StudyLabError> {
    let now = req.now_ms.unwrap_or(0);
    let target_date = req.target_date.unwrap_or_else(|| "today".to_string());

    use crate::domain::study_engine::AgendaCalculationInput;
    Ok(generate_study_agenda_pure(AgendaCalculationInput {
        target_date,
        now_ms: now,
        total_due_cards: req.total_due_cards,
        due_card_concepts: req.due_card_concepts,
        gap_signals: req.gap_signals,
        bottleneck_signals: req.bottleneck_signals,
        exam_alerts: req.exam_alerts,
        total_concepts_registered: req.total_concepts_registered,
    }))
}

pub fn calculate_cognitive_triage_usecase(
    req: CalculateCognitiveTriageRequest,
) -> Result<TriageResult, StudyLabError> {
    Ok(calculate_triage_core(&req.answers))
}

pub fn plan_reverse_exam_usecase(
    req: PlanReverseExamRequest,
) -> Result<ExamPlanSummary, StudyLabError> {
    if req.subject_id.trim().is_empty() {
        return Err(StudyLabError::invalid_input(
            "subjectId",
            "El ID de la materia no puede estar vacío",
        ));
    }
    if req.subject_name.trim().is_empty() {
        return Err(StudyLabError::invalid_input(
            "subjectName",
            "El nombre de la materia no puede estar vacío",
        ));
    }
    let now = req.now_ms.unwrap_or(0);
    let available_minutes = req.available_minutes_per_day.unwrap_or(90);

    Ok(plan_reverse_exam_core(
        req.subject_id,
        req.subject_name,
        req.exam_date_ms,
        now,
        available_minutes,
    ))
}

pub fn calculate_time_budget_usecase(
    req: CalculateTimeBudgetRequest,
) -> Result<TimeBudgetPlan, StudyLabError> {
    if req.budget_minutes == 0 {
        return Err(StudyLabError::invalid_input(
            "budgetMinutes",
            "El presupuesto de tiempo debe ser mayor a cero",
        ));
    }

    Ok(calculate_time_budget_core(
        req.budget_minutes,
        req.urgent_cards_count,
        req.top_concept_name,
        req.primary_gap_concept_name,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::study_engine::{TriageAnswers, TriageEnergy, TriageMastery, TriageMaterial, TriageUrgency};

    #[test]
    fn test_agenda_usecase() {
        let req = GenerateStudyAgendaRequest {
            target_date: Some("2026-09-24".to_string()),
            now_ms: Some(1000),
            total_due_cards: 5,
            due_card_concepts: vec![],
            gap_signals: vec![],
            bottleneck_signals: vec![],
            exam_alerts: vec![],
            total_concepts_registered: 3,
        };

        let res = generate_study_agenda_usecase(req).expect("Agenda generation failed");
        assert_eq!(res.urgent_reviews.card_count, 5);
        assert_eq!(res.total_debt_minutes, 5);
    }

    #[test]
    fn test_triage_usecase() {
        let req = CalculateCognitiveTriageRequest {
            answers: TriageAnswers {
                urgency: TriageUrgency::Urgent,
                material: TriageMaterial::Logical,
                mastery: TriageMastery::Advanced,
                energy: TriageEnergy::High,
            },
        };

        let res = calculate_cognitive_triage_usecase(req).expect("Triage failed");
        assert_eq!(res.top_matches.len(), 3);
    }

    #[test]
    fn test_plan_reverse_exam_validation() {
        let req = PlanReverseExamRequest {
            subject_id: "".to_string(),
            subject_name: "Álgebra".to_string(),
            exam_date_ms: 50000,
            now_ms: Some(1000),
            available_minutes_per_day: Some(90),
        };

        let err = plan_reverse_exam_usecase(req).unwrap_err();
        assert_eq!(err.error_code(), "INVALID_INPUT");
    }

    #[test]
    fn test_time_budget_validation() {
        let req = CalculateTimeBudgetRequest {
            budget_minutes: 0,
            urgent_cards_count: 5,
            top_concept_name: None,
            primary_gap_concept_name: None,
        };

        let err = calculate_time_budget_usecase(req).unwrap_err();
        assert_eq!(err.error_code(), "INVALID_INPUT");
    }
}
