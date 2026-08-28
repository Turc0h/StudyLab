# StudyLab

Plataforma web de estudio local-first para estudiantes universitarios: 8 métodos de estudio con
respaldo científico sobre un motor de sesión único, gestor de archivos con visor de documentos y
anotación (subrayado, post-its, OCR), y dashboard de progreso — todo en el navegador (IndexedDB),
con un backend opcional recién para Google Calendar.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4 · Zustand · Dexie.js (IndexedDB) ·
  pdfjs-dist · Tesseract.js
- **Backend (opcional, Fase 9)**: Node + Express + `googleapis`, en `server/`

## Desarrollo

```bash
npm install
npm run dev              # http://localhost:5173
```

El backend (`server/`) solo hace falta para conectar Google Calendar — ver
[CHANGELOG.md](./CHANGELOG.md#fase-9--backend--google-calendar) para cómo levantarlo. Todo lo
demás funciona sin él.

## Estado

Fases 0 a 10 del plan original construidas. **[CHANGELOG.md](./CHANGELOG.md) es la referencia
completa**: qué se hizo en cada fase, en qué archivos, y qué se simplificó a propósito —
consultalo antes de pedir un cambio, para saber dónde tocar y qué convención ya existe.

La página de estilo/kit (`/kit`) sigue viva como referencia del sistema de diseño (paleta,
tipografía, componentes base) — no está en la navegación principal, es documentación interna.
