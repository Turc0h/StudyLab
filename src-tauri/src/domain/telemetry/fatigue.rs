use crate::domain::errors::StudyLabError;

/// Autonomic stress state of the student.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StressState {
    Calm,
    Focused,
    Strained,
    Stressed,
}

impl StressState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Calm => "calm",
            Self::Focused => "focused",
            Self::Strained => "strained",
            Self::Stressed => "stressed",
        }
    }
}

/// Recommended educational / physiological intervention.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StressRecommendedAction {
    Continue,
    MicroBreak,
    BoxBreathing,
}

impl StressRecommendedAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Continue => "continue",
            Self::MicroBreak => "micro_break",
            Self::BoxBreathing => "box_breathing",
        }
    }
}

/// Evaluated psychological stress and cognitive fatigue diagnosis.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StressEvaluation {
    pub state: StressState,
    pub state_label: String,
    pub description: String,
    pub recommended_action: StressRecommendedAction,
}

/// Pure domain representation of a processed heart rate telemetry measurement.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HeartRateReading {
    pub bpm: u16,
    pub contact_detected: bool,
    pub energy_expended_j: Option<u16>,
    pub rr_intervals_ms: Vec<u16>,
    pub hrv_rmssd: Option<u16>,
    pub timestamp_ms: u64,
}

/// Computes the Root Mean Square of Successive Differences (RMSSD) from RR intervals in ms.
/// Standard biometric marker for Heart Rate Variability (HRV) and parasympathetic tone.
pub fn calculate_rmssd(rr_intervals_ms: &[u16]) -> Option<u16> {
    if rr_intervals_ms.len() < 2 {
        return None;
    }

    let mut sum_sq_diffs: u64 = 0;
    for i in 0..(rr_intervals_ms.len() - 1) {
        let diff = (rr_intervals_ms[i + 1] as i64) - (rr_intervals_ms[i] as i64);
        sum_sq_diffs += (diff * diff) as u64;
    }

    let mean = sum_sq_diffs as f64 / (rr_intervals_ms.len() - 1) as f64;
    Some(mean.sqrt().round() as u16)
}

/// Evaluates autonomic arousal and cognitive fatigue based on heart rate and HRV.
pub fn evaluate_stress_level(bpm: u16, hrv_rmssd: Option<u16>) -> StressEvaluation {
    // 1. Acute stress / exam anxiety peak
    if bpm >= 100 || (hrv_rmssd.is_some_and(|rmssd| rmssd < 20) && bpm > 88) {
        return StressEvaluation {
            state: StressState::Stressed,
            state_label: "Estrés / Frecuencia Elevada".to_string(),
            description: "Pico de activación simpática detectado. Se recomienda activar Respiración Cuadrada (4-4-4-4).".to_string(),
            recommended_action: StressRecommendedAction::BoxBreathing,
        };
    }

    // 2. Sustained strain or prolonged cognitive fatigue
    if bpm >= 86 || hrv_rmssd.is_some_and(|rmssd| rmssd < 32) {
        return StressEvaluation {
            state: StressState::Strained,
            state_label: "Fatiga Cognitiva Moderada".to_string(),
            description: "Carga atencional sostenida. Conviene tomar una micro-pausa de 3 minutos de estiramiento visual.".to_string(),
            recommended_action: StressRecommendedAction::MicroBreak,
        };
    }

    // 3. Optimal cognitive focus (Flow state)
    if (70..86).contains(&bpm) {
        return StressEvaluation {
            state: StressState::Focused,
            state_label: "Foco Sostenido (Flow)".to_string(),
            description: "Ritmo cardiovascular equilibrado. Ventana de atención óptima para asimilar conceptos densos.".to_string(),
            recommended_action: StressRecommendedAction::Continue,
        };
    }

    // 4. Basal resting calm
    StressEvaluation {
        state: StressState::Calm,
        state_label: "Reposo / Calma Basal".to_string(),
        description: "Tono parasimpático dominante. Excelente estado fisiológico para iniciar lectura o repaso.".to_string(),
        recommended_action: StressRecommendedAction::Continue,
    }
}

