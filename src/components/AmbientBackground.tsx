import { useThemeStore } from "../stores/useThemeStore";

/**
 * Capa de fondo fija, detrás de todo el contenido (z-0). El contenido de la
 * app debe montarse en un contenedor con position:relative y z-index >= 1.
 */
export function AmbientBackground() {
  const ambientEnabled = useThemeStore((s) => s.ambientEnabled);

  return (
    <div className={ambientEnabled ? "" : "ambient-off"}>
      <div className="ambient-bg" aria-hidden="true" />
    </div>
  );
}
