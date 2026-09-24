//! Pure load balancing algorithms for FSRS spaced reviews.
//!
//! Provides deterministic and auditable planning logic for:
//! - Postponing overdue or today's reviews
//! - Advancing upcoming reviews for early study
//! - Aplaning peaks across a rolling day window (balanceLoad)
//! - Applying Easy Days policy based on weekday constraints
//! - Dispersing sibling cards sharing the same concept to prevent associative interference

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const ONE_DAY_MS: u64 = 24 * 60 * 60 * 1000;
const EIGHTEEN_HOURS_MS: u64 = 18 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDueItem {
    pub id: String,
    pub due_date: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDueUpdate {
    pub id: String,
    pub new_due_date: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadBalanceResult {
    pub cards_modified: usize,
    pub updates: Vec<CardDueUpdate>,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiblingCardItem {
    pub id: String,
    pub concept_id: Option<String>,
    pub due_date: u64,
}

/// Postpones overdue cards (dueDate <= now_ms) by `days` days.
pub fn plan_postpone_reviews(
    cards: &[CardDueItem],
    days: u32,
    max_cards: Option<usize>,
    now_ms: u64,
    jitter_ms: u64,
) -> LoadBalanceResult {
    let shift_ms = (days as u64) * ONE_DAY_MS;

    let mut eligible: Vec<&CardDueItem> = cards
        .iter()
        .filter(|c| c.due_date <= now_ms)
        .collect();

    if let Some(limit) = max_cards {
        if eligible.len() > limit {
            eligible.truncate(limit);
        }
    }

    if eligible.is_empty() {
        return LoadBalanceResult {
            cards_modified: 0,
            updates: Vec::new(),
            message: "No hay tarjetas vencidas para posponer.".to_string(),
        };
    }

    let updates: Vec<CardDueUpdate> = eligible
        .iter()
        .map(|c| CardDueUpdate {
            id: c.id.clone(),
            new_due_date: now_ms + shift_ms + jitter_ms,
        })
        .collect();

    let count = updates.len();
    LoadBalanceResult {
        cards_modified: count,
        updates,
        message: format!("Se pospusieron {} tarjeta(s) por {} día(s).", count, days),
    }
}

/// Advances future cards scheduled within `days_ahead` days so they can be reviewed today.
pub fn plan_advance_reviews(
    cards: &[CardDueItem],
    days_ahead: u32,
    max_cards: Option<usize>,
    now_ms: u64,
) -> LoadBalanceResult {
    let threshold = now_ms + (days_ahead as u64) * ONE_DAY_MS;

    let mut eligible: Vec<&CardDueItem> = cards
        .iter()
        .filter(|c| c.due_date > now_ms && c.due_date <= threshold)
        .collect();

    if let Some(limit) = max_cards {
        if eligible.len() > limit {
            eligible.truncate(limit);
        }
    }

    if eligible.is_empty() {
        return LoadBalanceResult {
            cards_modified: 0,
            updates: Vec::new(),
            message: "No hay tarjetas futuras para adelantar en esa ventana.".to_string(),
        };
    }

    let updates: Vec<CardDueUpdate> = eligible
        .iter()
        .map(|c| CardDueUpdate {
            id: c.id.clone(),
            new_due_date: now_ms.saturating_sub(60_000), // Vence de inmediato (1 min en el pasado)
        })
        .collect();

    let count = updates.len();
    LoadBalanceResult {
        cards_modified: count,
        updates,
        message: format!("Se adelantaron {} tarjeta(s) para repasar hoy.", count),
    }
}

/// Balances load across days in a rolling window to flatten review spikes.
pub fn plan_balance_load(
    cards: &[CardDueItem],
    window_days: usize,
    target_max_per_day: usize,
    now_ms: u64,
    jitter_ms: u64,
) -> LoadBalanceResult {
    if window_days == 0 {
        return LoadBalanceResult {
            cards_modified: 0,
            updates: Vec::new(),
            message: "Ventana de balanceo vacía.".to_string(),
        };
    }

    let horizon = now_ms + (window_days as u64) * ONE_DAY_MS;
    let in_window: Vec<&CardDueItem> = cards
        .iter()
        .filter(|c| c.due_date >= now_ms && c.due_date <= horizon)
        .collect();

    if in_window.is_empty() {
        return LoadBalanceResult {
            cards_modified: 0,
            updates: Vec::new(),
            message: "No hay tarjetas en la ventana de balanceo.".to_string(),
        };
    }

    // Group cards into buckets 0..window_days - 1
    let mut buckets: Vec<Vec<CardDueItem>> = vec![Vec::new(); window_days];
    for card in in_window {
        let diff = card.due_date.saturating_sub(now_ms);
        let day_idx = ((diff / ONE_DAY_MS) as usize).min(window_days - 1);
        buckets[day_idx].push(card.clone());
    }

    let mut updates = Vec::new();

    for day in 0..window_days {
        if buckets[day].len() > target_max_per_day {
            let excess: Vec<CardDueItem> = buckets[day].split_off(target_max_per_day);
            for card in excess {
                // Find neighbor with lesser load
                let mut target_day = if day + 1 < window_days {
                    day + 1
                } else if day > 0 {
                    day - 1
                } else {
                    day
                };

                if day > 0 && day + 1 < window_days && buckets[day - 1].len() < buckets[day + 1].len() {
                    target_day = day - 1;
                }

                if target_day < window_days && target_day != day {
                    buckets[target_day].push(card.clone());
                    let new_due = now_ms + (target_day as u64) * ONE_DAY_MS + jitter_ms;
                    updates.push(CardDueUpdate {
                        id: card.id,
                        new_due_date: new_due,
                    });
                }
            }
        }
    }

    let count = updates.len();
    LoadBalanceResult {
        cards_modified: count,
        updates,
        message: if count > 0 {
            format!("Se redistribuyeron {} tarjeta(s) aplanando los picos de la semana.", count)
        } else {
            "La carga de estudio ya se encuentra perfectamente distribuida.".to_string()
        },
    }
}

/// Applies Easy Days policy, shifting cards from busy weekdays.
pub fn plan_easy_days(
    cards: &[CardDueItem],
    easy_days_map: &HashMap<u8, f64>, // day_of_week (0..6) -> retention factor (0.0..1.0)
    window_days: usize,
    now_ms: u64,
    random_factors: Option<&[f64]>, // Deterministic random numbers for testing
) -> LoadBalanceResult {
    let horizon = now_ms + (window_days as u64) * ONE_DAY_MS;
    let eligible: Vec<&CardDueItem> = cards
        .iter()
        .filter(|c| c.due_date >= now_ms && c.due_date <= horizon)
        .collect();

    let mut updates = Vec::new();
    let mut factor_idx = 0;

    for card in eligible {
        // Calculate weekday: timestamp ms -> days since UNIX epoch (1970-01-01 was Thursday = 4)
        let epoch_day = card.due_date / ONE_DAY_MS;
        let day_of_week = ((epoch_day + 4) % 7) as u8;

        if let Some(&factor) = easy_days_map.get(&day_of_week) {
            if factor < 1.0 {
                let random_val = if let Some(rf) = random_factors {
                    let val = rf.get(factor_idx).copied().unwrap_or(0.99);
                    factor_idx += 1;
                    val
                } else {
                    0.99 // Default shift if factor < 1.0
                };

                if random_val > factor {
                    updates.push(CardDueUpdate {
                        id: card.id.clone(),
                        new_due_date: card.due_date + ONE_DAY_MS,
                    });
                }
            }
        }
    }

    let count = updates.len();
    LoadBalanceResult {
        cards_modified: count,
        updates,
        message: format!(
            "Días fáciles aplicados: {} tarjeta(s) trasladadas desde tus días intensos de cursada.",
            count
        ),
    }
}

/// Disperses sibling cards sharing the same concept if scheduled within 18 hours.
pub fn plan_disperse_siblings(cards: &[SiblingCardItem]) -> LoadBalanceResult {
    let mut concept_groups: HashMap<String, Vec<SiblingCardItem>> = HashMap::new();

    for c in cards {
        if let Some(ref cid) = c.concept_id {
            if !cid.trim().is_empty() {
                concept_groups
                    .entry(cid.clone())
                    .or_default()
                    .push(c.clone());
            }
        }
    }

    let mut updates = Vec::new();

    for (_cid, mut siblings) in concept_groups {
        if siblings.len() <= 1 {
            continue;
        }

        // Sort by due_date
        siblings.sort_by_key(|s| s.due_date);

        for i in 1..siblings.len() {
            let prev_due = siblings[i - 1].due_date;
            let curr_due = siblings[i].due_date;

            let diff = curr_due.abs_diff(prev_due);

            if diff < EIGHTEEN_HOURS_MS {
                let offset_days = if i % 2 == 0 { 1 } else { 2 };
                let new_due = curr_due + (offset_days as u64) * ONE_DAY_MS;
                updates.push(CardDueUpdate {
                    id: siblings[i].id.clone(),
                    new_due_date: new_due,
                });
                siblings[i].due_date = new_due;
            }
        }
    }

    let count = updates.len();
    LoadBalanceResult {
        cards_modified: count,
        updates,
        message: format!(
            "Se dispersaron {} tarjetas hermanas para evitar interferencia asociativa.",
            count
        ),
    }
}
