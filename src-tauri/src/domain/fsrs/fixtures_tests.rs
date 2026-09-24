//! Comprehensive parity verification against golden JSON fixtures generated from original TypeScript.

use super::*;
use serde_json::Value;

const FIXTURES_JSON: &str = include_str!("../../../../scripts/fixtures/fsrs-golden.json");

#[test]
fn test_fsrs_initial_states_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let initial_states = json["initialStates"].as_array().expect("initialStates must be array");

    for entry in initial_states {
        let rating = entry["rating"].as_u64().unwrap() as u8;
        let exp_s = entry["initialStability"].as_f64().unwrap();
        let exp_d = entry["initialDifficulty"].as_f64().unwrap();

        let actual_s = calculate_initial_stability(rating, None);
        let actual_d = calculate_initial_difficulty(rating, None);

        assert!(
            (actual_s - exp_s).abs() < 1e-9,
            "Initial S mismatch for rating {}: actual={}, expected={}",
            rating, actual_s, exp_s
        );
        assert!(
            (actual_d - exp_d).abs() < 1e-9,
            "Initial D mismatch for rating {}: actual={}, expected={}",
            rating, actual_d, exp_d
        );
    }
}

fn assert_rel_error(actual: f64, expected: f64, context: &str) {
    let diff = (actual - expected).abs();
    let rel = if expected.abs() > 1e-9 {
        diff / expected.abs()
    } else {
        diff
    };
    assert!(
        rel <= 1e-9,
        "{}: actual={}, expected={}, rel_error={}",
        context, actual, expected, rel
    );
}

#[test]
fn test_fsrs_retrievability_parity_with_s_005_divergence() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let cases = json["retrievabilityCases"].as_array().expect("retrievabilityCases must be array");

    for c in cases {
        let elapsed_days = c["elapsedDays"].as_f64().unwrap();
        let stability = c["stability"].as_f64().unwrap();
        let exp_r_fsrs = c["fsrsRetrievability"].as_f64().unwrap();
        let exp_r_leech = c["leechR"].as_f64().unwrap();
        let exp_half_life = c["halfLife"].as_f64().unwrap();

        let actual_r_fsrs = calculate_retrievability(elapsed_days, stability);
        let actual_r_leech = calculate_r_leech(elapsed_days, stability);
        let actual_half_life = calculate_half_life(stability);

        assert_rel_error(
            actual_r_fsrs,
            exp_r_fsrs,
            &format!("FSRS Retrievability mismatch for t={}, s={}", elapsed_days, stability),
        );

        assert_rel_error(
            actual_r_leech,
            exp_r_leech,
            &format!("Leech R mismatch for t={}, s={}", elapsed_days, stability),
        );

        assert_rel_error(
            actual_half_life,
            exp_half_life,
            &format!("Half life mismatch for s={}", stability),
        );

        // Explicit verification of divergence when s = 0.05 (stability floor 0.01 vs 0.1)
        if (stability - 0.05).abs() < 1e-6 && elapsed_days > 0.0 {
            let rel_divergence = (actual_r_leech - actual_r_fsrs) / actual_r_fsrs;
            assert!(
                rel_divergence > 0.20,
                "Expected divergence between fsrsModel and leechDetector for s=0.05, but got actual_r_fsrs={}, actual_r_leech={}, rel_div={}",
                actual_r_fsrs, actual_r_leech, rel_divergence
            );
        }
    }
}

#[test]
fn test_fsrs_interval_and_rounding_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let cases = json["intervalCases"].as_array().expect("intervalCases must be array");

    for c in cases {
        let stability = c["stability"].as_f64().unwrap();
        let desired_retention = c["desiredRetention"].as_f64().unwrap();
        let exp_raw = c["rawInterval"].as_f64().unwrap();
        let exp_interval = c["intervalDays"].as_u64().unwrap() as u32;

        let s_clamped = stability.max(0.1);
        let r_clamped = desired_retention.clamp(0.50, 0.99);
        let actual_raw = (s_clamped / FSRS_DECAY_FACTOR) * (r_clamped.powf(-2.0) - 1.0);

        assert!(
            (actual_raw - exp_raw).abs() < 1e-9,
            "Raw interval mismatch for s={}, r={}: actual={}, expected={}",
            stability, desired_retention, actual_raw, exp_raw
        );

        let actual_interval = calculate_interval_days(stability, desired_retention, 36500);
        assert_eq!(
            actual_interval, exp_interval,
            "Final rounded interval mismatch for s={}, r={}: actual={}, expected={}",
            stability, desired_retention, actual_interval, exp_interval
        );
    }
}

