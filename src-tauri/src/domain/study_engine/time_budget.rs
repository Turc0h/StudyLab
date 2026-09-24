use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeBudgetStep {
    pub id: String,
    pub step_type: String, // "fsrs_review" | "feynman_gap" | "rag_audit" | "exam_simulation"
    pub title: String,
    pub description: String,
    pub allocated_minutes: u32,
    pub action_url: String,
    pub action_label: String,
    pub badge: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeBudgetPlan {
    pub total_minutes: u32,
    pub headline: String,
    pub steps: Vec<TimeBudgetStep>,
    pub target_focus: String,
}

pub fn calculate_time_budget_core(
    budget_minutes: u32,
    urgent_cards_count: u32,
    top_concept_name: Option<String>,
    primary_gap_concept_name: Option<String>,
) -> TimeBudgetPlan {
    let top_concept = top_concept_name.unwrap_or_else(|| "temas troncales".to_string());
    let mut steps = Vec::new();
    let mut remaining = budget_minutes;

    if budget_minutes <= 25 {
        if urgent_cards_count > 0 {
            let fsrs_mins = remaining.min(5.max(10.min(urgent_cards_count)));
            steps.push(TimeBudgetStep {
                id: "step_fsrs_short".to_string(),
                step_type: "fsrs_review".to_string(),
                title: format!("Repaso Relámpago FSRS ({} min)", fsrs_mins),
                description: format!(
                    "Consolidar las {} tarjetas más críticas de {} antes de que caiga la curva de olvido.",
                    (fsrs_mins * 2).min(urgent_cards_count), top_concept
                ),
                allocated_minutes: fsrs_mins,
                action_url: "/methods".to_string(),
                action_label: "Iniciar Repaso".to_string(),
                badge: "Memoria".to_string(),
            });
            remaining = remaining.saturating_sub(fsrs_mins);
        }

        if remaining >= 8 {
            if let Some(gap_name) = primary_gap_concept_name {
                steps.push(TimeBudgetStep {
                    id: "step_gap_short".to_string(),
                    step_type: "feynman_gap".to_string(),
                    title: format!("Desarmar \"{}\" ({} min)", gap_name, remaining),
                    description: "Explicación sintética de 1 carilla en técnica Feynman para resolver la premisa errónea registrada en el Error Bank.".to_string(),
                    allocated_minutes: remaining,
                    action_url: "/session".to_string(),
                    action_label: "Abrir Feynman".to_string(),
                    badge: "Laguna Crítica".to_string(),
                });
            } else {
                steps.push(TimeBudgetStep {
                    id: "step_rag_short".to_string(),
                    step_type: "rag_audit".to_string(),
                    title: format!("Auditoría RAG Exprés ({} min)", remaining),
                    description: "Lectura activa de 2 páginas de apuntes en el visor con Catedrático Socrático.".to_string(),
                    allocated_minutes: remaining,
                    action_url: "/workspace".to_string(),
                    action_label: "Ir al Visor".to_string(),
                    badge: "Lectura".to_string(),
                });
            }
        } else if remaining > 0 {
            steps.push(TimeBudgetStep {
                id: "step_rag_short".to_string(),
                step_type: "rag_audit".to_string(),
                title: format!("Auditoría RAG Exprés ({} min)", remaining),
                description: "Lectura activa de 2 páginas de apuntes en el visor con Catedrático Socrático.".to_string(),
                allocated_minutes: remaining,
                action_url: "/workspace".to_string(),
                action_label: "Ir al Visor".to_string(),
                badge: "Lectura".to_string(),
            });
        }

        TimeBudgetPlan {
            total_minutes: budget_minutes,
            headline: format!("Micro-sesión Relámpago de {} min", budget_minutes),
            steps,
            target_focus: "Frenar el olvido de tarjetas vencidas y reparar la premisa más urgente.".to_string(),
        }
    } else if budget_minutes <= 55 {
        let fsrs_mins = if urgent_cards_count > 0 {
            15.min(8.max(urgent_cards_count))
        } else {
            8
        };
        steps.push(TimeBudgetStep {
            id: "step_fsrs_med".to_string(),
            step_type: "fsrs_review".to_string(),
            title: format!("Bloque de Consolidación FSRS ({} min)", fsrs_mins),
            description: format!("Limpieza del mazo espaciado para mantener retención > 85% en {}.", top_concept),
            allocated_minutes: fsrs_mins,
            action_url: "/methods".to_string(),
            action_label: "Repasar FSRS".to_string(),
            badge: "Retención".to_string(),
        });
        remaining = remaining.saturating_sub(fsrs_mins);

        let gap_mins = 20.min(remaining);
        if let Some(gap_name) = primary_gap_concept_name {
            steps.push(TimeBudgetStep {
                id: "step_gap_med".to_string(),
                step_type: "feynman_gap".to_string(),
                title: format!("Desarme Conceptual: \"{}\" ({} min)", gap_name, gap_mins),
                description: "Redactar desarrollo formal en palabras propias y cotejar discrepancias contra la fuente oficial.".to_string(),
                allocated_minutes: gap_mins,
                action_url: "/session".to_string(),
                action_label: "Técnica Feynman".to_string(),
                badge: "Comprensión".to_string(),
            });
        } else {
            steps.push(TimeBudgetStep {
                id: "step_rag_med".to_string(),
                step_type: "rag_audit".to_string(),
                title: format!("Lectura Socrática y Apuntes ({} min)", gap_mins),
                description: "Avanzar en el texto de cátedra con extracción de teoremas y cloze directo.".to_string(),
                allocated_minutes: gap_mins,
                action_url: "/workspace".to_string(),
                action_label: "Abrir Cátedra".to_string(),
                badge: "Teoría".to_string(),
            });
        }
        remaining = remaining.saturating_sub(gap_mins);

        if remaining > 0 {
            steps.push(TimeBudgetStep {
                id: "step_exam_med".to_string(),
                step_type: "exam_simulation".to_string(),
                title: format!("Problemas de Aplicación / Simulacro ({} min)", remaining),
                description: "Poner a prueba el razonamiento formal en 1 o 2 ejercicios cronometrados sin mirar fórmulas.".to_string(),
                allocated_minutes: remaining,
                action_url: "/workspace".to_string(),
                action_label: "Ejercitar".to_string(),
                badge: "Aplicación".to_string(),
            });
        }

        TimeBudgetPlan {
            total_minutes: budget_minutes,
            headline: format!("Sesión Equilibrada de {} min", budget_minutes),
            steps,
            target_focus: "Equilibrio entre retención espaciada, comprensión formal y resolución práctica.".to_string(),
        }
    } else {
        let fsrs_mins = if urgent_cards_count > 0 {
            20.min(12.max(urgent_cards_count))
        } else {
            12
        };
        steps.push(TimeBudgetStep {
            id: "step_fsrs_long".to_string(),
            step_type: "fsrs_review".to_string(),
            title: format!("Fase 1: Vaciado Integral FSRS ({} min)", fsrs_mins),
            description: "Limpieza completa de tarjetas vencidas en todas las cátedras cursadas.".to_string(),
            allocated_minutes: fsrs_mins,
            action_url: "/methods".to_string(),
            action_label: "Repasar FSRS".to_string(),
            badge: "Memoria".to_string(),
        });
        remaining = remaining.saturating_sub(fsrs_mins);

        let gap_mins = 25;
        let gap_desc = if let Some(ref gap_name) = primary_gap_concept_name {
            format!("Desarmar \"{}\" y auditar hipótesis con el Catedrático Socrático.", gap_name)
        } else {
            "Revisión de teoremas troncales y derivaciones algebraicas complejas.".to_string()
        };
        steps.push(TimeBudgetStep {
            id: "step_gap_long".to_string(),
            step_type: "feynman_gap".to_string(),
            title: format!("Fase 2: Resolución de Lagunas y Error Bank ({} min)", gap_mins),
            description: gap_desc,
            allocated_minutes: gap_mins,
            action_url: "/session".to_string(),
            action_label: "Abrir Feynman".to_string(),
            badge: "Rigor Formal".to_string(),
        });
        remaining = remaining.saturating_sub(gap_mins);

        let exam_mins = 30;
        steps.push(TimeBudgetStep {
            id: "step_exam_long".to_string(),
            step_type: "exam_simulation".to_string(),
            title: format!("Fase 3: Simulacro Cronometrado en Modo Examen ({} min)", exam_mins),
            description: "Simular condiciones reales de parcial sin pistas, auditar resultado y registrar discrepancias.".to_string(),
            allocated_minutes: exam_mins,
            action_url: "/workspace".to_string(),
            action_label: "Simular Parcial".to_string(),
            badge: "Simulacro".to_string(),
        });
        remaining = remaining.saturating_sub(exam_mins);

        if remaining > 0 {
            steps.push(TimeBudgetStep {
                id: "step_polish_long".to_string(),
                step_type: "rag_audit".to_string(),
                title: format!("Fase 4: Consolidación y Síntesis en Grafo ({} min)", remaining),
                description: "Vincular los conceptos ejercitados al Grafo Causal y programar la próxima sesión.".to_string(),
                allocated_minutes: remaining,
                action_url: "/knowledge-graph".to_string(),
                action_label: "Ver Grafo".to_string(),
                badge: "Transferencia".to_string(),
            });
        }

        TimeBudgetPlan {
            total_minutes: budget_minutes,
            headline: format!("Bloque Profundo de Estudio ({} min)", budget_minutes),
            steps,
            target_focus: "Ciclo cognitivo completo: Memoria -> Comprensión profunda -> Simulacro real -> Transferencia en Grafo.".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_short_budget() {
        let plan = calculate_time_budget_core(20, 5, Some("Límites".to_string()), Some("Continuidad".to_string()));
        assert_eq!(plan.total_minutes, 20);
        assert!(!plan.steps.is_empty());
        let total_allocated: u32 = plan.steps.iter().map(|s| s.allocated_minutes).sum();
        assert_eq!(total_allocated, 20);
    }

    #[test]
    fn test_medium_budget() {
        let plan = calculate_time_budget_core(45, 10, Some("Cálculo".to_string()), None);
        assert_eq!(plan.total_minutes, 45);
        assert!(plan.steps.len() >= 2);
    }

    #[test]
    fn test_long_budget() {
        let plan = calculate_time_budget_core(90, 15, Some("Álgebra".to_string()), Some("Matrices".to_string()));
        assert_eq!(plan.total_minutes, 90);
        assert_eq!(plan.steps.len(), 4);
    }
}
