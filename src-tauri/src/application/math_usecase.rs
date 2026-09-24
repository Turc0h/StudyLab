use crate::domain::errors::StudyLabError;
use crate::domain::math::derivation::validate_step_derivation;
use crate::dtos::math_dto::{ValidateDerivationRequest, ValidateDerivationResponse};

/// Application Use Case: Validates a student's step derivation against expected LaTeX and key tokens.
pub fn validate_math_derivation(
    request: ValidateDerivationRequest,
) -> Result<ValidateDerivationResponse, StudyLabError> {
    let eval = validate_step_derivation(
        &request.user_attempt,
        &request.expected_formula,
        &request.key_tokens,
    )?;

    Ok(ValidateDerivationResponse {
        is_correct: eval.is_correct,
        score: eval.score,
        token_ratio: eval.token_ratio,
        matched_tokens: eval.matched_tokens,
        feedback: eval.feedback,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_usecase() {
        let req = ValidateDerivationRequest {
            user_attempt: "F'(x) = f(x)".to_string(),
            expected_formula: "F'(x) = f(x)".to_string(),
            key_tokens: vec!["F'".into(), "f(x)".into()],
        };

        let res = validate_math_derivation(req).expect("validates derivation");
        assert!(res.is_correct);
        assert_eq!(res.score, 10.0);
    }
}
