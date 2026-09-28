use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Point {
  pub x: f64,
  pub y: f64,
  pub time: Option<f64>,
}

/// Filtro de Media Móvil Exponencial (EMA) para suavizar coordenadas entrantes
pub fn apply_ema_filter(points: &[Point], alpha: f64) -> Vec<Point> {
  if points.len() <= 2 {
    return points.to_vec();
  }

  let mut filtered = Vec::with_capacity(points.len());
  filtered.push(points[0].clone());

  for i in 1..points.len() {
    let prev = &filtered[i - 1];
    let curr = &points[i];
    filtered.push(Point {
      x: alpha * curr.x + (1.0 - alpha) * prev.x,
      y: alpha * curr.y + (1.0 - alpha) * prev.y,
      time: curr.time,
    });
  }

  filtered
}

/// Distancia perpendicular ortogonal de un punto a un segmento
fn perpendicular_distance(pt: &Point, line_start: &Point, line_end: &Point) -> f64 {
  let dx = line_end.x - line_start.x;
  let dy = line_end.y - line_start.y;
  let mag = dx.hypot(dy);

  if mag == 0.0 {
    return (pt.x - line_start.x).hypot(pt.y - line_start.y);
  }

  let u = ((pt.x - line_start.x) * dx + (pt.y - line_start.y) * dy) / (mag * mag);
  let clamped_u = u.clamp(0.0, 1.0);
  let proj_x = line_start.x + clamped_u * dx;
  let proj_y = line_start.y + clamped_u * dy;

  (pt.x - proj_x).hypot(pt.y - proj_y)
}

/// Algoritmo Ramer-Douglas-Peucker (RDP) para simplificación geométrica
pub fn ramer_douglas_peucker(points: &[Point], epsilon: f64) -> Vec<Point> {
  if points.len() <= 2 {
    return points.to_vec();
  }

  let mut max_dist = 0.0;
  let mut index = 0;
  let start = &points[0];
  let end = &points[points.len() - 1];

  for i in 1..(points.len() - 1) {
    let dist = perpendicular_distance(&points[i], start, end);
    if dist > max_dist {
      max_dist = dist;
      index = i;
    }
  }

  if max_dist > epsilon {
    let mut left = ramer_douglas_peucker(&points[0..=index], epsilon);
    let right = ramer_douglas_peucker(&points[index..points.len()], epsilon);

    left.pop(); // Evitar duplicar el punto de unión
    left.extend(right);
    left
  } else {
    vec![start.clone(), end.clone()]
  }
}

/// Prolijado completo: aplica RDP y luego suavizado EMA
pub fn beautify_points(points: &[Point], tolerance: f64) -> Vec<Point> {
  if points.len() <= 3 {
    return points.to_vec();
  }

  let simplified = ramer_douglas_peucker(points, tolerance);
  apply_ema_filter(&simplified, 0.7)
}

pub mod compression;
pub use compression::{compress_strokes, decompress_strokes, CompressedStrokesResult, StrokeData};