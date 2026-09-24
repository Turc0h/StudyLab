use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamPhaseMilestone {
    pub name: String,
    pub description: String,
    pub start_day_offset: u32,
    pub end_day_offset: u32,
    pub target_milestone: String,
    pub completed: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamPlanSummary {
    pub subject_id: String,
    pub subject_name: String,
    pub exam_date_ms: u64,
    pub available_minutes_per_day: u32,
    pub total_days: u32,
    pub phases: Vec<ExamPhaseMilestone>,
    pub status: String,
    pub created_at_ms: u64,
}

pub fn plan_reverse_exam_core(
    subject_id: String,
    subject_name: String,
    exam_date_ms: u64,
    now_ms: u64,
    available_minutes_per_day: u32,
) -> ExamPlanSummary {
    let diff_ms = exam_date_ms.saturating_sub(now_ms);
    let ms_per_day = 1000 * 60 * 60 * 24;
    let raw_days = ((diff_ms as f64) / (ms_per_day as f64)).ceil() as u32;
    let total_days = raw_days.max(1);

    // Canonic phase distribution:
    // 1. Diagnóstico e Ingesta (30%)
    // 2. Resolución Profunda y Errores (40%)
    // 3. Simulacros de Examen Cronometrados (20%)
    // 4. Consolidación de Alta Estabilidad FSRS (10%)
    let d1 = (((total_days as f32) * 0.3).round() as u32).max(1);
    let d2 = (((total_days as f32) * 0.4).round() as u32).max(1);
    let d3 = (((total_days as f32) * 0.2).round() as u32).max(1);
    let d4 = if total_days > (d1 + d2 + d3) {
        total_days - (d1 + d2 + d3)
    } else {
        1
    };

    let offset = 0;
    let phases = vec![
        ExamPhaseMilestone {
            name: "Fase 1: Diagnóstico e Ingesta Conceptual".to_string(),
            description: "Lectura activa de apuntes de cátedra, extracción de teoremas y construcción del Grafo.".to_string(),
            start_day_offset: offset,
            end_day_offset: offset + d1,
            target_milestone: "100% de conceptos cargados y evaluados en Feynman preliminar.".to_string(),
            completed: false,
        },
        ExamPhaseMilestone {
            name: "Fase 2: Resolución Profunda y Desarme de Errores".to_string(),
            description: "Práctica de guías de trabajos prácticos, auditoría socrática y vaciado del Error Bank.".to_string(),
            start_day_offset: offset + d1,
            end_day_offset: offset + d1 + d2,
            target_milestone: "Cero errores repetidos en temas troncales y retención FSRS > 85%.".to_string(),
            completed: false,
        },
        ExamPhaseMilestone {
            name: "Fase 3: Simulacros de Examen Cronometrados".to_string(),
            description: "Simulacros en Modo Examen estricto, sin pistas, con tiempo límite y evaluación formal.".to_string(),
            start_day_offset: offset + d1 + d2,
            end_day_offset: offset + d1 + d2 + d3,
            target_milestone: "3 simulacros aprobados con calificación >= 7/10 en condiciones reales.".to_string(),
            completed: false,
        },
        ExamPhaseMilestone {
            name: "Fase 4: Consolidación y Repaso de Retención".to_string(),
            description: "Repasos ligeros de tarjetas FSRS con retención en riesgo. No aprender temas nuevos.".to_string(),
            start_day_offset: offset + d1 + d2 + d3,
            end_day_offset: offset + d1 + d2 + d3 + d4,
            target_milestone: "Dominio global consolidado y descanso mental previo a la mesa de examen.".to_string(),
            completed: false,
        },
    ];

    ExamPlanSummary {
        subject_id,
        subject_name,
        exam_date_ms,
        available_minutes_per_day,
        total_days,
        phases,
        status: "active".to_string(),
        created_at_ms: now_ms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reverse_exam_plan_distribution() {
        let now = 1_000_000;
        let exam_date = now + (30 * 24 * 60 * 60 * 1000); // 30 días
        let plan = plan_reverse_exam_core(
            "sub_algebra".to_string(),
            "Álgebra II".to_string(),
            exam_date,
            now,
            90,
        );

        assert_eq!(plan.total_days, 30);
        assert_eq!(plan.phases.len(), 4);
        assert_eq!(plan.phases[0].start_day_offset, 0);
        assert!(plan.phases[0].end_day_offset > 0);
        assert_eq!(plan.phases[3].end_day_offset, plan.phases[2].end_day_offset + (plan.phases[3].end_day_offset - plan.phases[2].end_day_offset));
    }
}
