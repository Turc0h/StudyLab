use super::*;
use serde_json::Value;

const FIXTURES_JSON: &str = include_str!("../../../../scripts/fixtures/study-engine-cases.json");

#[test]
fn test_study_engine_fixtures_parity_triage() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fixtures JSON");
    let triage_cases = json["triageCases"]
        .as_array()
        .expect("triageCases must be an array");

    for (idx, tc) in triage_cases.iter().enumerate() {
        let input_val = &tc["input"];
        let expected_val = &tc["expected"];

        let urgency = match input_val["urgency"].as_str().unwrap() {
            "urgent" => TriageUrgency::Urgent,
            "medium" => TriageUrgency::Medium,
            "long" => TriageUrgency::Long,
            other => panic!("Unknown urgency: {}", other),
        };
        let material = match input_val["material"].as_str().unwrap() {
            "logical" => TriageMaterial::Logical,
            "factual" => TriageMaterial::Factual,
            "doctrinal" => TriageMaterial::Doctrinal,
            "multimodal" => TriageMaterial::Multimodal,
            other => panic!("Unknown material: {}", other),
        };
        let mastery = match input_val["mastery"].as_str().unwrap() {
            "initial" => TriageMastery::Initial,
            "intermediate" => TriageMastery::Intermediate,
            "advanced" => TriageMastery::Advanced,
            other => panic!("Unknown mastery: {}", other),
        };
        let energy = match input_val["energy"].as_str().unwrap() {
            "high" => TriageEnergy::High,
            "medium" => TriageEnergy::Medium,
            "low" => TriageEnergy::Low,
            other => panic!("Unknown energy: {}", other),
        };

        let answers = TriageAnswers {
            urgency,
            material,
            mastery,
            energy,
        };

        let result = calculate_triage_core(&answers);

        // Validar Top 3
        let expected_top = expected_val["topMatches"].as_array().unwrap();
        assert_eq!(
            result.top_matches.len(),
            expected_top.len(),
            "Caso Triage #{}: cantidad de top matches",
            idx
        );

        for (m_idx, exp_m) in expected_top.iter().enumerate() {
            let actual_m = &result.top_matches[m_idx];
            let exp_method_id = exp_m["methodId"].as_str().unwrap();
            let exp_score = exp_m["score"].as_i64().unwrap() as i32;
            let exp_match_pct = exp_m["matchPercentage"].as_i64().unwrap() as u32;

            assert_eq!(
                actual_m.method_id, exp_method_id,
                "Caso Triage #{}, Match #{}: method_id",
                idx, m_idx
            );
            assert_eq!(
                actual_m.score, exp_score,
                "Caso Triage #{}, Match #{}: score",
                idx, m_idx
            );
            assert_eq!(
                actual_m.match_percentage, exp_match_pct,
                "Caso Triage #{}, Match #{}: match_percentage",
                idx, m_idx
            );
        }

        // Validar cautionAlert
        let exp_alert = expected_val["cautionAlert"].as_str();
        assert_eq!(
            result.caution_alert.as_deref(),
            exp_alert,
            "Caso Triage #{}: caution_alert",
            idx
        );
    }
}

#[test]
fn test_study_engine_fixtures_parity_exam_planner() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fixtures JSON");
    let exam_cases = json["examPlannerCases"]
        .as_array()
        .expect("examPlannerCases must be an array");

    for (idx, ec) in exam_cases.iter().enumerate() {
        let scenario = ec["scenario"].as_str().unwrap();
        let input_val = &ec["input"];
        let expected_val = &ec["expected"];

        let exam_date_ms = input_val["examDateMs"].as_u64().unwrap();
        let now_ms = input_val["nowMs"].as_u64().unwrap();
        let available_minutes = input_val["availableMinutesPerDay"].as_u64().unwrap() as u32;
        let subject_id = input_val["subjectId"].as_str().unwrap().to_string();
        let subject_name = input_val["subjectName"].as_str().unwrap().to_string();

        let plan = plan_reverse_exam_core(
            subject_id,
            subject_name,
            exam_date_ms,
            now_ms,
            available_minutes,
        );

        let exp_total_days = expected_val["totalDays"].as_u64().unwrap() as u32;
        assert_eq!(
            plan.total_days, exp_total_days,
            "Caso ExamPlanner #{} [{}]: total_days",
            idx, scenario
        );

        let exp_phases = expected_val["phases"].as_array().unwrap();
        assert_eq!(
            plan.phases.len(),
            exp_phases.len(),
            "Caso ExamPlanner #{} [{}]: phases len",
            idx, scenario
        );

        for (p_idx, exp_p) in exp_phases.iter().enumerate() {
            let actual_p = &plan.phases[p_idx];
            assert_eq!(
                actual_p.name,
                exp_p["name"].as_str().unwrap(),
                "Caso ExamPlanner #{} [{}], Fase #{}: name",
                idx,
                scenario,
                p_idx
            );
            assert_eq!(
                actual_p.start_day_offset,
                exp_p["startDayOffset"].as_u64().unwrap() as u32,
                "Caso ExamPlanner #{} [{}], Fase #{}: startDayOffset",
                idx,
                scenario,
                p_idx
            );
            assert_eq!(
                actual_p.end_day_offset,
                exp_p["endDayOffset"].as_u64().unwrap() as u32,
                "Caso ExamPlanner #{} [{}], Fase #{}: endDayOffset",
                idx,
                scenario,
                p_idx
            );
        }
    }
}

