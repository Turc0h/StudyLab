import { useLayoutEffect } from "react";
import { useThemeStore } from "../stores/useThemeStore";

/** Aplica el tema activo como data-theme en <html> para que los tokens CSS lo tomen. */
export function useSyncTheme() {
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
}
