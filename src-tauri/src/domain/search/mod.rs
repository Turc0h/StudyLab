use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicChunkInput {
    pub id: String,
    pub title: Option<String>,
    pub raw_content: String,
    pub hierarchy_path: Option<String>,
    pub page_number: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultChunkDto {
    pub id: String,
    pub title: String,
    pub snippet: String,
    pub hierarchy_path: String,
    pub page_number: i32,
    pub score: f64,
    pub matched_terms: Vec<String>,
}

/// Tokeniza texto en minúsculas, descartando caracteres no alfanuméricos y palabras vacías.
pub fn tokenize(text: &str) -> Vec<String> {
    let stopwords = [
        "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "pero",
        "por", "para", "con", "en", "sobre", "del", "al", "se", "que", "es", "son",
        "the", "a", "an", "and", "or", "in", "on", "at", "by", "for", "with", "is", "are"
    ];

    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric() && c != '_')
        .filter(|t| !t.is_empty() && t.len() >= 2)
        .filter(|t| !stopwords.contains(t))
        .map(|t| t.to_string())
        .collect()
}

/// Motor de búsqueda FTS con cálculo de relevancia basado en frecuencia de términos,
/// coincidencias en título y jerarquía, y tolerancia por prefijo.
pub fn search_chunks(
    query: &str,
    chunks: &[AcademicChunkInput],
    limit: usize,
) -> Vec<SearchResultChunkDto> {
    let query_tokens = tokenize(query);
    if query_tokens.is_empty() || chunks.is_empty() {
        return Vec::new();
    }

    let mut scored: Vec<(f64, Vec<String>, &AcademicChunkInput)> = Vec::new();

    for chunk in chunks {
        let title_tokens = tokenize(chunk.title.as_deref().unwrap_or(""));
        let hierarchy_tokens = tokenize(chunk.hierarchy_path.as_deref().unwrap_or(""));
        let content_tokens = tokenize(&chunk.raw_content);

        let mut score = 0.0;
        let mut matched = Vec::new();

        for q in &query_tokens {
            let mut term_score = 0.0;

            // Coincidencia exacta en título (peso alto: +15)
            if title_tokens.iter().any(|t| t == q) {
                term_score += 15.0;
            } else if title_tokens.iter().any(|t| t.starts_with(q)) {
                term_score += 7.0;
            }

            // Coincidencia en jerarquía / sección (peso medio: +8)
            if hierarchy_tokens.iter().any(|t| t == q) {
                term_score += 8.0;
            }

            // Frecuencia en contenido (+3 por coincidencia, amortiguada)
            let content_matches = content_tokens.iter().filter(|t| *t == q).count();
            if content_matches > 0 {
                term_score += 3.0 + (content_matches as f64).ln_1p() * 2.0;
            } else if content_tokens.iter().any(|t| t.starts_with(q)) {
                term_score += 1.5;
            }

            if term_score > 0.0 {
                score += term_score;
                matched.push(q.clone());
            }
        }

        // Bonificación por cobertura de consulta (% de palabras clave encontradas)
        let coverage = matched.len() as f64 / query_tokens.len() as f64;
        if coverage > 0.0 {
            score *= 1.0 + coverage;
            scored.push((score, matched, chunk));
        }
    }

    // Ordenar descendente por puntuación
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    scored
        .into_iter()
        .take(limit)
        .map(|(score, matched_terms, chunk)| {
            // Extraer snippet representativo
            let snippet = create_snippet(&chunk.raw_content, &matched_terms, 160);
            SearchResultChunkDto {
                id: chunk.id.clone(),
                title: chunk.title.clone().unwrap_or_else(|| "Fragmento Académico".to_string()),
                snippet,
                hierarchy_path: chunk.hierarchy_path.clone().unwrap_or_default(),
                page_number: chunk.page_number.unwrap_or(1),
                score: (score * 100.0).round() / 100.0,
                matched_terms,
            }
        })
        .collect()
}

fn create_snippet(content: &str, matched_terms: &[String], max_len: usize) -> String {
    if content.len() <= max_len {
        return content.to_string();
    }

    // Buscar la posición de la primera coincidencia
    let lower = content.to_lowercase();
    let mut best_pos = 0;
    for term in matched_terms {
        if let Some(pos) = lower.find(term) {
            best_pos = pos;
            break;
        }
    }

    let start = best_pos.saturating_sub(max_len / 4);
    let mut end = (start + max_len).min(content.len());

    // Ajustar a límites de palabras limpios
    while end < content.len() && !content.is_char_boundary(end) {
        end += 1;
    }

    let slice = &content[start..end];
    let prefix = if start > 0 { "..." } else { "" };
    let suffix = if end < content.len() { "..." } else { "" };

    format!("{}{}{}", prefix, slice.trim(), suffix)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize_basic() {
        let tokens = tokenize("Teorema de Nyquist-Shannon y Frecuencia de Muestreo");
        assert!(tokens.contains(&"teorema".to_string()));
        assert!(tokens.contains(&"nyquist".to_string()));
        assert!(tokens.contains(&"shannon".to_string()));
        assert!(tokens.contains(&"frecuencia".to_string()));
        assert!(tokens.contains(&"muestreo".to_string()));
        assert!(!tokens.contains(&"de".to_string()));
        assert!(!tokens.contains(&"y".to_string()));
    }

    #[test]
    fn test_search_chunks_ranking() {
        let chunks = vec![
            AcademicChunkInput {
                id: "c1".into(),
                title: Some("Teorema de Nyquist".into()),
                raw_content: "La frecuencia de muestreo debe ser el doble de la máxima.".into(),
                hierarchy_path: Some("Capítulo 3 > Telecomunicaciones".into()),
                page_number: Some(42),
            },
            AcademicChunkInput {
                id: "c2".into(),
                title: Some("Introducción al Álgebra".into()),
                raw_content: "Espacios vectoriales y transformaciones lineales.".into(),
                hierarchy_path: Some("Capítulo 1".into()),
                page_number: Some(5),
            },
        ];

        let results = search_chunks("nyquist muestreo", &chunks, 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "c1");
        assert!(results[0].score > 10.0);
    }
}