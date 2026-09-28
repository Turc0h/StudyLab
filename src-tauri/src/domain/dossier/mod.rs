use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DossierConceptInput {
    pub name: String,
    pub mastery_score: f64,
    pub status: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DossierErrorInput {
    pub concept: String,
    pub category: String,
    pub explanation: String,
    pub fix: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DossierProofInput {
    pub theorem: String,
    pub step_count: usize,
    pub conclusion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicDossierInput {
    pub subject_name: String,
    pub career: Option<String>,
    pub student_name: Option<String>,
    pub concepts: Vec<DossierConceptInput>,
    pub errors: Vec<DossierErrorInput>,
    pub proofs: Vec<DossierProofInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicDossierOutput {
    pub title: String,
    pub html_content: String,
    pub byte_size: usize,
    pub section_count: usize,
    pub generated_at: String,
}

/// Compila un informe académico imprimible (Dossier A4) en HTML puro de alto contraste
pub fn compile_dossier(input: &AcademicDossierInput) -> AcademicDossierOutput {
    let now = chrono_free_timestamp();
    let career_str = input.career.as_deref().unwrap_or("Carrera de Grado");
    let student_str = input.student_name.as_deref().unwrap_or("Estudiante Universitario");

    let mut concept_rows = String::new();
    for c in &input.concepts {
        let score_pct = (c.mastery_score * 100.0).round();
        let badge_class = if c.mastery_score >= 0.8 {
            "color: #1e3a2f; background: #e8f5e9; border: 1px solid #c8e6c9;"
        } else if c.mastery_score >= 0.5 {
            "color: #4a3410; background: #fff8e1; border: 1px solid #ffecb3;"
        } else {
            "color: #4a151b; background: #ffebee; border: 1px solid #ffcdd2;"
        };

        concept_rows.push_str(&format!(
            "<tr>
                <td style=\"padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #e5e5e0;\">{}</td>
                <td style=\"padding: 8px 12px; border-bottom: 1px solid #e5e5e0;\"><span style=\"display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; {}\">{}% (Estado: {})</span></td>
                <td style=\"padding: 8px 12px; font-size: 12px; color: #444; border-bottom: 1px solid #e5e5e0;\">{}</td>
            </tr>",
            html_escape(&c.name),
            badge_class,
            score_pct,
            html_escape(&c.status),
            html_escape(&c.description)
        ));
    }

    let mut error_items = String::new();
    for err in &input.errors {
        error_items.push_str(&format!(
            "<div style=\"margin-bottom: 14px; padding: 12px; border-left: 3px solid #8b0000; background: #faf8f5;\">
                <div style=\"font-weight: bold; font-size: 13px;\">Concepto: {} <span style=\"font-size: 11px; font-weight: normal; color: #666;\">({})</span></div>
                <div style=\"font-size: 12px; margin-top: 4px; color: #333;\"><strong>Falla detectada:</strong> {}</div>
                <div style=\"font-size: 12px; margin-top: 4px; color: #1e3a2f;\"><strong>Ajuste epistémico:</strong> {}</div>
            </div>",
            html_escape(&err.concept),
            html_escape(&err.category),
            html_escape(&err.explanation),
            html_escape(&err.fix)
        ));
    }

    let mut proof_items = String::new();
    for p in &input.proofs {
        proof_items.push_str(&format!(
            "<div style=\"margin-bottom: 12px; padding: 10px 14px; border: 1px solid #d4d0c8; border-radius: 6px;\">
                <div style=\"font-weight: 600; font-size: 13px;\">Teorema: {}</div>
                <div style=\"font-size: 12px; color: #555; margin-top: 2px;\">Deducción en {} pasos de rigor. Conclusión: {}</div>
            </div>",
            html_escape(&p.theorem),
            p.step_count,
            html_escape(&p.conclusion)
        ));
    }

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Dossier Académico - {subject}</title>
<style>
  @page {{
    size: A4;
    margin: 1.8cm 1.5cm;
  }}
  body {{
    font-family: "Source Serif 4", "Lora", Georgia, serif;
    color: #1a1a18;
    background: #fff;
    margin: 0;
    padding: 20px;
    line-height: 1.5;
  }}
  h1 {{ font-size: 24px; font-weight: 700; margin-bottom: 4px; }}
  h2 {{ font-size: 16px; font-weight: 700; border-bottom: 1.5px solid #2d2a26; padding-bottom: 4px; margin-top: 28px; }}
  .meta {{ font-size: 12px; color: #555; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
  th {{ text-align: left; padding: 8px 12px; background: #f2efe9; border-bottom: 1.5px solid #2d2a26; }}
  .page-break {{ page-break-after: always; }}
  @media print {{
    body {{ padding: 0; }}
  }}
</style>
</head>
<body>
  <div>
    <div class="meta" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
      StudyLab &bull; Carpeta de Cátedra &bull; {career}
    </div>
    <h1>Dossier Académico: {subject}</h1>
    <div class="meta">
      <strong>Estudiante:</strong> {student} &bull; <strong>Fecha de Emisión:</strong> {date}
    </div>
  </div>

  <h2>1. Síntesis y Matriz de Dominio Conceptual</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Concepto Teórico</th>
        <th style="width: 25%;">Retención / Estado</th>
        <th style="width: 45%;">Definición y Alcance</th>
      </tr>
    </thead>
    <tbody>
      {concept_rows}
    </tbody>
  </table>

  <h2>2. Banco de Errores y Calibración Epistémica</h2>
  {error_items}

  <h2>3. Demostraciones y Deducciones Teóricas</h2>
  {proof_items}

  <div style="margin-top: 36px; padding-top: 12px; border-top: 1px dashed #aaa; font-size: 11px; color: #777; text-align: center;">
    Compilado de forma determinista y local por StudyLab Desktop en Rust. Documento apto para examen final y revisión de cátedra.
  </div>
</body>
</html>"#,
        subject = html_escape(&input.subject_name),
        career = html_escape(career_str),
        student = html_escape(student_str),
        date = now,
        concept_rows = if concept_rows.is_empty() { "<tr><td colspan=\"3\" style=\"padding: 12px; text-align: center; color: #777;\">Sin conceptos registrados.</td></tr>".into() } else { concept_rows },
        error_items = if error_items.is_empty() { "<p style=\"font-size: 12px; color: #777;\">Sin fallas críticas en el banco de errores.</p>".into() } else { error_items },
        proof_items = if proof_items.is_empty() { "<p style=\"font-size: 12px; color: #777;\">Sin demostraciones adjuntas para esta materia.</p>".into() } else { proof_items },
    );

    let byte_size = html.len();
    AcademicDossierOutput {
        title: format!("Dossier_{}", input.subject_name.replace(' ', "_")),
        html_content: html,
        byte_size,
        section_count: 3,
        generated_at: now,
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn chrono_free_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let days = secs / 86400;
    // Aproximación simple de fecha UTC
    let year = 1970 + days / 365;
    let day_of_year = days % 365;
    let month = 1 + day_of_year / 30;
    let day = 1 + day_of_year % 30;
    format!("{:04}-{:02}-{:02}", year, month.min(12), day.min(31))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_dossier_basic() {
        let input = AcademicDossierInput {
            subject_name: "Álgebra Lineal".into(),
            career: Some("Licenciatura en Matemática".into()),
            student_name: Some("Mauro".into()),
            concepts: vec![DossierConceptInput {
                name: "Transformaciones Lineales".into(),
                mastery_score: 0.92,
                status: "mastered".into(),
                description: "Mapeo que preserva suma vectorial y multiplicación escalar.".into(),
            }],
            errors: vec![],
            proofs: vec![DossierProofInput {
                theorem: "Teorema de la Dimensión".into(),
                step_count: 4,
                conclusion: "dim(V) = dim(ker(T)) + dim(im(T))".into(),
            }],
        };

        let output = compile_dossier(&input);
        assert!(output.html_content.contains("Álgebra Lineal"));
        assert!(output.html_content.contains("Transformaciones Lineales"));
        assert!(output.html_content.contains("Teorema de la Dimensión"));
        assert!(output.byte_size > 500);
    }
}