import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerServiceWorker } from "./serviceWorkerRegistration";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

