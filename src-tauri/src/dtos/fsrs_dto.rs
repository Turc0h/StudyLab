//! DTOs for FSRS v4.5 Tauri IPC commands.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsPreviewRequest {
    pub current_s: f64,
    pub current_d: f64,
    pub elapsed_days: f64,
    pub is_new: bool,
    pub now: Option<u64>,
    pub desired_retention: Option<f64>,
    pub max_interval_days: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsrsPredictionDto {
    pub rating: u8,
    pub next_stability: f64,
    pub next_difficulty: f64,
    pub interval_days: u32,
    pub next_due_date: u64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteReviewRequest {
    pub card_id: String,
    pub rating: u8,
    pub latency_ms: u64,
    pub now: Option<u64>,
    pub current_s: f64,
    pub current_d: f64,
    pub current_state: String, // "new" | "learning" | "review" | "relearning"
    pub reps: u32,
    pub lapses: u32,
    pub last_review: Option<u64>,
    pub desired_retention: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatedCardDto {
    pub card_id: String,
    pub state: String,
    pub stability: f64,
    pub difficulty: f64,
    pub reps: u32,
    pub lapses: u32,
    pub last_review: u64,
    pub due_date: u64,
    pub half_life: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewLogDto {
    pub id: String,
    pub card_id: String,
    pub rating: u8,
    pub review_timestamp: u64,
    pub latency_ms: u64,
    pub state_before: String,
    pub state_after: String,
    pub stability_before: f64,
    pub stability_after: f64,
    pub difficulty_before: f64,
    pub difficulty_after: f64,
    pub scheduled_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteReviewResponse {
    pub updated_card: UpdatedCardDto,
    pub review_log: ReviewLogDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeechDetectionRequest {
    pub lapses: u32,
    pub threshold: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeechDetectionResponse {
    pub is_leech: bool,
    pub lapses: u32,
    pub threshold: u32,
    pub action_recommendation: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RmseLogEntryDto {
    pub rating: u8,
    pub stability_before: f64,
    pub elapsed_days: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRmseRequest {
    pub logs: Vec<RmseLogEntryDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRmseResponse {
    pub rmse: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDueItemDto {
    pub id: String,
    pub due_date: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDueUpdateDto {
    pub id: String,
    pub new_due_date: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiblingCardItemDto {
    pub id: String,
    pub concept_id: Option<String>,
    pub due_date: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadBalanceRequest {
    pub action: String, // "postpone" | "advance" | "balanceLoad" | "easyDays" | "disperseSiblings"
    pub now: Option<u64>,
    pub days: Option<u32>,
    pub max_cards: Option<usize>,
    pub window_days: Option<usize>,
    pub target_max_per_day: Option<usize>,
    pub easy_days_map: Option<HashMap<u8, f64>>,
    pub cards: Option<Vec<CardDueItemDto>>,
    pub siblings: Option<Vec<SiblingCardItemDto>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadBalanceResponse {
    pub cards_modified: usize,
    pub updates: Vec<CardDueUpdateDto>,
    pub message: String,
}