#[test]
fn test_study_engine_fixtures_parity_time_budget() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fixtures JSON");
    let budget_cases = json["timeBudgetCases"]
        .as_array()
        .expect("timeBudgetCases must be an array");

    for (idx, bc) in budget_cases.iter().enumerate() {
        let scenario = bc["scenario"].as_str().unwrap();
        let input_val = &bc["input"];
        let expected_val = &bc["expected"];

        let budget_minutes = input_val["budgetMinutes"].as_u64().unwrap() as u32;
        let urgent_cards = input_val["urgentCardsCount"].as_u64().unwrap() as u32;
        let top_concept = input_val["topConceptName"].as_str().map(|s| s.to_string());
        let primary_gap = input_val["primaryGapConceptName"]
            .as_str()
            .map(|s| s.to_string());

        let plan = calculate_time_budget_core(
            budget_minutes,
            urgent_cards,
            top_concept,
            primary_gap,
        );

        let exp_total_minutes = expected_val["totalMinutes"].as_u64().unwrap() as u32;
        assert_eq!(
            plan.total_minutes, exp_total_minutes,
            "Caso TimeBudget #{} [{}]: totalMinutes",
            idx, scenario
        );

        let exp_steps = expected_val["steps"].as_array().unwrap();
        assert_eq!(
            plan.steps.len(),
            exp_steps.len(),
            "Caso TimeBudget #{} [{}]: steps len",
            idx, scenario
        );

        for (s_idx, exp_s) in exp_steps.iter().enumerate() {
            let actual_s = &plan.steps[s_idx];
            assert_eq!(
                actual_s.step_type,
                exp_s["stepType"].as_str().unwrap(),
                "Caso TimeBudget #{} [{}], Step #{}: step_type",
                idx,
                scenario,
                s_idx
            );
            assert_eq!(
                actual_s.allocated_minutes,
                exp_s["allocatedMinutes"].as_u64().unwrap() as u32,
                "Caso TimeBudget #{} [{}], Step #{}: allocated_minutes",
                idx,
                scenario,
                s_idx
            );
        }
    }
}

#[test]
fn test_study_engine_fixtures_parity_agenda() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fixtures JSON");
    let agenda_cases = json["agendaCases"]
        .as_array()
        .expect("agendaCases must be an array");

    for (idx, ac) in agenda_cases.iter().enumerate() {
        let scenario = ac["scenario"].as_str().unwrap();
        let input_val = &ac["input"];
        let expected_val = &ac["expected"];

        let total_due_cards = input_val["totalDueCards"].as_u64().unwrap() as u32;
        let top_concept_names: Vec<String> = input_val["topConceptNames"]
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();

        let due_card_concepts: Vec<DueCardConceptInput> = top_concept_names
            .iter()
            .map(|name| DueCardConceptInput {
                concept_id: name.clone(),
                concept_name: name.clone(),
                count: total_due_cards,
            })
            .collect();

        let gap_signals: Vec<GapSignalInput> = input_val["gapSignals"]
            .as_array()
            .unwrap()
            .iter()
            .map(|g| GapSignalInput {
                concept_id: g["conceptId"].as_str().unwrap().to_string(),
                concept_name: g["conceptName"].as_str().unwrap().to_string(),
                gap_type: g["gapType"].as_str().unwrap().to_string(),
                explanation: g["explanation"].as_str().unwrap().to_string(),
            })
            .collect();

        let bottleneck_signals: Vec<BottleneckSignalInput> = input_val["bottleneckSignals"]
            .as_array()
            .unwrap()
            .iter()
            .map(|b| BottleneckSignalInput {
                concept_id: b["conceptId"].as_str().unwrap().to_string(),
                concept_name: b["conceptName"].as_str().unwrap().to_string(),
                blocked_downstream_count: b["blockedDownstreamCount"].as_u64().unwrap() as u32,
                blocked_concept_names: b["blockedConceptNames"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect(),
            })
            .collect();

        let total_concepts_registered =
            input_val["totalConceptsRegistered"].as_u64().unwrap() as u32;

        let agenda = generate_study_agenda_pure(AgendaCalculationInput {
            target_date: "2026-09-24".to_string(),
            now_ms: 1000,
            total_due_cards,
            due_card_concepts,
            gap_signals,
            bottleneck_signals,
            exam_alerts: vec![],
            total_concepts_registered,
        });

        let exp_debt = expected_val["totalDebtMinutes"].as_u64().unwrap() as u32;
        assert_eq!(
            agenda.total_debt_minutes, exp_debt,
            "Caso Agenda #{} [{}]: totalDebtMinutes",
            idx, scenario
        );

        assert_eq!(
            agenda.headline,
            expected_val["headline"].as_str().unwrap(),
            "Caso Agenda #{} [{}]: headline",
            idx,
            scenario
        );
    }
}
