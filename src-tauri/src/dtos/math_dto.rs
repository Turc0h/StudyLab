use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateDerivationRequest {
    pub user_attempt: String,
    pub expected_formula: String,
    pub key_tokens: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateDerivationResponse {
    pub is_correct: bool,
    pub score: f32,
    pub token_ratio: f32,
    pub matched_tokens: Vec<String>,
    pub feedback: String,
}
