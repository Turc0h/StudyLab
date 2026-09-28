use tauri::command;
use crate::domain::dossier::{
    compile_dossier, AcademicDossierInput, AcademicDossierOutput,
};

#[command]
pub fn compile_academic_dossier(
    payload: AcademicDossierInput,
) -> Result<AcademicDossierOutput, String> {
    Ok(compile_dossier(&payload))
}