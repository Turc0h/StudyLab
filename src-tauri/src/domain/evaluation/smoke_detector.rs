use crate::domain::errors::StudyLabError;

/// Evaluation outcome from auditing student answers for evasion, verbosity or lack of substance.
#[derive(Debug, Clone, PartialEq)]
pub struct SmokeCheckResult {
    pub is_smoke: bool,
    pub reasons: Vec<String>,
    pub confidence: f32,
    pub word_count: usize,
    pub coverage_ratio: f32,
}

const SMOKE_PHRASES: &[&str] = &[
    "es todo un tema",
    "básicamente lo que pasa",
    "en líneas generales",
    "como ya sabemos",
    "se sobrentiende que",
    "por así decirlo",
    "en cierto sentido",
    "a grandes rasgos",
    "no recuerdo exactamente el nombre pero",
    "más o menos la idea es",
    "depende de muchas cosas",
];

/// Analyzes a spoken or written explanation against academic key points to detect
/// evasive fillers ("humo oral") or severe lack of conceptual anchoring.
pub fn detect_oral_smoke(
    text: &str,
    model_key_points: &[String],
    min_words: usize,
) -> Result<SmokeCheckResult, StudyLabError> {
    let trimmed = text.trim();
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    let word_count = words.len();

    let mut reasons = Vec::new();

    // 1. Extreme shortness or telegraphic evasion
    if word_count < (min_words / 2).max(5) && !trimmed.is_empty() {
        reasons.push(
            "Respuesta telegráfica o evasiva: no desarrolla el fundamento teórico solicitado."
                .to_string(),
        );
    }

    // 2. Repetitive filler phrases without technical content
    let lower_text = trimmed.to_lowercase();
    let mut smoke_hits = 0;
    for phrase in SMOKE_PHRASES {
        if lower_text.contains(phrase) {
            smoke_hits += 1;
        }
    }

    if smoke_hits >= 2 {
        reasons.push(
            "Uso reiterado de evasivas o muletillas genéricas sin precisión conceptual."
                .to_string(),
        );
    }

    // 3. Technical coverage of model key points
    let mut matched_points = 0;
    for kp in model_key_points {
        let tokens: Vec<&str> = kp
            .split_whitespace()
            .filter(|t| t.len() > 4)
            .collect();

        if tokens.iter().any(|&token| lower_text.contains(&token.to_lowercase())) {
            matched_points += 1;
        }
    }

    let total_key_points = model_key_points.len().max(1);
    let coverage_ratio = matched_points as f32 / total_key_points as f32;

    if coverage_ratio < 0.35 && word_count >= min_words {
        reasons.push(
            "El discurso eludió los puntos nodales solicitados por el jurado (falta de anclaje técnico)."
                .to_string(),
        );
    }

    let is_smoke = !reasons.is_empty();
    let confidence = ((reasons.len() as f32 * 0.35) + (1.0 - coverage_ratio) * 0.5).clamp(0.0, 1.0);

    Ok(SmokeCheckResult {
        is_smoke,
        reasons,
        confidence,
        word_count,
        coverage_ratio,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telegraphic_answer_detected() {
        let res = detect_oral_smoke("hace latir más rápido", &["elastancia ventricular".into()], 30)
            .expect("detects smoke");
        assert!(res.is_smoke);
        assert!(res.reasons.iter().any(|r| r.contains("telegráfica")));
    }

    #[test]
    fn test_filler_phrases_detected() {
        let text = "Básicamente lo que pasa es todo un tema porque en líneas generales se sobrentiende todo.";
        let res = detect_oral_smoke(text, &["fisiopatología".into()], 10).expect("detects smoke");
        assert!(res.is_smoke);
        assert!(res.reasons.iter().any(|r| r.contains("evasivas o muletillas")));
    }

    #[test]
    fn test_rigorous_answer_passes() {
        let text = "El acoplamiento se determina por la elastancia ventrículo-arterial Ees sobre Ea, incrementando el consumo miocárdico de oxígeno debido a sobrecarga de calcio citosólico.";
        let key_points = vec![
            "Elastancia ventrículo-arterial Ees/Ea".to_string(),
            "Consumo miocárdico de O2".to_string(),
            "Sobrecarga de calcio citosólico".to_string(),
        ];
        let res = detect_oral_smoke(text, &key_points, 20).expect("evaluates answer");
        assert!(!res.is_smoke);
        assert!(res.coverage_ratio >= 0.60);
    }
}
