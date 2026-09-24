//! Pure Mathematical Model for Free Spaced Repetition Scheduler (FSRS v4.5)
//!
//! Implements canonical equations for:
//! - Retrievability: R(t, S) = (1 + factor * t / S)^(-0.5)
//! - Half-life: t_1/2 = (3 / 19) * S
//! - Initial & Updated Stability and Difficulty (ratings 1..4)
//! - Optimal interval calculation for target retention

use serde::{Deserialize, Serialize};

/// Canonical 17-parameter weights for FSRS v4.5
pub const FSRS_CANONICAL_WEIGHTS: [f64; 17] = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 0.22695, 0.5698, 2.85535,
];

/// The current decay factor used across TypeScript implementation (fsrsModel.ts).
/// Note: Inherited issue - production TS uses 19.0 instead of canonical 19/81.
/// Preserved here in domain/fsrs as the single source of truth for runtime calculations.
pub const FSRS_DECAY_FACTOR: f64 = 19.0;

/// Theoretical canonical FSRS 4.5 decay factor (19 / 81 ~= 0.2345679)
/// under which R(S, S) = 0.90 and I(0.90, S) = S.
pub const CANONICAL_FSRS_45_FACTOR: f64 = 19.0 / 81.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FsrsRating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

impl FsrsRating {
    pub fn from_u8(val: u8) -> Result<Self, String> {
        match val {
            1 => Ok(Self::Again),
            2 => Ok(Self::Hard),
            3 => Ok(Self::Good),
            4 => Ok(Self::Easy),
            other => Err(format!("Invalid FSRS rating: {}. Must be 1, 2, 3, or 4", other)),
        }
    }

