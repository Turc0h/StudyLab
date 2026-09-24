use crate::domain::errors::StudyLabError;
use crate::domain::evaluation::smoke_detector::detect_oral_smoke;
use crate::dtos::evaluation_dto::{DetectSmokeRequest, DetectSmokeResponse};

/// Application Use Case: Audits oral or written responses for evasive speech or lack of rigor.
pub fn detect_oral_smoke_usecase(
    request: DetectSmokeRequest,
) -> Result<DetectSmokeResponse, StudyLabError> {
    let result = detect_oral_smoke(
        &request.text,
        &request.model_key_points,
        request.min_words,
    )?;

    Ok(DetectSmokeResponse {
        is_smoke: result.is_smoke,
        reasons: result.reasons,
        confidence: result.confidence,
        word_count: result.word_count,
        coverage_ratio: result.coverage_ratio,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_evaluation_usecase_smoke() {
        let req = DetectSmokeRequest {
            text: "básicamente lo que pasa es todo un tema".to_string(),
            model_key_points: vec!["fisiopatología".into()],
            min_words: 10,
        };
        let res = detect_oral_smoke_usecase(req).expect("detects smoke");
        assert!(res.is_smoke);
        assert!(!res.reasons.is_empty());
    }
}