#[test]
fn test_fsrs_preview_next_states_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let cases = json["previewCases"].as_array().expect("previewCases must be array");

    for c in cases {
        let scenario_name = c["scenario"].as_str().unwrap();
        let input = &c["input"];
        let expected = &c["expected"];

        let current_s = input["currentS"].as_f64().unwrap();
        let current_d = input["currentD"].as_f64().unwrap();
        let elapsed_days = input["elapsedDays"].as_f64().unwrap();
        let is_new = input["isNew"].as_bool().unwrap();
        let now_ms = input["now"].as_u64().unwrap();
        let desired_retention = input["desiredRetention"].as_f64().unwrap();
        let max_interval_days = input["maxIntervalDays"].as_u64().unwrap() as u32;

        let params = FsrsParameters {
            weights: FSRS_CANONICAL_WEIGHTS,
            desired_retention,
            max_interval_days,
        };

        let actual = preview_next_states(current_s, current_d, elapsed_days, is_new, now_ms, Some(&params));

        for pred in actual {
            let rating_key = pred.rating.to_string();
            let exp_pred = &expected[&rating_key];

            assert!(
                (pred.next_stability - exp_pred["nextStability"].as_f64().unwrap()).abs() < 1e-9,
                "Scenario {}: nextStability mismatch for rating {}",
                scenario_name, pred.rating
            );
            assert!(
                (pred.next_difficulty - exp_pred["nextDifficulty"].as_f64().unwrap()).abs() < 1e-9,
                "Scenario {}: nextDifficulty mismatch for rating {}",
                scenario_name, pred.rating
            );
            assert_eq!(
                pred.interval_days, exp_pred["intervalDays"].as_u64().unwrap() as u32,
                "Scenario {}: intervalDays mismatch for rating {}",
                scenario_name, pred.rating
            );
            assert_eq!(
                pred.next_due_date, exp_pred["nextDueDate"].as_u64().unwrap(),
                "Scenario {}: nextDueDate mismatch for rating {}",
                scenario_name, pred.rating
            );
            assert_eq!(
                pred.label, exp_pred["label"].as_str().unwrap(),
                "Scenario {}: label mismatch for rating {}",
                scenario_name, pred.rating
            );
        }
    }
}

#[test]
fn test_fsrs_long_sequences_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let sequences = json["longSequences"].as_array().expect("longSequences must be array");

    for seq in sequences {
        let card_id = seq["cardId"].as_str().unwrap();
        let steps = seq["steps"].as_array().unwrap();

        let mut current_s = 0.1;
        let mut current_d = 5.0;
        let mut current_state = "new";
        let mut last_review: Option<u64> = None;
        let mut reps = 0u32;
        let mut lapses = 0u32;

        for step_val in steps {
            let step_num = step_val["step"].as_u64().unwrap();
            let rating = step_val["rating"].as_u64().unwrap() as u8;
            let review_time = step_val["reviewTimestamp"].as_u64().unwrap();

            let is_new = current_state == "new" || last_review.is_none();
            let elapsed_days = if is_new {
                0.0
            } else {
                ((review_time - last_review.unwrap()) as f64 / (24.0 * 60.0 * 60.0 * 1000.0)).max(0.0)
            };
            let r = if is_new {
                1.0
            } else {
                calculate_retrievability(elapsed_days, current_s)
            };

            let (next_s, next_d, next_state) = if is_new {
                let ns = calculate_initial_stability(rating, None);
                let nd = calculate_initial_difficulty(rating, None);
                let st = if rating == 1 { "learning" } else { "review" };
                (ns, nd, st)
            } else {
                let nd = calculate_next_difficulty(current_d, rating, None);
                let (ns, st) = if rating == 1 {
                    (
                        calculate_next_forget_stability(current_d, current_s, r, None),
                        "relearning",
                    )
                } else {
                    (
                        calculate_next_recall_stability(current_d, current_s, r, rating, None),
                        "review",
                    )
                };
                (ns, nd, st)
            };

            let scheduled_days = if rating == 1 {
                0
            } else {
                calculate_interval_days(next_s, 0.90, 36500)
            };

            assert_rel_error(
                next_s,
                step_val["stabilityAfter"].as_f64().unwrap(),
                &format!("Card {}, step {}: stabilityAfter mismatch", card_id, step_num),
            );
            assert_rel_error(
                next_d,
                step_val["difficultyAfter"].as_f64().unwrap(),
                &format!("Card {}, step {}: difficultyAfter mismatch", card_id, step_num),
            );
            assert_eq!(
                next_state, step_val["stateAfter"].as_str().unwrap(),
                "Card {}, step {}: stateAfter mismatch",
                card_id, step_num
            );
            assert_eq!(
                scheduled_days, step_val["scheduledDays"].as_u64().unwrap() as u32,
                "Card {}, step {}: scheduledDays mismatch",
                card_id, step_num
            );

            // Update card state for next loop iteration
            current_s = next_s;
            current_d = next_d;
            current_state = next_state;
            last_review = Some(review_time);
            reps += 1;
            if rating == 1 {
                lapses += 1;
            }
            assert_eq!(reps, step_val["repsAfter"].as_u64().unwrap() as u32);
            assert_eq!(lapses, step_val["lapsesAfter"].as_u64().unwrap() as u32);
        }
    }
}

