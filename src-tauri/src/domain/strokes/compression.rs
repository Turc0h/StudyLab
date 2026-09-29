use serde::{Deserialize, Serialize};
use super::Point;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrokeData {
    pub id: String,
    pub color: String,
    pub width: f64,
    #[serde(default = "default_tool")]
    pub tool: String,
    pub points: Vec<Point>,
}

fn default_tool() -> String {
    "pen".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedStrokesResult {
    pub payload: String,
    pub original_byte_size: usize,
    pub compressed_byte_size: usize,
    pub compression_ratio_pct: f64,
    pub stroke_count: usize,
    pub point_count: usize,
}

/// Comprime un conjunto de trazos en una representación delta ultracompacta
pub fn compress_strokes(strokes: &[StrokeData]) -> CompressedStrokesResult {
    let raw_json = serde_json::to_string(strokes).unwrap_or_default();
    let original_byte_size = raw_json.len();

    let mut parts: Vec<String> = Vec::new();
    let mut total_points = 0;

    for s in strokes {
        total_points += s.points.len();
        if s.points.is_empty() {
            continue;
        }

        // Formato de trazo: id#color#width#pts
        let mut pt_deltas = String::new();
        let mut prev_x = (s.points[0].x * 10.0).round() as i32;
        let mut prev_y = (s.points[0].y * 10.0).round() as i32;

        pt_deltas.push_str(&format!("{},{}", prev_x, prev_y));

        for p in s.points.iter().skip(1) {
            let cur_x = (p.x * 10.0).round() as i32;
            let cur_y = (p.y * 10.0).round() as i32;
            let dx = cur_x - prev_x;
            let dy = cur_y - prev_y;
            pt_deltas.push_str(&format!(",{},{}", dx, dy));
            prev_x = cur_x;
            prev_y = cur_y;
        }

        let stroke_repr = format!("{}|{}|{:.1}|{}|{}", s.id, s.color, s.width, s.tool, pt_deltas);
        parts.push(stroke_repr);
    }

    // V2 conserva la herramienta; el lector también acepta payloads V1 existentes.
    let payload = format!("V2\n{}", parts.join("\n"));
    let compressed_byte_size = payload.len();
    let compression_ratio_pct = if original_byte_size > 0 {
        ((original_byte_size.saturating_sub(compressed_byte_size)) as f64 / original_byte_size as f64) * 100.0
    } else {
        0.0
    };

    CompressedStrokesResult {
        payload,
        original_byte_size,
        compressed_byte_size,
        compression_ratio_pct: (compression_ratio_pct * 10.0).round() / 10.0,
        stroke_count: strokes.len(),
        point_count: total_points,
    }
}

/// Descomprime la representación delta y reconstruye los trazos vectoriales originales
pub fn decompress_strokes(payload: &str) -> Result<Vec<StrokeData>, String> {
    let mut lines = payload.lines();
    let version = lines.next().ok_or("Payload vacío")?;
    if version != "V1" && version != "V2" {
        return Err(format!("Versión de compresión desconocida: {}", version));
    }

    let mut strokes = Vec::new();

    for line in lines {
        if line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() < if version == "V2" { 5 } else { 4 } {
            continue;
        }

        let id = parts[0].to_string();
        let color = parts[1].to_string();
        let width = parts[2].parse::<f64>().unwrap_or(2.0);
        let (tool, pt_str) = if version == "V2" {
            (parts[3].to_string(), parts[4])
        } else {
            (default_tool(), parts[3])
        };

        let coords: Vec<&str> = pt_str.split(',').collect();
        if coords.len() < 2 {
            continue;
        }

        let mut points = Vec::new();
        let mut cur_x = coords[0].parse::<i32>().map_err(|e| e.to_string())?;
        let mut cur_y = coords[1].parse::<i32>().map_err(|e| e.to_string())?;

        points.push(Point {
            x: cur_x as f64 / 10.0,
            y: cur_y as f64 / 10.0,
            time: None,
        });

        let mut idx = 2;
        while idx + 1 < coords.len() {
            let dx = coords[idx].parse::<i32>().map_err(|e| e.to_string())?;
            let dy = coords[idx + 1].parse::<i32>().map_err(|e| e.to_string())?;
            cur_x += dx;
            cur_y += dy;

            points.push(Point {
                x: cur_x as f64 / 10.0,
                y: cur_y as f64 / 10.0,
                time: None,
            });
            idx += 2;
        }

        strokes.push(StrokeData {
            id,
            color,
            width,
            tool,
            points,
        });
    }

    Ok(strokes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_roundtrip() {
        let original = vec![
            StrokeData {
                id: "stroke-1".into(),
                color: "#f5f5f0".into(),
                width: 3.0,
                tool: "pen".into(),
                points: vec![
                    Point { x: 10.0, y: 15.0, time: None },
                    Point { x: 12.5, y: 18.2, time: None },
                    Point { x: 15.0, y: 22.0, time: None },
                ],
            }
        ];

        let compressed = compress_strokes(&original);
        assert!(compressed.compressed_byte_size < compressed.original_byte_size);
        assert!(compressed.compression_ratio_pct > 30.0);

        let restored = decompress_strokes(&compressed.payload).expect("Descompresión exitosa");
        assert_eq!(restored.len(), 1);
        assert_eq!(restored[0].id, "stroke-1");
        assert_eq!(restored[0].points.len(), 3);
        assert!((restored[0].points[1].x - 12.5).abs() < 0.15);
    }
}
