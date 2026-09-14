# StudyLab

## 📚 Project Overview
StudyLab is a **local‑first** desktop/web application that helps university students organize, annotate, and actively study their academic materials. It combines evidence‑based study techniques, PDF annotation, OCR, ambient sound, and a knowledge graph – all **offline** with no backend or user accounts required.

---

## ✨ Core Features
- **File ingestion** – Drag‑and‑drop upload of PDF, Markdown, and DOCX files. The backend parses the content, extracts hierarchical structure (chapters, sections, theorems) and stores it as semantic chunks.
- **Semantic search & retrieval** – Vector database + relational concept graph for fast, context‑aware retrieval of passages.
- **Study‑Method catalog** – A scientific catalog of eight evidence‑based methods (Pomodoro, Feynman, Leitner, etc.) with detailed descriptions, protocol steps and suitability tips.
- **Method selection UI** – New panel with category filters, method cards, preview modal and one‑click start flow.
- **Local‑first data store** – All data lives in IndexedDB via `src/lib/db.ts`; no external APIs.
- **Theme & accessibility** – Dark / light mode toggle, keyboard‑friendly navigation, responsive layout.
- **Global tutorial modal** – Interactive walkthrough for first‑time users.

---

## 🛠️ Tech Stack (non‑negotiable)
| Layer | Technology |
|-------|------------|
| Frontend | **React 18** + **Vite** |
| Language | **TypeScript** (strict mode) |
| UI Library | Custom component library (`src/components/ui/*`) – built with Tailwind CSS |
| State Management | **Zustand** stores (`useThemeStore`, `useTutorialStore`, etc.) |
| Data Persistence | **IndexedDB** via `src/lib/db.ts` |
| Vector Search | **FAISS‑like** in‑browser vector store (via `src/lib/vectorStore.ts`) |
| Graph | In‑memory concept graph serialized to IndexedDB |
| Testing | **Vitest** + **React Testing Library** |
| Lint/Format | **ESLint**, **Prettier** |

---

## 📦 Installation & Development
```bash
# Clone the repository (replace with your fork if needed)
git clone <repo-url>
cd StudyLab

# Install dependencies (uses npm; you can also use pnpm or yarn)
npm install

# Start the development server
npm run dev
```
The app will be served at `http://localhost:5173`. All file ingestion and data storage happen locally in the browser.

### Build for Production
```bash
npm run build   # Generates a static bundle in ./dist
```
You can serve the `dist` folder with any static file server (e.g., `npx serve dist`).

### Lint & Formatting
```bash
npm run lint   # Lints the codebase (0 warnings/0 errors)
npm run format # Runs prettier
```

### Tests
```bash
npm test       # Runs Vitest unit tests
```

---

## 📁 Repository Structure
```
StudyLab/
├─ public/                     # Static assets (favicon, manifest, etc.)
├─ src/
│   ├─ App.tsx                # Root router & layout
│   ├─ components/            # UI primitives and layout components
│   │   ├─ layout/            # Sidebar, Header, Shell
│   │   ├─ ui/                # Button, Card, Dialog, Badge, etc.
│   │   └─ study-methods/    # MethodPreviewModal, MethodCard, etc.
│   ├─ data/                  # studyMethodsData.ts (catalog of methods)
│   ├─ pages/                 # Route components (Dashboard, MethodsPage, ...)
│   ├─ lib/                   # IndexedDB wrapper, vector store, utilities
│   └─ features/              # Session engine, method runners
├─ vite.config.ts              # Vite configuration
├─ tsconfig.json               # TypeScript strict config
├─ package.json                # Scripts, dependencies
└─ README.md                  # ← This file
```

---

## 🗂️ Detailed Architecture
### 1. Ingestion Pipeline (`/api/academic/sources/ingest`)
- **Frontend**: `FileUploader` component (drag‑and‑drop) sends a multipart request to the backend endpoint.
- **Backend** (Node/Electron‑style local server):
  1. **OCR & PDF parsing** – Uses `pdfjs` + `tesseract.js` for text extraction and LaTeX formula detection.
  2. **AST construction** – Generates a hierarchical AST (chapter → section → theorem) preserving academic structure.
  3. **Semantic chunking** – Splits the AST into meaningful chunks, each with metadata (page, heading hierarchy, token range).
  4. **Embedding** – Calls the on‑device embedding model to produce vectors for each chunk.
  5. **Storage** – Persists chunks in IndexedDB, vectors in the in‑browser vector store, and builds concept‑graph edges based on extracted entities.

### 2. Retrieval Layer
- **Vector DB** – Approximate nearest‑neighbor search over chunk embeddings.
- **Concept Graph** – Relational graph stored in IndexedDB linking concepts across courses (e.g., "Fourier Transform" ↔ "Signal Processing").
- **Hybrid query** – Retrieves top‑k vectors, then expands results via graph traversal to surface related concepts.

### 3. Study‑Method Engine
- **Catalog (`src/data/studyMethodsData.ts`)** – TypeScript array defining each method’s metadata.
- **MethodsPage UI** – Category filter pills, method cards, preview modal, and lazy‑loaded runner components.
- **Runner components** – Located in `src/features/session-engine/*`; each implements the specific interaction flow (timers, flashcards, etc.).
- **URL param `run`** – Directly opens a method runner; useful for deep‑linking from Dashboard.

---

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/your‑feature`).
3. Follow the existing code style (ESLint + Prettier). No `any` types unless justified – add a comment explaining why.
4. Write unit tests for new logic.
5. Run `npm run lint` and `npm test` locally.
6. Submit a Pull Request with a clear description.

Please keep the **local‑first** principle: avoid adding external API calls or authentication flows.

---

## 📄 License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

## 📞 Contact & Support
- **Maintainer**: <your‑name> – email@example.com
- **Issue tracker**: Use the GitHub Issues page.
- **Feature requests**: Open a discussion or submit a PR.

---

*Happy studying!*
