//! Application usecases for FSRS spaced repetition and load balancing.

use crate::domain::errors::StudyLabError;
use crate::domain::fsrs::{
    calculate_half_life, calculate_initial_difficulty, calculate_initial_stability,
    calculate_interval_days, calculate_model_rmse, calculate_next_difficulty,
    calculate_next_forget_stability, calculate_next_recall_stability,
    calculate_retrievability, detect_card_leech, plan_advance_reviews,
    plan_balance_load, plan_disperse_siblings, plan_easy_days, plan_postpone_reviews,
    CardDueItem, CardDueUpdate, FsrsParameters, FsrsRating, SiblingCardItem,
    FSRS_CANONICAL_WEIGHTS,
};
use crate::dtos::fsrs_dto::*;

const ONE_DAY_MS: u64 = 24 * 60 * 60 * 1000;

pub fn preview_next_states_usecase(
    req: FsrsPreviewRequest,
) -> Result<Vec<FsrsPredictionDto>, StudyLabError> {
    let now_ms = req.now.unwrap_or(0);
    let params = FsrsParameters {
        weights: FSRS_CANONICAL_WEIGHTS,
        desired_retention: req.desired_retention.unwrap_or(0.90),
        max_interval_days: req.max_interval_days.unwrap_or(36500),
    };

    let predictions = crate::domain::fsrs::preview_next_states(
        req.current_s,
        req.current_d,
        req.elapsed_days,
        req.is_new,
        now_ms,
        Some(&params),
    );

    Ok(predictions
        .into_iter()
        .map(|p| FsrsPredictionDto {
            rating: p.rating,
            next_stability: p.next_stability,
            next_difficulty: p.next_difficulty,
            interval_days: p.interval_days,
            next_due_date: p.next_due_date,
            label: p.label,
        })
        .collect())
}

pub fn execute_review_usecase(
    req: ExecuteReviewRequest,
) -> Result<ExecuteReviewResponse, StudyLabError> {
    let rating = FsrsRating::from_u8(req.rating)
        .map_err(|e| StudyLabError::invalid_input("rating", e))?;

    let now_ms = req.now.unwrap_or(0);
    let is_new = req.current_state == "new" || req.last_review.is_none();

    let elapsed_days = if is_new {
        0.0
    } else {
        let last = req.last_review.unwrap_or(now_ms);
        ((now_ms.saturating_sub(last)) as f64 / ONE_DAY_MS as f64).max(0.0)
    };

    let r = if is_new {
        1.0
    } else {
        calculate_retrievability(elapsed_days, req.current_s)
    };

    let rating_u8 = rating.to_u8();
    let (next_s, next_d, next_state) = if is_new {
        let ns = calculate_initial_stability(rating_u8, None);
        let nd = calculate_initial_difficulty(rating_u8, None);
        let st = if rating_u8 == 1 { "learning" } else { "review" };
        (ns, nd, st)
    } else {
        let nd = calculate_next_difficulty(req.current_d, rating_u8, None);
        let (ns, st) = if rating_u8 == 1 {
            (
                calculate_next_forget_stability(req.current_d, req.current_s, r, None),
                "relearning",
            )
        } else {
            (
                calculate_next_recall_stability(req.current_d, req.current_s, r, rating_u8, None),
                "review",
            )
        };
        (ns, nd, st)
    };

    let desired_retention = req.desired_retention.unwrap_or(0.90);
    let (scheduled_days, next_due_date) = if rating_u8 == 1 {
        (0u32, now_ms + 10 * 60 * 1000)
    } else {
        let iv = calculate_interval_days(next_s, desired_retention, 36500);
        (iv, now_ms + (iv as u64) * ONE_DAY_MS)
    };

    let next_lapses = if rating_u8 == 1 {
        req.lapses + 1
    } else {
        req.lapses
    };

    let updated_card = UpdatedCardDto {
        card_id: req.card_id.clone(),
        state: next_state.to_string(),
        stability: next_s,
        difficulty: next_d,
        reps: req.reps + 1,
        lapses: next_lapses,
        last_review: now_ms,
        due_date: next_due_date,
        half_life: calculate_half_life(next_s),
    };

    let review_log = ReviewLogDto {
        id: format!("log_{}_{}", req.card_id, now_ms),
        card_id: req.card_id,
        rating: rating_u8,
        review_timestamp: now_ms,
        latency_ms: req.latency_ms,
        state_before: req.current_state,
        state_after: next_state.to_string(),
        stability_before: req.current_s,
        stability_after: next_s,
        difficulty_before: req.current_d,
        difficulty_after: next_d,
        scheduled_days,
    };

    Ok(ExecuteReviewResponse {
        updated_card,
        review_log,
    })
}

