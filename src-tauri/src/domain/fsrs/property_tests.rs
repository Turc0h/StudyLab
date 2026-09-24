//! Property tests validating mathematical invariants of FSRS formulas.
//!
//! Specifically validates the canonical FSRS v4.5 decay factor (19/81)
//! demonstrating that R(S, S) = 0.90 and I(0.90, S) = S.

#[cfg(test)]
mod tests {
    use super::super::model::{CANONICAL_FSRS_45_FACTOR, FSRS_DECAY_FACTOR};

    /// Evaluates Retrievability with an arbitrary factor: R(t, S) = (1 + factor * t / S)^(-0.5)
    fn r_with_factor(t: f64, s: f64, factor: f64) -> f64 {
        (1.0 + factor * (t / s)).powf(-0.5)
    }

    /// Evaluates Interval with an arbitrary factor: I(r, S) = (S / factor) * (r^-2 - 1)
    fn interval_with_factor(r: f64, s: f64, factor: f64) -> f64 {
        (s / factor) * (r.powf(-2.0) - 1.0)
    }

    #[test]
    fn test_canonical_fsrs_45_retrievability_property() {
        // Under canonical factor 19/81, when elapsed time t equals stability S,
        // Retrievability must be EXACTLY 0.90 (90%) for any stability S > 0.
        let test_stabilities = [0.1, 0.5, 1.0, 3.173, 10.0, 30.0, 100.0, 365.0];

        for &s in &test_stabilities {
            let r = r_with_factor(s, s, CANONICAL_FSRS_45_FACTOR);
            let diff = (r - 0.90).abs();
            assert!(
                diff < 1e-12,
                "Canonical FSRS 4.5 invariant failed: R(S, S) should be 0.90, got {} for S={}",
                r,
                s
            );
        }
    }

    #[test]
    fn test_canonical_fsrs_45_interval_property() {
        // Under canonical factor 19/81, with desired retention 0.90,
        // the calculated interval I(0.90, S) must be EXACTLY S.
        let test_stabilities = [0.1, 0.5, 1.0, 3.173, 10.0, 30.0, 100.0, 365.0];

        for &s in &test_stabilities {
            let iv = interval_with_factor(0.90, s, CANONICAL_FSRS_45_FACTOR);
            let diff = (iv - s).abs();
            assert!(
                diff < 1e-12,
                "Canonical FSRS 4.5 invariant failed: I(0.90, S) should be S, got {} for S={}",
                iv,
                s
            );
        }
    }

    #[test]
    fn test_production_decay_factor_divergence_documented() {
        // Documents the inherited production issue:
        // When using factor = 19.0 (current TS implementation):
        // R(S, S) = (1 + 19)^(-0.5) = 20^(-0.5) ~= 0.2236067977
        // instead of 0.90.
        let r_prod = r_with_factor(1.0, 1.0, FSRS_DECAY_FACTOR);
        let expected_prod = 1.0 / (20.0_f64).sqrt();
        assert!((r_prod - expected_prod).abs() < 1e-12);
        assert!((r_prod - 0.22360679774997896).abs() < 1e-12);

        // Interval under factor 19.0:
        // I(0.90, S) = (S / 19) * (0.9^-2 - 1) = S * (19 / 81) / 19 = S / 81 ~= 0.012345679 * S
        // This compresses intervals to ~1.23% of stability.
        let iv_prod = interval_with_factor(0.90, 81.0, FSRS_DECAY_FACTOR);
        assert!((iv_prod - 1.0).abs() < 1e-12);
    }
}
