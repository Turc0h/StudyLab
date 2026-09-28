use tauri::command;
use crate::domain::search::{
    search_chunks, tokenize, AcademicChunkInput, SearchResultChunkDto,
};

#[command]
pub fn search_academic_chunks(
    query: String,
    chunks: Vec<AcademicChunkInput>,
    limit: Option<usize>,
) -> Result<Vec<SearchResultChunkDto>, String> {
    let lim = limit.unwrap_or(20);
    Ok(search_chunks(&query, &chunks, lim))
}

#[command]
pub fn tokenize_text_fast(text: String) -> Result<Vec<String>, String> {
    Ok(tokenize(&text))
}