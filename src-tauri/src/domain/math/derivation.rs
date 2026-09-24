use crate::domain::errors::StudyLabError;

/// Cleans a LaTeX mathematical formula by stripping non-semantic layout tags,
/// formatting operators and whitespace for robust canonical comparison.
pub fn clean_math_formula(formula: &str) -> String {
    let mut cleaned = String::with_capacity(formula.len());
    let stripped = formula
        .replace("\\left", "")
        .replace("\\right", "")
        .replace("\\cdot", "")
        .replace('*', "")
        .to_lowercase();

    for ch in stripped.chars() {
        if !ch.is_whitespace() {
            cleaned.push(ch);
        }
    }

    cleaned
}

/// The result of evaluating a student's mathematical derivation step.
#[derive(Debug, Clone, PartialEq)]
pub struct MathDerivationEvaluation {
    pub is_correct: bool,
    pub score: f32,
    pub token_ratio: f32,
    pub matched_tokens: Vec<String>,
    pub feedback: String,
}

/// Validates a single step in a rigorous mathematical derivation against an expected formula
/// and a collection of key required mathematical tokens/operators.
pub fn validate_step_derivation(
    user_attempt: &str,
    expected_formula: &str,
    key_tokens: &[String],
) -> Result<MathDerivationEvaluation, StudyLabError> {
    let attempt = user_attempt.trim();
    if attempt.is_empty() {
        return Ok(MathDerivationEvaluation {
            is_correct: false,
            score: 0.0,
            token_ratio: 0.0,
            matched_tokens: Vec::new(),
            feedback: "No has ingresado ninguna expresión para este paso deductivo.".to_string(),
        });
    }

    let clean_user = clean_math_formula(attempt);
    let clean_exp = clean_math_formula(expected_formula);

    // Exact or containment match
    if clean_user == clean_exp || clean_user.contains(&clean_exp) || clean_exp.contains(&clean_user) {
        return Ok(MathDerivationEvaluation {
            is_correct: true,
            score: 10.0,
            token_ratio: 1.0,
            matched_tokens: key_tokens.to_vec(),
            feedback: "¡Deducción rigurosa y matemáticamente impecable! La expresión concuerda plenamente con el paso analítico.".to_string(),
        });
    }

    // Token matching
    let mut matched_tokens = Vec::new();
    for token in key_tokens {
        let clean_token = clean_math_formula(token);
        if !clean_token.is_empty() && clean_user.contains(&clean_token) {
            matched_tokens.push(token.clone());
        }
    }

    let total_tokens = key_tokens.len().max(1);
    let token_ratio = matched_tokens.len() as f32 / total_tokens as f32;

    if token_ratio >= 0.70 {
        Ok(MathDerivationEvaluation {
            is_correct: true,
            score: 8.5,
            token_ratio,
            matched_tokens,
            feedback: "Deducción sustancialmente correcta. Incluiste los operadores y variables clave requeridos para el paso.".to_string(),
        })
    } else if token_ratio >= 0.40 {
        Ok(MathDerivationEvaluation {
            is_correct: false,
            score: 5.0,
            token_ratio,
            matched_tokens,
            feedback: "Identificaste algunos términos correctos, pero falta justificar la estructura o balancear los factores de escala.".to_string(),
        })
    } else {
        Ok(MathDerivationEvaluation {
            is_correct: false,
            score: 2.0,
            token_ratio,
            matched_tokens,
            feedback: "La expresión propuesta diverge del paso requerido. Revisá la pista o repasá la hipótesis de partida.".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_math_formula() {
        let input = "x(t) = \\sum_{n=-\\infty}^{\\infty} x(n T_s) \\cdot \\text{sinc}\\left( \\frac{t - n T_s}{T_s} \\right)";
        let cleaned = clean_math_formula(input);
        assert!(!cleaned.contains("\\left"));
        assert!(!cleaned.contains("\\right"));
        assert!(!cleaned.contains("\\cdot"));
        assert!(!cleaned.contains(' '));
    }

    #[test]
    fn test_validate_exact_match() {
        let formula = "F'(x) = f(x)";
        let res = validate_step_derivation("F'(x) = f(x)", formula, &["F'(x)".into(), "f(x)".into()]).unwrap();
        assert!(res.is_correct);
        assert_eq!(res.score, 10.0);
    }

    #[test]
    fn test_validate_partial_tokens() {
        let formula = "X_s(f) = f_s \\sum_{k=-\\infty}^{\\infty} X(f - k f_s)";
        let tokens = vec![
            "f_s".to_string(),
            "sum".to_string(),
            "X(f".to_string(),
            "k f_s".to_string(),
        ];
        let attempt = "f_s sum X(f - k f_s)";
        let res = validate_step_derivation(attempt, formula, &tokens).unwrap();
        assert!(res.is_correct);
        assert_eq!(res.score, 8.5);
    }

    #[test]
    fn test_validate_empty_attempt() {
        let res = validate_step_derivation("", "x = y", &[]).unwrap();
        assert!(!res.is_correct);
        assert_eq!(res.score, 0.0);
    }
}
