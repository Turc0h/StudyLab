use crate::domain::errors::StudyLabError;
use crate::domain::telemetry::fatigue::{
    evaluate_stress_level, parse_gatt_heart_rate as parse_gatt,
};
use crate::dtos::telemetry_dto::{
    EvaluateStressRequest, EvaluateStressResponse, HeartRateReadingDto, ParseGattRequest,
};
use std::time::{SystemTime, UNIX_EPOCH};

/// Application Use Case: Evaluates biometric stress and cognitive fatigue state.
pub fn evaluate_stress(
    request: EvaluateStressRequest,
) -> Result<EvaluateStressResponse, StudyLabError> {
    let eval = evaluate_stress_level(request.bpm, request.hrv_rmssd);

    Ok(EvaluateStressResponse {
        state: eval.state.as_str().to_string(),
        state_label: eval.state_label,
        description: eval.description,
        recommended_action: eval.recommended_action.as_str().to_string(),
    })
}

/// Application Use Case: Parses raw Bluetooth GATT bytes into a typed heart rate reading.
pub fn parse_gatt_reading(
    request: ParseGattRequest,
) -> Result<HeartRateReadingDto, StudyLabError> {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let reading = parse_gatt(&request.raw_bytes, now_ms)?;

    Ok(HeartRateReadingDto {
        bpm: reading.bpm,
        contact_detected: reading.contact_detected,
        energy_expended_j: reading.energy_expended_j,
        rr_intervals_ms: reading.rr_intervals_ms,
        hrv_rmssd: reading.hrv_rmssd,
        timestamp_ms: reading.timestamp_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_usecase_stress() {
        let req = EvaluateStressRequest {
            bpm: 75,
            hrv_rmssd: Some(45),
        };
        let res = evaluate_stress(req).expect("evaluates stress");
        assert_eq!(res.state, "focused");
        assert_eq!(res.recommended_action, "continue");
    }

    #[test]
    fn test_telemetry_usecase_gatt() {
        let req = ParseGattRequest {
            raw_bytes: vec![0x00, 78],
        };
        let res = parse_gatt_reading(req).expect("parses GATT");
        assert_eq!(res.bpm, 78);
        assert!(!res.contact_detected);
    }
}