#[test]
fn test_fsrs_leech_cases_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let cases = json["leechCases"].as_array().expect("leechCases must be array");

    for c in cases {
        let lapses = c["lapses"].as_u64().unwrap() as u32;
        let threshold = c["threshold"].as_u64().unwrap() as u32;
        let exp_is_leech = c["isLeech"].as_bool().unwrap();
        let exp_action = c["actionRecommendation"].as_str().unwrap();
        let exp_message = c["message"].as_str().unwrap();

        let actual = detect_card_leech(lapses, threshold);

        assert_eq!(actual.is_leech, exp_is_leech, "Leech mismatch for lapses={}", lapses);
        assert_eq!(actual.action_recommendation, exp_action, "Action mismatch for lapses={}", lapses);
        assert_eq!(actual.message, exp_message, "Message mismatch for lapses={}", lapses);
        assert_eq!(detect_leech(lapses, threshold), exp_is_leech);
    }
}

#[test]
fn test_fsrs_rmse_cases_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let cases = json["rmseCases"].as_array().expect("rmseCases must be array");

    for c in cases {
        let name = c["name"].as_str().unwrap();
        let exp_rmse = c["expectedRmse"].as_f64().unwrap();
        let logs_json = c["logs"].as_array().unwrap();

        let logs: Vec<(u8, f64, f64)> = logs_json
            .iter()
            .map(|l| {
                (
                    l["rating"].as_u64().unwrap() as u8,
                    l["stabilityBefore"].as_f64().unwrap(),
                    l["elapsedDays"].as_f64().unwrap(),
                )
            })
            .collect();

        let actual_rmse = calculate_model_rmse(&logs);

        assert!(
            (actual_rmse - exp_rmse).abs() < 1e-9,
            "RMSE mismatch in case {}: actual={}, expected={}",
            name, actual_rmse, exp_rmse
        );
    }
}

#[test]
fn test_fsrs_load_balancer_parity() {
    let json: Value = serde_json::from_str(FIXTURES_JSON).expect("Error parsing fsrs-golden.json");
    let scenarios = &json["loadBalancerScenarios"];

    // 1. Postpone
    let p_json = &scenarios["postpone"];
    let now = p_json["now"].as_u64().unwrap();
    let days = p_json["days"].as_u64().unwrap() as u32;
    let max_cards = p_json["maxCards"].as_u64().map(|v| v as usize);
    let cards_val = p_json["cards"].as_array().unwrap();
    let cards: Vec<CardDueItem> = cards_val
        .iter()
        .map(|c| CardDueItem {
            id: c["id"].as_str().unwrap().to_string(),
            due_date: c["dueDate"].as_u64().unwrap(),
        })
        .collect();

    let postpone_res = plan_postpone_reviews(&cards, days, max_cards, now, 0);
    let exp_cand_ids: Vec<&str> = p_json["expectedCandidateIds"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();

    assert_eq!(postpone_res.cards_modified, exp_cand_ids.len());
    for (idx, up) in postpone_res.updates.iter().enumerate() {
        assert_eq!(up.id, exp_cand_ids[idx]);
        assert_eq!(up.new_due_date, now + (days as u64) * 24 * 60 * 60 * 1000);
    }

    // 2. Advance
    let adv_json = &scenarios["advance"];
    let adv_now = adv_json["now"].as_u64().unwrap();
    let adv_days = adv_json["daysAhead"].as_u64().unwrap() as u32;
    let adv_max = adv_json["maxCards"].as_u64().map(|v| v as usize);
    let adv_cards: Vec<CardDueItem> = adv_json["cards"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| CardDueItem {
            id: c["id"].as_str().unwrap().to_string(),
            due_date: c["dueDate"].as_u64().unwrap(),
        })
        .collect();

    let advance_res = plan_advance_reviews(&adv_cards, adv_days, adv_max, adv_now);
    let adv_cand_ids: Vec<&str> = adv_json["expectedCandidateIds"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();

    assert_eq!(advance_res.cards_modified, adv_cand_ids.len());
    for (idx, up) in advance_res.updates.iter().enumerate() {
        assert_eq!(up.id, adv_cand_ids[idx]);
        assert_eq!(up.new_due_date, adv_now - 60000);
    }

    // 3. Disperse Siblings
    let sib_json = &scenarios["disperseSiblings"];
    let sib_cards: Vec<SiblingCardItem> = sib_json["cards"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| SiblingCardItem {
            id: c["id"].as_str().unwrap().to_string(),
            concept_id: c["conceptId"].as_str().map(|s| s.to_string()),
            due_date: c["dueDate"].as_u64().unwrap(),
        })
        .collect();

    let disperse_res = plan_disperse_siblings(&sib_cards);
    let exp_disp_ids: Vec<&str> = sib_json["expectedDispersedIds"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();

    assert_eq!(disperse_res.cards_modified, exp_disp_ids.len());
    for (idx, up) in disperse_res.updates.iter().enumerate() {
        assert_eq!(up.id, exp_disp_ids[idx]);
    }
}
