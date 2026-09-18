import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/600.css";
import "./index.css";

performance.mark("studylab-boot-start");

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerServiceWorker } from "./serviceWorkerRegistration";

registerServiceWorker();

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Medición precisa del primer renderizado visual (First Paint)
requestAnimationFrame(() => {
  performance.mark("studylab-first-paint");
  try {
    const measure = performance.measure(
      "studylab-cold-start",
      "studylab-boot-start",
      "studylab-first-paint",
    );
    console.info(
      `[StudyLab Performance] Cold start inicial completado en ${measure.duration.toFixed(1)} ms`,
    );
  } catch {
    // Ignorar si performance.measure no está disponible
  }
});

