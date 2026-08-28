import { useEffect, useState } from "react";
import type { Theme } from "../stores/useThemeStore";

/** Lee el valor resuelto de una variable CSS en :root, recalculado cuando cambia el tema. */
export function useCssVar(name: string, theme: Theme) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    setValue(v);
  }, [name, theme]);

  return value;
}