    pub fn to_u8(self) -> u8 {
        self as u8
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsParameters {
    pub weights: [f64; 17],
    pub desired_retention: f64,
    pub max_interval_days: u32,
}

impl Default for FsrsParameters {
    fn default() -> Self {
        Self {
            weights: FSRS_CANONICAL_WEIGHTS,
            desired_retention: 0.90,
            max_interval_days: 36500,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsPrediction {
    pub rating: u8,
    pub next_stability: f64,
    pub next_difficulty: f64,
    pub interval_days: u32,
    pub next_due_date: u64,
    pub label: String,
}

/// Calculates Retrievability R(t, S)
/// Replicates exact TypeScript behavior from fsrsModel.ts
pub fn calculate_retrievability(elapsed_days: f64, stability: f64) -> f64 {
    if elapsed_days <= 0.0 {
        return 1.0;
    }
    let s = stability.max(0.01);
    let r = (1.0 + (FSRS_DECAY_FACTOR * elapsed_days) / s).powf(-0.5);
    r.clamp(0.0, 1.0)
}

/// Calculates Knowledge Half-Life: t_(1/2) in days
pub fn calculate_half_life(stability: f64) -> f64 {
    (3.0 / 19.0) * stability.max(0.01)
}

/// Initial Difficulty D_0(G) based on rating G in [1..4]
pub fn calculate_initial_difficulty(rating: u8, weights: Option<&[f64; 17]>) -> f64 {
    let w = weights.unwrap_or(&FSRS_CANONICAL_WEIGHTS);
    let r = rating.clamp(1, 4) as f64;
    let d0 = w[4] - (w[5] * (r - 1.0)).exp() + 1.0;
    d0.clamp(1.0, 10.0)
}

/// Initial Stability S_0(G) based on rating G in [1..4]
pub fn calculate_initial_stability(rating: u8, weights: Option<&[f64; 17]>) -> f64 {
    let w = weights.unwrap_or(&FSRS_CANONICAL_WEIGHTS);
    let idx = (rating.clamp(1, 4) - 1) as usize;
    w[idx].max(0.1)
}

/// Updated Difficulty D' after review with mean reversion
pub fn calculate_next_difficulty(
    current_d: f64,
    rating: u8,
    weights: Option<&[f64; 17]>,
) -> f64 {
    let w = weights.unwrap_or(&FSRS_CANONICAL_WEIGHTS);
    let r = rating.clamp(1, 4) as f64;
    let init_d3 = calculate_initial_difficulty(3, Some(w));
    let raw_d = current_d - w[6] * (r - 3.0);
    let mean_reverted = w[7] * init_d3 + (1.0 - w[7]) * raw_d;
    mean_reverted.clamp(1.0, 10.0)
}

/// Updated Stability on Successful Recall (Rating >= 2)
pub fn calculate_next_recall_stability(
    current_d: f64,
    current_s: f64,
    r: f64,
    rating: u8,
    weights: Option<&[f64; 17]>,
) -> f64 {
    let w = weights.unwrap_or(&FSRS_CANONICAL_WEIGHTS);
    let h = match rating {
        2 => w[15],
        4 => w[16],
        _ => 1.0,
    };
    let s = current_s.max(0.1);
    let d = current_d.clamp(1.0, 10.0);
    let retrievability = r.clamp(0.001, 1.0);

    let delta = w[8].exp()
        * (11.0 - d)
        * s.powf(-w[9])
        * ((w[10] * (1.0 - retrievability)).exp() - 1.0)
        * h;

    (s * (1.0 + delta)).max(0.1)
}

/// Updated Stability on Forget / Lapse (Rating == 1: Again)
pub fn calculate_next_forget_stability(
    current_d: f64,
    current_s: f64,
    r: f64,
    weights: Option<&[f64; 17]>,
) -> f64 {
    let w = weights.unwrap_or(&FSRS_CANONICAL_WEIGHTS);
    let s = current_s.max(0.1);
    let d = current_d.clamp(1.0, 10.0);
    let retrievability = r.clamp(0.001, 1.0);

    let sf = w[11]
        * d.powf(-w[12])
        * ((s + 1.0).powf(w[13]) - 1.0)
        * (w[14] * (1.0 - retrievability)).exp();

    sf.min(s).max(0.1)
}

/// Calculates the next interval in days to reach target retention
pub fn calculate_interval_days(
    stability: f64,
    desired_retention: f64,
    max_interval: u32,
) -> u32 {
    let s = stability.max(0.1);
    let r = desired_retention.clamp(0.50, 0.99);
    let raw_interval = (s / FSRS_DECAY_FACTOR) * (r.powf(-2.0) - 1.0);
    let interval = (raw_interval.round() as i64).max(1) as u32;
    interval.min(max_interval)
}

/// Previews all 4 possible review outcomes for UI buttons
pub fn preview_next_states(
    current_s: f64,
    current_d: f64,
    elapsed_days: f64,
    is_new: bool,
    now_ms: u64,
    params: Option<&FsrsParameters>,
) -> [FsrsPrediction; 4] {
    let default_params = FsrsParameters::default();
    let p = params.unwrap_or(&default_params);
    let current_r = if is_new {
        1.0
    } else {
        calculate_retrievability(elapsed_days, current_s)
    };

    let mut predictions = Vec::with_capacity(4);

    for rating in 1..=4 {
        let (next_s, next_d) = if is_new {
            (
                calculate_initial_stability(rating, Some(&p.weights)),
                calculate_initial_difficulty(rating, Some(&p.weights)),
            )
        } else {
            let nd = calculate_next_difficulty(current_d, rating, Some(&p.weights));
            let ns = if rating == 1 {
                calculate_next_forget_stability(current_d, current_s, current_r, Some(&p.weights))
            } else {
                calculate_next_recall_stability(current_d, current_s, current_r, rating, Some(&p.weights))
            };
            (ns, nd)
        };

        let (interval_days, next_due_date, label) = if rating == 1 {
            (0, now_ms + 10 * 60 * 1000, "10 min".to_string())
        } else {
            let scheduled = calculate_interval_days(next_s, p.desired_retention, p.max_interval_days);
            let iv = scheduled.max(1);
            let due = now_ms + (iv as u64) * 24 * 60 * 60 * 1000;
            let lbl = if iv == 1 {
                "1 día".to_string()
            } else {
                format!("{} días", iv)
            };
            (iv, due, lbl)
        };

        predictions.push(FsrsPrediction {
            rating,
            next_stability: next_s,
            next_difficulty: next_d,
            interval_days,
            next_due_date,
            label,
        });
    }

    [
        predictions.remove(0),
        predictions.remove(0),
        predictions.remove(0),
        predictions.remove(0),
    ]
}

/// Calculates Root Mean Square Error (RMSE) between predicted Retrievability
/// and observed recall events (rating >= 2 is recalled 1.0, rating == 1 is forgotten 0.0)
pub fn calculate_model_rmse(
    logs: &[(u8, f64, f64)], // (rating, stability_before, elapsed_days)
) -> f64 {
    if logs.is_empty() {
        return 0.0;
    }
    let mut sum_squared_error = 0.0;
    for &(rating, stability_before, elapsed_days) in logs {
        let predicted_r = calculate_retrievability(elapsed_days, stability_before);
        let actual = if rating >= 2 { 1.0 } else { 0.0 };
        sum_squared_error += (predicted_r - actual).powi(2);
    }
    (sum_squared_error / logs.len() as f64).sqrt()
}
