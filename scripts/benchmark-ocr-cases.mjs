import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

// Implementación espejo de la heurística de whiteboardEngine.ts
function heuristicOcrToLatex(rawText) {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Símbolos comunes mal leídos
  cleaned = cleaned.replace(/[∫|]|\bint\b/gi, '\\int ');
  cleaned = cleaned.replace(/∑|\bsum\b/gi, '\\sum ');
  cleaned = cleaned.replace(/√|\bsqrt\b/gi, '\\sqrt ');
  cleaned = cleaned.replace(/([a-zA-Z0-9])\s*[\^~]\s*([0-9a-zA-Z])/g, '$1^{$2}');
  cleaned = cleaned.replace(/([a-zA-Z0-9]+)\s*[/÷]\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
  cleaned = cleaned.replace(/\bpi\b|π/gi, '\\pi ');
  cleaned = cleaned.replace(/\balpha\b|α/gi, '\\alpha ');
  cleaned = cleaned.replace(/\bbeta\b|β/gi, '\\beta ');
  cleaned = cleaned.replace(/\btheta\b|θ/gi, '\\theta ');
  cleaned = cleaned.replace(/\binf(?:inity)?\b|∞/gi, '\\infty ');
  cleaned = cleaned.replace(/<=|≤/g, '\\le ');
  cleaned = cleaned.replace(/>=|≥/g, '\\ge ');
  cleaned = cleaned.replace(/!=|≠/g, '\\ne ');
  cleaned = cleaned.replace(/->|→/g, '\\to ');

  return cleaned.trim();
}

// Preprocesamiento de simulación: binarización de contraste y escalado
function preprocessCanvas(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Fondo simulado de pizarra (oscuro con trazo claro) -> Inversión y binarización
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Si el fondo es oscuro (< 100), invertir: el trazo claro pasa a ser negro sobre blanco
    const inverted = 255 - lum;
    // Umbralización suave
    const binary = inverted < 140 ? 0 : 255;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Escalar x2 para ayudar a Tesseract
  const scaled = createCanvas(width * 2, height * 2);
  const sCtx = scaled.getContext('2d');
  sCtx.imageSmoothingEnabled = false;
  sCtx.drawImage(canvas, 0, 0, width * 2, height * 2);
  return scaled;
}

async function runBenchmark() {
  console.log('--- INICIANDO BENCHMARK OCR TESSERACT.JS PARA PIZARRA ---');
  const worker = await createWorker('eng');

  const testCases = [
    {
      name: 'Dígito suelto (5)',
      draw: (ctx) => {
        // Dibujamos un 5 estilo manuscrito
        ctx.beginPath();
        ctx.moveTo(70, 40);
        ctx.lineTo(40, 40);
        ctx.lineTo(38, 70);
        ctx.bezierCurveTo(55, 60, 75, 75, 70, 95);
        ctx.bezierCurveTo(65, 115, 35, 115, 30, 95);
        ctx.stroke();
      },
      expected: '5',
    },
    {
      name: 'Dígito suelto (8)',
      draw: (ctx) => {
        // Dibujamos un 8 estilo manuscrito
        ctx.beginPath();
        ctx.arc(50, 50, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(50, 85, 23, 0, Math.PI * 2);
        ctx.stroke();
      },
      expected: '8',
    },
    {
      name: 'Potencia simple (x^2)',
      draw: (ctx) => {
        // Dibujar 'x'
        ctx.beginPath();
        ctx.moveTo(30, 60); ctx.lineTo(60, 100);
        ctx.moveTo(60, 60); ctx.lineTo(30, 100);
        ctx.stroke();
        // Dibujar '2' en superíndice
        ctx.beginPath();
        ctx.moveTo(70, 45);
        ctx.bezierCurveTo(70, 35, 88, 35, 88, 48);
        ctx.lineTo(70, 65);
        ctx.lineTo(92, 65);
        ctx.stroke();
      },
      expected: 'x^{2}',
    },
    {
      name: 'Integral simple (∫ x dx)',
      draw: (ctx) => {
        // Signo integral alargado
        ctx.beginPath();
        ctx.moveTo(35, 35);
        ctx.bezierCurveTo(25, 25, 15, 45, 25, 75);
        ctx.bezierCurveTo(30, 95, 20, 115, 15, 110);
        ctx.stroke();

        // x
        ctx.beginPath();
        ctx.moveTo(40, 65); ctx.lineTo(55, 95);
        ctx.moveTo(55, 65); ctx.lineTo(40, 95);
        ctx.stroke();

        // d
        ctx.beginPath();
        ctx.arc(70, 83, 10, 0, Math.PI * 2);
        ctx.moveTo(80, 55); ctx.lineTo(80, 95);
        ctx.stroke();

        // x
        ctx.beginPath();
        ctx.moveTo(90, 65); ctx.lineTo(105, 95);
        ctx.moveTo(105, 65); ctx.lineTo(90, 95);
        ctx.stroke();
      },
      expected: '\\int x dx',
    },
    {
      name: 'Fracción simple (a/b)',
      draw: (ctx) => {
        // Barra horizontal de fracción
        ctx.beginPath();
        ctx.moveTo(30, 75); ctx.lineTo(80, 75);
        ctx.stroke();

        // Numerador 'a'
        ctx.beginPath();
        ctx.arc(50, 50, 10, 0, Math.PI * 2);
        ctx.moveTo(60, 40); ctx.lineTo(60, 60);
        ctx.stroke();

        // Denominador 'b'
        ctx.beginPath();
        ctx.moveTo(45, 85); ctx.lineTo(45, 115);
        ctx.arc(55, 103, 10, 0, Math.PI * 2);
        ctx.stroke();
      },
      expected: '\\frac{a}{b}',
    },
  ];

  const results = [];

  for (const tc of testCases) {
    const canvas = createCanvas(140, 140);
    const ctx = canvas.getContext('2d');

    // Fondo pizarra oscura (#181F1C)
    ctx.fillStyle = '#181F1C';
    ctx.fillRect(0, 0, 140, 140);

    // Trazos claros con tiza
    ctx.strokeStyle = '#EAE8DF';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    tc.draw(ctx);

    // Preprocesar imagen
    const processedCanvas = preprocessCanvas(canvas);
    const buffer = processedCanvas.toBuffer('image/png');

    const res = await worker.recognize(buffer);
    const rawText = res.data.text.trim();
    const latexHeuristic = heuristicOcrToLatex(rawText);
    const confidence = res.data.confidence;

    const hitExact = rawText.includes(tc.expected) || latexHeuristic.includes(tc.expected);
    const hitPartial = hitExact || (tc.expected.length > 0 && rawText.length > 0);

    results.push({
      name: tc.name,
      expected: tc.expected,
      rawOcr: rawText.replace(/\n/g, ' '),
      latexResult: latexHeuristic.replace(/\n/g, ' '),
      confidence: confidence.toFixed(1) + '%',
      status: hitExact ? 'ACIERTO EXACTO' : hitPartial ? 'ACIERTO PARCIAL' : 'FALLO TOTAL',
    });
  }

  await worker.terminate();

  console.table(results);
  console.log('\n--- CONCLUSIÓN DEL BENCHMARK ---');
  const exactHits = results.filter((r) => r.status === 'ACIERTO EXACTO').length;
  console.log(`Tasa de acierto exacto: ${exactHits}/${results.length} (${((exactHits / results.length) * 100).toFixed(0)}%)`);
}

runBenchmark().catch(console.error);
