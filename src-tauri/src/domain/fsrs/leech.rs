//! Leech detection and specialized retrievability calculation
//! Preserves both fsrsModel.ts and leechDetector.ts behaviors with strict parity.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeechInfo {
    pub is_leech: bool,
    pub lapses: u32,
    pub threshold: u32,
    pub action_recommendation: String,
    pub message: String,
}

/// Simple boolean leech detection matching leechDetector.ts:detectLeech
pub fn detect_leech(lapses: u32, threshold: u32) -> bool {
    lapses >= threshold
}

/// Specialized retrievability calculation matching leechDetector.ts:calculateR
/// Divergence from fsrsModel: stability floor is 0.1 (not 0.01) and return is unclamped.
pub fn calculate_r_leech(elapsed_days: f64, stability: f64) -> f64 {
    if elapsed_days <= 0.0 {
        return 1.0;
    }
    (1.0 + (19.0 * elapsed_days) / stability.max(0.1)).powf(-0.5)
}

/// Detailed leech diagnosis matching fsrsModel.ts:detectCardLeech
pub fn detect_card_leech(lapses: u32, threshold: u32) -> LeechInfo {
    let is_leech = lapses >= threshold;
    if !is_leech {
        return LeechInfo {
            is_leech: false,
            lapses,
            threshold,
            action_recommendation: "reword".to_string(),
            message: "Tarjeta en ciclo de aprendizaje normal.".to_string(),
        };
    }

    let action_recommendation = if lapses >= 10 {
        "suspend"
    } else if lapses >= 8 {
        "audit"
    } else {
        "split"
    };

    LeechInfo {
        is_leech: true,
        lapses,
        threshold,
        action_recommendation: action_recommendation.to_string(),
        message: format!(
            "Esta tarjeta te falló {} veces. Probablemente el problema sea la formulación de la tarjeta o una premisa conceptual, no tu memoria.",
            lapses
        ),
    }
}
