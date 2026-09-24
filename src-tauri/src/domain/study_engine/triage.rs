use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TriageUrgency {
    Urgent,
    Medium,
    Long,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TriageMaterial {
    Logical,
    Factual,
    Doctrinal,
    Multimodal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TriageMastery {
    Initial,
    Intermediate,
    Advanced,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TriageEnergy {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageAnswers {
    pub urgency: TriageUrgency,
    pub material: TriageMaterial,
    pub mastery: TriageMastery,
    pub energy: TriageEnergy,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageMethodMatch {
    pub method_id: String,
    pub score: i32,
    pub match_percentage: u32,
    pub rationale: String,
    pub key_benefit: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriageResult {
    pub answers: TriageAnswers,
    pub top_matches: Vec<TriageMethodMatch>,
    pub diagnostic_summary: String,
    pub caution_alert: Option<String>,
}

const ALL_30_METHOD_IDS: [&str; 30] = [
    "active-recall",
    "spaced-repetition",
    "feynman",
    "pomodoro",
    "interleaving",
    "cornell",
    "blurting",
    "mind-maps",
    "leitner",
    "self-explanation",
    "distributed-practice",
    "sq3r",
    "dual-coding",
    "mnemonics",
    "chunking",
    "problem-based-learning",
    "practice-testing",
    "story-method",
    "protege-effect",
    "multisensory-learning",
    "method-of-loci",
    "elaborative-interrogation",
    "concept-maps",
    "desirable-difficulties",
    "zettelkasten",
    "pq4r",
    "kwl-method",
    "segmentation-principle",
    "deep-work",
    "sleep-consolidation",
];

pub fn calculate_triage_core(answers: &TriageAnswers) -> TriageResult {
    let mut scores: HashMap<&'static str, i32> = HashMap::new();
    for id in ALL_30_METHOD_IDS.iter() {
        scores.insert(id, 50);
    }

    // 1. Eje de Urgencia
    match answers.urgency {
        TriageUrgency::Urgent => {
            *scores.entry("practice-testing").or_default() += 45;
            *scores.entry("blurting").or_default() += 45;
            *scores.entry("active-recall").or_default() += 35;
            *scores.entry("feynman").or_default() += 20;
            *scores.entry("leitner").or_default() += 15;
            *scores.entry("desirable-difficulties").or_default() += 15;

            *scores.entry("distributed-practice").or_default() -= 40;
            *scores.entry("zettelkasten").or_default() -= 40;
            *scores.entry("concept-maps").or_default() -= 30;
            *scores.entry("problem-based-learning").or_default() -= 25;
            *scores.entry("method-of-loci").or_default() -= 25;
        }
        TriageUrgency::Medium => {
            *scores.entry("leitner").or_default() += 35;
            *scores.entry("interleaving").or_default() += 35;
            *scores.entry("feynman").or_default() += 30;
            *scores.entry("desirable-difficulties").or_default() += 30;
            *scores.entry("cornell").or_default() += 25;
            *scores.entry("elaborative-interrogation").or_default() += 25;
            *scores.entry("chunking").or_default() += 20;
            *scores.entry("pq4r").or_default() += 20;
        }
        TriageUrgency::Long => {
            *scores.entry("distributed-practice").or_default() += 45;
            *scores.entry("spaced-repetition").or_default() += 40;
            *scores.entry("concept-maps").or_default() += 35;
            *scores.entry("problem-based-learning").or_default() += 35;
            *scores.entry("zettelkasten").or_default() += 30;
            *scores.entry("dual-coding").or_default() += 25;
            *scores.entry("protege-effect").or_default() += 25;
            *scores.entry("blurting").or_default() -= 15;
        }
    }

    // 2. Eje de Naturaleza del Material
    match answers.material {
        TriageMaterial::Logical => {
            *scores.entry("feynman").or_default() += 40;
            *scores.entry("problem-based-learning").or_default() += 40;
            *scores.entry("concept-maps").or_default() += 35;
            *scores.entry("self-explanation").or_default() += 35;
            *scores.entry("elaborative-interrogation").or_default() += 30;
            *scores.entry("deep-work").or_default() += 20;
            *scores.entry("story-method").or_default() -= 30;
            *scores.entry("mnemonics").or_default() -= 30;
        }
        TriageMaterial::Factual => {
            *scores.entry("leitner").or_default() += 40;
            *scores.entry("method-of-loci").or_default() += 35;
            *scores.entry("story-method").or_default() += 35;
            *scores.entry("chunking").or_default() += 35;
            *scores.entry("mnemonics").or_default() += 30;
            *scores.entry("active-recall").or_default() += 25;
            *scores.entry("spaced-repetition").or_default() += 20;
        }
        TriageMaterial::Doctrinal => {
            *scores.entry("pq4r").or_default() += 40;
            *scores.entry("sq3r").or_default() += 35;
            *scores.entry("cornell").or_default() += 35;
            *scores.entry("elaborative-interrogation").or_default() += 30;
            *scores.entry("zettelkasten").or_default() += 25;
            *scores.entry("segmentation-principle").or_default() += 20;
        }
        TriageMaterial::Multimodal => {
            *scores.entry("dual-coding").or_default() += 40;
            *scores.entry("multisensory-learning").or_default() += 35;
            *scores.entry("mind-maps").or_default() += 35;
            *scores.entry("concept-maps").or_default() += 30;
            *scores.entry("zettelkasten").or_default() += 25;
        }
    }

    // 3. Eje de Nivel de Dominio
    match answers.mastery {
        TriageMastery::Initial => {
            *scores.entry("segmentation-principle").or_default() += 35;
            *scores.entry("sq3r").or_default() += 30;
            *scores.entry("feynman").or_default() += 25;
            *scores.entry("protege-effect").or_default() += 25;
            *scores.entry("kwl-method").or_default() += 25;
            *scores.entry("desirable-difficulties").or_default() -= 30;
            *scores.entry("blurting").or_default() -= 25;
            *scores.entry("practice-testing").or_default() -= 20;
        }
        TriageMastery::Intermediate => {
            *scores.entry("concept-maps").or_default() += 30;
            *scores.entry("interleaving").or_default() += 25;
            *scores.entry("dual-coding").or_default() += 25;
            *scores.entry("cornell").or_default() += 20;
            *scores.entry("chunking").or_default() += 20;
        }
        TriageMastery::Advanced => {
            *scores.entry("desirable-difficulties").or_default() += 40;
            *scores.entry("practice-testing").or_default() += 35;
            *scores.entry("blurting").or_default() += 30;
            *scores.entry("elaborative-interrogation").or_default() += 25;
            *scores.entry("sq3r").or_default() -= 20;
        }
    }

    // 4. Eje de Nivel de Energía / Fatiga
    match answers.energy {
        TriageEnergy::High => {
            *scores.entry("deep-work").or_default() += 35;
            *scores.entry("problem-based-learning").or_default() += 30;
            *scores.entry("practice-testing").or_default() += 25;
            *scores.entry("feynman").or_default() += 20;
        }
        TriageEnergy::Medium => {
            *scores.entry("pomodoro").or_default() += 30;
            *scores.entry("leitner").or_default() += 25;
            *scores.entry("interleaving").or_default() += 25;
            *scores.entry("cornell").or_default() += 20;
        }
        TriageEnergy::Low => {
            *scores.entry("sleep-consolidation").or_default() += 55;
            *scores.entry("multisensory-learning").or_default() += 45;
            *scores.entry("segmentation-principle").or_default() += 35;
            *scores.entry("spaced-repetition").or_default() += 30;
            *scores.entry("deep-work").or_default() -= 40;
            *scores.entry("practice-testing").or_default() -= 35;
            *scores.entry("problem-based-learning").or_default() -= 30;
        }
    }

    let mut ranked: Vec<(&'static str, i32)> = ALL_30_METHOD_IDS
        .iter()
        .map(|&id| (id, *scores.get(id).unwrap_or(&50)))
        .collect();
    ranked.sort_by_key(|a| std::cmp::Reverse(a.1));

    let top_matches: Vec<TriageMethodMatch> = ranked
        .into_iter()
        .take(3)
        .map(|(id, raw_score)| {
            let clamped = raw_score.clamp(20, 180);
            let match_percentage = 50 + (((clamped - 20) as f32 / 160.0) * 49.0).round() as u32;

            let (rationale, key_benefit) = match id {
                "practice-testing" => (
                    format!(
                        "Bajo presión temporal ({}), las pruebas simuladas con corrección inmediata calibran con rigor tu umbral real de examen y eliminan la falsa fluidez.",
                        if answers.urgency == TriageUrgency::Urgent { "inminente" } else { "a corto plazo" }
                    ),
                    "Exposición a condiciones de evaluación de cátedra y auditoría de tiempos.".to_string(),
                ),
                "blurting" => (
                    "El vaciado mental a ciegas sin apuntes es el método de choque más veloz para diagnosticar con precisión qué conceptos tenés fijados y qué lagunas críticas debés repasar.".to_string(),
                    "Evocación pura sin pistas visuales y contraste directo contra el material.".to_string(),
                ),
                "active-recall" => (
                    "Forzar la recuperación sináptica activa genera huellas mnémicas hasta 3 veces más resistentes al olvido que la relectura pasiva tradicional.".to_string(),
                    "Máxima eficiencia por minuto de estudio invertido.".to_string(),
                ),
                "feynman" => (
                    format!(
                        "Ideal para contenidos {}: simplificar la explicación en términos llanos desmantela la ilusión de competencia y localiza la raíz del error.",
                        if answers.material == TriageMaterial::Logical { "lógico-matemáticos" } else { "conceptuales" }
                    ),
                    "Claridad conceptual absoluta y lenguaje despojado de jerga vacía.".to_string(),
                ),
                "leitner" => (
                    "La distribución física en 5 compartimentos separa de forma quirúrgica lo que ya dominás de lo que falla, multiplicando la frecuencia sobre las dificultades reales.".to_string(),
                    "Economía cognitiva: el tiempo se concentra exclusivamente en lo que te cuesta.".to_string(),
                ),
                "spaced-repetition" => (
                    format!(
                        "El algoritmo adaptativo (FSRS) calcula el instante matemático exacto antes de que el olvido se produzca, {}.",
                        if answers.urgency == TriageUrgency::Long { "consolidando memoria duradera a meses vista" } else { "optimizando la retención de términos clave" }
                    ),
                    "Retención a largo plazo con el mínimo esfuerzo sináptico necesario.".to_string(),
                ),
                _ => (
                    format!("Metodología indicada con alto puntaje algorítmico ({}) para la combinación ingresada.", raw_score),
                    "Alineación neurocognitiva con el perfil de energía y urgencia.".to_string(),
                ),
            };

            TriageMethodMatch {
                method_id: id.to_string(),
                score: raw_score,
                match_percentage,
                rationale,
                key_benefit,
            }
        })
        .collect();

    let urgency_label = match answers.urgency {
        TriageUrgency::Urgent => "menos de 24 horas para rendir",
        TriageUrgency::Medium => "2 a 7 días disponibles",
        TriageUrgency::Long => "más de 2 semanas de horizonte",
    };

    let material_label = match answers.material {
        TriageMaterial::Logical => "materia lógica o computacional",
        TriageMaterial::Factual => "contenido de alta memorización fáctica",
        TriageMaterial::Doctrinal => "textos doctrinales densos",
        TriageMaterial::Multimodal => "conceptos abstractos o multimodales",
    };

    let energy_label = match answers.energy {
        TriageEnergy::High => "foco mental pleno",
        TriageEnergy::Medium => "ritmo cognitivo sostenido",
        TriageEnergy::Low => "fatiga mental o estudio nocturno",
    };

    let diagnostic_summary = format!(
        "Diagnóstico: Para una situación con {}, sobre {} y con {}, tu prioridad pedagógica es maximizar la eficiencia y proteger la memoria de trabajo.",
        urgency_label, material_label, energy_label
    );

    let caution_alert = if answers.urgency == TriageUrgency::Urgent && answers.energy == TriageEnergy::Low {
        Some("¡Alerta de Fatiga Extrema! Intentar sesiones masivas de última hora con baja energía produce ilusión de competencia y bloqueo sináptico. Te recomendamos repasar los simulacros o activar Consolidación por Sueño.".to_string())
    } else if answers.urgency == TriageUrgency::Urgent && answers.mastery == TriageMastery::Initial {
        Some("¡Precaución por tiempo crítico! Al ser la primera vez que ves el tema, concentrate en el Principio de Segmentación o Feynman básico en vez de intentar abarcar todo el manual.".to_string())
    } else {
        None
    };

    TriageResult {
        answers: answers.clone(),
        top_matches,
        diagnostic_summary,
        caution_alert,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scenario_urgent_high_energy() {
        let answers = TriageAnswers {
            urgency: TriageUrgency::Urgent,
            material: TriageMaterial::Logical,
            mastery: TriageMastery::Advanced,
            energy: TriageEnergy::High,
        };

        let res = calculate_triage_core(&answers);
        assert_eq!(res.top_matches.len(), 3);
        let top1 = &res.top_matches[0].method_id;
        assert!(top1 == "practice-testing" || top1 == "blurting");
        assert!(res.top_matches[0].match_percentage >= 80);
        assert!(res.diagnostic_summary.contains("menos de 24 horas"));
    }

    #[test]
    fn test_scenario_urgent_low_energy_caution() {
        let answers = TriageAnswers {
            urgency: TriageUrgency::Urgent,
            material: TriageMaterial::Factual,
            mastery: TriageMastery::Intermediate,
            energy: TriageEnergy::Low,
        };

        let res = calculate_triage_core(&answers);
        assert!(res.caution_alert.is_some());
        assert!(res.caution_alert.unwrap().contains("Fatiga Extrema"));
    }
}