pub fn detect_card_leech_usecase(
    req: LeechDetectionRequest,
) -> Result<LeechDetectionResponse, StudyLabError> {
    let threshold = req.threshold.unwrap_or(6);
    let info = detect_card_leech(req.lapses, threshold);
    Ok(LeechDetectionResponse {
        is_leech: info.is_leech,
        lapses: info.lapses,
        threshold: info.threshold,
        action_recommendation: info.action_recommendation,
        message: info.message,
    })
}

pub fn calculate_model_rmse_usecase(
    req: ModelRmseRequest,
) -> Result<ModelRmseResponse, StudyLabError> {
    let logs: Vec<(u8, f64, f64)> = req
        .logs
        .iter()
        .map(|l| (l.rating, l.stability_before, l.elapsed_days))
        .collect();

    let rmse = calculate_model_rmse(&logs);
    Ok(ModelRmseResponse { rmse })
}

pub fn load_balance_usecase(
    req: LoadBalanceRequest,
) -> Result<LoadBalanceResponse, StudyLabError> {
    let now_ms = req.now.unwrap_or(0);

    match req.action.as_str() {
        "postpone" => {
            let cards: Vec<CardDueItem> = req
                .cards
                .unwrap_or_default()
                .into_iter()
                .map(|c| CardDueItem {
                    id: c.id,
                    due_date: c.due_date,
                })
                .collect();
            let days = req.days.unwrap_or(1);
            let res = plan_postpone_reviews(&cards, days, req.max_cards, now_ms, 0);
            Ok(map_load_balance_result(res))
        }
        "advance" => {
            let cards: Vec<CardDueItem> = req
                .cards
                .unwrap_or_default()
                .into_iter()
                .map(|c| CardDueItem {
                    id: c.id,
                    due_date: c.due_date,
                })
                .collect();
            let days_ahead = req.days.unwrap_or(2);
            let res = plan_advance_reviews(&cards, days_ahead, req.max_cards, now_ms);
            Ok(map_load_balance_result(res))
        }
        "balanceLoad" => {
            let cards: Vec<CardDueItem> = req
                .cards
                .unwrap_or_default()
                .into_iter()
                .map(|c| CardDueItem {
                    id: c.id,
                    due_date: c.due_date,
                })
                .collect();
            let window_days = req.window_days.unwrap_or(14);
            let target_max = req.target_max_per_day.unwrap_or(35);
            let res = plan_balance_load(&cards, window_days, target_max, now_ms, 0);
            Ok(map_load_balance_result(res))
        }
        "easyDays" => {
            let cards: Vec<CardDueItem> = req
                .cards
                .unwrap_or_default()
                .into_iter()
                .map(|c| CardDueItem {
                    id: c.id,
                    due_date: c.due_date,
                })
                .collect();
            let easy_map = req.easy_days_map.unwrap_or_default();
            let window_days = req.window_days.unwrap_or(21);
            let res = plan_easy_days(&cards, &easy_map, window_days, now_ms, None);
            Ok(map_load_balance_result(res))
        }
        "disperseSiblings" => {
            let siblings: Vec<SiblingCardItem> = req
                .siblings
                .unwrap_or_default()
                .into_iter()
                .map(|s| SiblingCardItem {
                    id: s.id,
                    concept_id: s.concept_id,
                    due_date: s.due_date,
                })
                .collect();
            let res = plan_disperse_siblings(&siblings);
            Ok(map_load_balance_result(res))
        }
        other => Err(StudyLabError::invalid_input(
            "action",
            format!("Unknown load balancer action: {}", other),
        )),
    }
}

fn map_load_balance_result(
    res: crate::domain::fsrs::LoadBalanceResult,
) -> LoadBalanceResponse {
    LoadBalanceResponse {
        cards_modified: res.cards_modified,
        updates: res
            .updates
            .into_iter()
            .map(|u: CardDueUpdate| CardDueUpdateDto {
                id: u.id,
                new_due_date: u.new_due_date,
            })
            .collect(),
        message: res.message,
    }
}