/// Parses raw GATT Heart Rate Measurement payload according to Bluetooth SIG Specification (UUID: 0x2A37).
pub fn parse_gatt_heart_rate(
    data: &[u8],
    timestamp_ms: u64,
) -> Result<HeartRateReading, StudyLabError> {
    if data.is_empty() {
        return Err(StudyLabError::invalid_input(
            "gatt_data",
            "GATT payload buffer cannot be empty",
        ));
    }

    let flags = data[0];
    let is_16_bit = (flags & 0x01) != 0;
    let has_contact = (flags & 0x06) == 0x06;
    let has_energy = (flags & 0x08) != 0;
    let has_rr = (flags & 0x10) != 0;

    let mut offset = 1;

    let bpm = if is_16_bit {
        if offset + 2 > data.len() {
            return Err(StudyLabError::validation_failed(
                "GATT_LENGTH",
                "Truncated 16-bit BPM payload",
            ));
        }
        let val = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;
        val
    } else {
        if offset + 1 > data.len() {
            return Err(StudyLabError::validation_failed(
                "GATT_LENGTH",
                "Truncated 8-bit BPM payload",
            ));
        }
        let val = data[offset] as u16;
        offset += 1;
        val
    };

    let energy_expended_j = if has_energy {
        if offset + 2 <= data.len() {
            let val = u16::from_le_bytes([data[offset], data[offset + 1]]);
            offset += 2;
            Some(val)
        } else {
            None
        }
    } else {
        None
    };

    let mut rr_intervals_ms = Vec::new();
    if has_rr {
        while offset + 1 < data.len() {
            let raw_rr = u16::from_le_bytes([data[offset], data[offset + 1]]);
            // Convert from 1/1024s unit to milliseconds
            let ms = (((raw_rr as u32) * 1000 + 512) / 1024) as u16;
            rr_intervals_ms.push(ms);
            offset += 2;
        }
    }

    let hrv_rmssd = calculate_rmssd(&rr_intervals_ms);

    Ok(HeartRateReading {
        bpm,
        contact_detected: has_contact,
        energy_expended_j,
        rr_intervals_ms,
        hrv_rmssd,
        timestamp_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_rmssd() {
        let rr = vec![800, 840, 820, 860];
        let rmssd = calculate_rmssd(&rr).expect("computes rmssd");
        assert!(rmssd > 0);
    }

    #[test]
    fn test_evaluate_stress_states() {
        assert_eq!(evaluate_stress_level(65, None).state, StressState::Calm);
        assert_eq!(evaluate_stress_level(75, None).state, StressState::Focused);
        assert_eq!(evaluate_stress_level(88, None).state, StressState::Strained);
        assert_eq!(evaluate_stress_level(105, None).state, StressState::Stressed);
    }

    #[test]
    fn test_parse_gatt_8bit_simple() {
        // Flags: 0 (8-bit BPM, no contact, no energy, no RR), BPM: 72
        let payload = vec![0x00, 72];
        let reading = parse_gatt_heart_rate(&payload, 1000).expect("parses GATT");
        assert_eq!(reading.bpm, 72);
        assert!(!reading.contact_detected);
        assert!(reading.rr_intervals_ms.is_empty());
    }

    #[test]
    fn test_parse_gatt_with_contact_and_rr() {
        // Flags: 0x16 (bit 1-2 for contact 0x06, bit 4 for RR 0x10), BPM: 80
        // RR: 1024 (which is exactly 1000 ms), 1024 (1000 ms)
        let payload = vec![
            0x16, 80,
            0x00, 0x04, // 1024 in little endian
            0x00, 0x04, // 1024 in little endian
        ];
        let reading = parse_gatt_heart_rate(&payload, 2000).expect("parses GATT with RR");
        assert_eq!(reading.bpm, 80);
        assert!(reading.contact_detected);
        assert_eq!(reading.rr_intervals_ms.len(), 2);
        assert_eq!(reading.rr_intervals_ms[0], 1000);
        assert_eq!(reading.rr_intervals_ms[1], 1000);
    }
}
