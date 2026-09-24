use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectSmokeRequest {
    pub text: String,
    pub model_key_points: Vec<String>,
    pub min_words: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectSmokeResponse {
    pub is_smoke: bool,
    pub reasons: Vec<String>,
    pub confidence: f32,
    pub word_count: usize,
    pub coverage_ratio: f32,
}
