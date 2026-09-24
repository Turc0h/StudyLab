use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluateStressRequest {
    pub bpm: u16,
    pub hrv_rmssd: Option<u16>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluateStressResponse {
    pub state: String,
    pub state_label: String,
    pub description: String,
    pub recommended_action: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseGattRequest {
    pub raw_bytes: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeartRateReadingDto {
    pub bpm: u16,
    pub contact_detected: bool,
    pub energy_expended_j: Option<u16>,
    pub rr_intervals_ms: Vec<u16>,
    pub hrv_rmssd: Option<u16>,
    pub timestamp_ms: u64,
}
