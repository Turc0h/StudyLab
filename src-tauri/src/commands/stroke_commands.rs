use crate::domain::errors::StudyLabError;
use crate::domain::strokes::{beautify_points, Point};

#[tauri::command]
pub fn beautify_stroke(points: Vec<Point>, tolerance: Option<f64>) -> Result<Vec<Point>, StudyLabError> {
  let tol = tolerance.unwrap_or(4.0);
  Ok(beautify_points(&points, tol))
}

#[tauri::command]
pub fn simplify_stroke(points: Vec<Point>, epsilon: Option<f64>) -> Result<Vec<Point>, StudyLabError> {
  let eps = epsilon.unwrap_or(2.5);
  Ok(crate::domain::strokes::ramer_douglas_peucker(&points, eps))
}

#[tauri::command]
pub fn compress_strokes_binary(
  strokes: Vec<crate::domain::strokes::StrokeData>,
) -> Result<crate::domain::strokes::CompressedStrokesResult, StudyLabError> {
  Ok(crate::domain::strokes::compress_strokes(&strokes))
}

#[tauri::command]
pub fn decompress_strokes_binary(
  payload: String,
) -> Result<Vec<crate::domain::strokes::StrokeData>, StudyLabError> {
  crate::domain::strokes::decompress_strokes(&payload)
    .map_err(|e| StudyLabError::internal(e))
}