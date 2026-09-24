use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UrgentReviewsSummary {
    pub card_count: u32,
    pub estimated_minutes: u32,
    pub concept_ids: Vec<String>,
    pub top_concept_names: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConceptualGapItem {
    pub concept_id: String,
    pub concept_name: String,
    pub reason: String,
    pub suggested_action: String,
    pub estimated_minutes: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BottleneckPrerequisiteItem {
    pub concept_id: String,
    pub concept_name: String,
    pub blocked_downstream_count: u32,
    pub blocked_concept_names: Vec<String>,
    pub estimated_minutes: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamAlertItem {
    pub subject_name: String,
    pub days_remaining: u32,
    pub current_phase: String,
    pub recommended_focus: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStudyAgenda {
    pub target_date: String,
    pub headline: String,
    pub rationale: String,
    pub total_debt_minutes: u32,
    pub urgent_reviews: UrgentReviewsSummary,
    pub conceptual_gaps: Vec<ConceptualGapItem>,
    pub bottleneck_prerequisites: Vec<BottleneckPrerequisiteItem>,
    pub exam_alerts: Vec<ExamAlertItem>,
    pub generated_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DueCardConceptInput {
    pub concept_id: String,
    pub concept_name: String,
    pub count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GapSignalInput {
    pub concept_id: String,
    pub concept_name: String,
    pub gap_type: String, // "persistent_misconception" | "retention_decay"
    pub explanation: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BottleneckSignalInput {
    pub concept_id: String,
    pub concept_name: String,
    pub blocked_downstream_count: u32,
    pub blocked_concept_names: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgendaCalculationInput {
    pub target_date: String,
    pub now_ms: u64,
    pub total_due_cards: u32,
    pub due_card_concepts: Vec<DueCardConceptInput>,
    pub gap_signals: Vec<GapSignalInput>,
    pub bottleneck_signals: Vec<BottleneckSignalInput>,
    pub exam_alerts: Vec<ExamAlertItem>,
    pub total_concepts_registered: u32,
}

pub fn generate_study_agenda_pure(input: AgendaCalculationInput) -> DailyStudyAgenda {
    let AgendaCalculationInput {
        target_date,
        now_ms,
        total_due_cards,
        due_card_concepts,
        gap_signals,
        bottleneck_signals,
        exam_alerts,
        total_concepts_registered,
    } = input;

    // 1. Repasos urgentes FSRS (1 min por tarjeta)
    let urgent_minutes = total_due_cards; // 1 min por tarjeta
    let mut sorted_concepts = due_card_concepts;
    sorted_concepts.sort_by_key(|a| std::cmp::Reverse(a.count));

    let top_concept_ids: Vec<String> = sorted_concepts
        .iter()
        .take(3)
        .map(|c| c.concept_id.clone())
        .collect();

    let top_concept_names: Vec<String> = sorted_concepts
        .iter()
        .take(3)
        .map(|c| c.concept_name.clone())
        .collect();

    let urgent_reviews = UrgentReviewsSummary {
        card_count: total_due_cards,
        estimated_minutes: urgent_minutes,
        concept_ids: top_concept_ids,
        top_concept_names: top_concept_names.clone(),
    };

    // 2. Lagunas conceptuales críticas (hasta 3)
    let mut conceptual_gaps = Vec::new();
    for sig in gap_signals.into_iter().take(3) {
        let is_misconception = sig.gap_type == "persistent_misconception";
        conceptual_gaps.push(ConceptualGapItem {
            concept_id: sig.concept_id,
            concept_name: sig.concept_name,
            reason: sig.explanation,
            suggested_action: if is_misconception {
                "feynman".to_string()
            } else {
                "socratic_audit".to_string()
            },
            estimated_minutes: if is_misconception { 20 } else { 15 },
        });
    }

    // 3. Cuellos de botella en prerrequisitos (hasta 2)
    let mut bottleneck_prerequisites = Vec::new();
    for b in bottleneck_signals.into_iter().take(2) {
        bottleneck_prerequisites.push(BottleneckPrerequisiteItem {
            concept_id: b.concept_id,
            concept_name: b.concept_name,
            blocked_downstream_count: b.blocked_downstream_count,
            blocked_concept_names: b.blocked_concept_names,
            estimated_minutes: 25,
        });
    }

    // 4. Deuda cognitiva total
    let gap_minutes: u32 = conceptual_gaps.iter().map(|g| g.estimated_minutes).sum();
    let bottleneck_minutes: u32 = bottleneck_prerequisites.iter().map(|b| b.estimated_minutes).sum();
    let total_debt_minutes = urgent_minutes + gap_minutes + bottleneck_minutes;

    // 5. Síntesis Argumentativa ("¿Qué debería estudiar hoy y por qué?")
    let (headline, rationale) = if total_due_cards > 0 && !conceptual_gaps.is_empty() {
        let first_gap = &conceptual_gaps[0];
        let joined_names = if top_concept_names.is_empty() {
            "temas troncales".to_string()
        } else {
            top_concept_names.join(", ")
        };
        (
            format!(
                "Repasar {} tarjeta(s) vencidas y desarmar la laguna en \"{}\"",
                total_due_cards, first_gap.concept_name
            ),
            format!(
                "Tu curva de retención FSRS indica riesgo de olvido inminente en {} ({} min). Además, registraste errores reiterados en \"{}\" que requieren una explicación Feynman breve ({} min). Deuda total acumulada: {} min.",
                joined_names, urgent_minutes, first_gap.concept_name, first_gap.estimated_minutes, total_debt_minutes
            ),
        )
    } else if total_due_cards > 0 {
        (
            format!(
                "Consolidar memoria: {} tarjeta(s) espaciadas pendientes",
                total_due_cards
            ),
            format!(
                "No presentas lagunas conceptuales críticas abiertas. Dedica {} minutos a limpiar el mazo para preservar la estabilidad de memoria a largo plazo.",
                urgent_minutes
            ),
        )
    } else if !bottleneck_prerequisites.is_empty() {
        let first_bottle = &bottleneck_prerequisites[0];
        (
            format!(
                "Desbloquear cuello de botella: \"{}\"",
                first_bottle.concept_name
            ),
            format!(
                "Este concepto fundacional tiene dominio bajo y está frenando tu comprensión de {}. Dedica 25 minutos a auditar sus teoremas en el RAG.",
                first_bottle.blocked_concept_names.join(", ")
            ),
        )
    } else if total_concepts_registered > 0 {
        (
            "Todo al día. Momento ideal para avanzar materia o simular un examen".to_string(),
            "Tu retención se encuentra en zona segura (>85%) y no hay deudas de estudio urgentes. Puedes avanzar con nuevas lecturas o poner a prueba tu dominio con un simulacro exprés.".to_string(),
        )
    } else {
        (
            "Carga tus primeros apuntes de cátedra en el visor".to_string(),
            "El Cognitive OS necesita material bibliográfico para indexar conceptos, extraer teoremas y comenzar a calcular tu mapa de dominio 4D.".to_string(),
        )
    };

    DailyStudyAgenda {
        target_date,
        headline,
        rationale,
        total_debt_minutes,
        urgent_reviews,
        conceptual_gaps,
        bottleneck_prerequisites,
        exam_alerts,
        generated_at_ms: now_ms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agenda_with_cards_and_gaps() {
        let agenda = generate_study_agenda_pure(AgendaCalculationInput {
            target_date: "2026-09-24".to_string(),
            now_ms: 1000,
            total_due_cards: 12,
            due_card_concepts: vec![DueCardConceptInput {
                concept_id: "c1".to_string(),
                concept_name: "Álgebra".to_string(),
                count: 12,
            }],
            gap_signals: vec![GapSignalInput {
                concept_id: "c2".to_string(),
                concept_name: "Cálculo Integral".to_string(),
                gap_type: "persistent_misconception".to_string(),
                explanation: "Error en Barrow".to_string(),
            }],
            bottleneck_signals: vec![],
            exam_alerts: vec![],
            total_concepts_registered: 5,
        });

        assert_eq!(agenda.urgent_reviews.card_count, 12);
        assert_eq!(agenda.conceptual_gaps.len(), 1);
        assert_eq!(agenda.total_debt_minutes, 12 + 20);
        assert!(agenda.headline.contains("Repasar 12 tarjeta(s) vencidas"));
        assert!(agenda.rationale.contains("Deuda total acumulada: 32 min"));
    }

    #[test]
    fn test_agenda_clean_slate_with_registered_concepts() {
        let agenda = generate_study_agenda_pure(AgendaCalculationInput {
            target_date: "2026-09-24".to_string(),
            now_ms: 1000,
            total_due_cards: 0,
            due_card_concepts: vec![],
            gap_signals: vec![],
            bottleneck_signals: vec![],
            exam_alerts: vec![],
            total_concepts_registered: 10,
        });

        assert_eq!(agenda.total_debt_minutes, 0);
        assert_eq!(agenda.headline, "Todo al día. Momento ideal para avanzar materia o simular un examen");
    }

    #[test]
    fn test_agenda_empty_repository() {
        let agenda = generate_study_agenda_pure(AgendaCalculationInput {
            target_date: "2026-09-24".to_string(),
            now_ms: 1000,
            total_due_cards: 0,
            due_card_concepts: vec![],
            gap_signals: vec![],
            bottleneck_signals: vec![],
            exam_alerts: vec![],
            total_concepts_registered: 0,
        });

        assert_eq!(agenda.headline, "Carga tus primeros apuntes de cátedra en el visor");
    }
}
