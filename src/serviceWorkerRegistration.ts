/**
 * Registro de Service Worker para StudyLab CognitiveOS v5.0
 * Permite instalación PWA y funcionamiento offline real (Sección 29-BIS).
 */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    // En desarrollo nunca registrar service worker para no romper HMR ni servir módulos cacheados obsoletos
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // Nueva versión disponible
                  window.dispatchEvent(
                    new CustomEvent("studylab:new-version-available", {
                      detail: { registration },
                    }),
                  );
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn("ServiceWorker registration skipped or failed:", error);
        });
    });
  }
}
