import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Convierte texto con delimitadores de LaTeX a HTML usando KaTeX.
 * Soporta:
 * - Display math: `$$...$$` y `\[...\]`
 * - Inline math: `$..$` y `\(...\)`
 */
export function renderLatexToHtml(content: string): string {
  if (!content) return "";

  // 1. Normalizar delimitadores \[...\] a $$...$$ y \(...\) a $...$
  let text = content
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, eq) => `$$${eq}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, eq) => `$${eq}$`);

  // 2. Si no tiene signos de dólar, escapar HTML básico y retornar
  if (!text.includes("$")) {
    return escapeHtml(text).replace(/\n/g, "<br />");
  }

  // 3. Separar por display math primero ($$...$$) y luego inline math ($...$)
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return parts
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const formula = part.slice(2, -2).trim();
        try {
          return `<div class="katex-display-wrapper my-3 overflow-x-auto py-1 text-center">${katex.renderToString(
            formula,
            { displayMode: true, throwOnError: false },
          )}</div>`;
        } catch {
          return `<div class="katex-error text-xs text-red-500 font-mono bg-red-50 p-2 rounded">${escapeHtml(
            part,
          )}</div>`;
        }
      } else if (part.startsWith("$") && part.endsWith("$")) {
        const formula = part.slice(1, -1).trim();
        try {
          return `<span class="katex-inline px-0.5">${katex.renderToString(formula, {
            displayMode: false,
            throwOnError: false,
          })}</span>`;
        } catch {
          return `<span class="katex-error text-xs text-red-500 font-mono">${escapeHtml(
            part,
          )}</span>`;
        }
      } else {
        return escapeHtml(part).replace(/\n/g, "<br />");
      }
    })
    .join("");
}

/**
 * Plantillas matemáticas comunes para insertar en apuntes y libros.
 */
export const LATEX_SNIPPETS = [
  { label: "Fracción", snippet: "\\frac{a}{b}", preview: "a/b" },
  { label: "Potencia", snippet: "x^{2}", preview: "x²" },
  { label: "Subíndice", snippet: "x_{i}", preview: "xᵢ" },
  { label: "Raíz", snippet: "\\sqrt{x}", preview: "√x" },
  { label: "Integral", snippet: "\\int_{a}^{b} f(x)\\,dx", preview: "∫" },
  { label: "Sumatoria", snippet: "\\sum_{i=1}^{n} x_i", preview: "∑" },
  { label: "Límite", snippet: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x}", preview: "lim" },
  { label: "Ecuación", snippet: "$$E = mc^2$$", preview: "E=mc²" },
  { label: "Matriz", snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", preview: "[matrix]" },
  { label: "Letras Griegas", snippet: "\\alpha, \\beta, \\theta, \\lambda, \\pi", preview: "α, β, θ" },
];

/**
 * Analiza texto reconocido por OCR y busca patrones matemáticos comunes
 * para envolverlos en delimitadores `$..$` o `$$..$$` de LaTeX.
 */
export function autoFormatMathToLatex(text: string): string {
  if (!text) return "";

  // Si ya tiene delimitadores $, no sobrescribir agresivamente
  let result = text;

  // 1. Detectar ecuaciones de display aisladas en su propia línea (ej: y = mx + b o f(x) = ...)
  // que contengan operadores como =, \approx, \le, \ge, etc.
  const lines = result.split("\n");
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Si ya tiene $, no tocar
    if (trimmed.startsWith("$") && trimmed.endsWith("$")) return line;

    // Patrón de ecuación destacada: ej. "f(x) = (x^2 + 1)/(x - 1)" o "a^2 + b^2 = c^2"
    const isStandaloneEquation =
      /^[A-Za-z0-9\(\)\s+\-*/^_=<>|.,\\{}]{4,80}$/.test(trimmed) &&
      /[=<>≤≥≈]/.test(trimmed) &&
      /[0-9a-zA-Z]/.test(trimmed) &&
      /[\^_{}\\\/]|(\b[a-zA-Z]\([a-zA-Z0-9]+\))/.test(trimmed);

    if (isStandaloneEquation) {
      const latexEq = convertSimpleMathToLatex(trimmed);
      return `$$${latexEq}$$`;
    }

    return line;
  });

  result = processedLines.join("\n");

  // 2. Reemplazos comunes de símbolos OCR defectuosos a sintaxis LaTeX
  result = result
    .replace(/\b([a-zA-Z])\^([0-9a-zA-Z]+)\b/g, "$$$1^{$2}$$$") // x^2 -> $x^{2}$
    .replace(/√([0-9a-zA-Z()]+)/g, "$\\sqrt{$1}$") // √x -> $\sqrt{x}$
    .replace(/\bint_([0-9a-zA-Z]+)\^([0-9a-zA-Z]+)\b/g, "$\\int_{$1}^{$2}$")
    .replace(/\bsum_([0-9a-zA-Z]+)\^([0-9a-zA-Z]+)\b/g, "$\\sum_{$1}^{$2}$")
    .replace(/\b(alpha|beta|gamma|theta|lambda|pi|sigma|omega)\b/gi, (match) => `$\\${match.toLowerCase()}$`);

  return result;
}

/**
 * Convierte expresiones aritméticas simples a sintaxis limpia de LaTeX.
 */
function convertSimpleMathToLatex(expr: string): string {
  return expr
    .replace(/\*/g, " \\cdot ")
    .replace(/<=/g, " \\le ")
    .replace(/>=/g, " \\ge ")
    .replace(/!=/g, " \\neq ")
    .replace(/->/g, " \\to ")
    .replace(/<->/g, " \\leftrightarrow ");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
