import { useCssVar } from "../../hooks/useCssVar";
import type { Theme } from "../../stores/useThemeStore";

interface ColorSwatchProps {
  varName: string;
  label: string;
  role: string;
  theme: Theme;
  textOn?: "light" | "dark";
}

export function ColorSwatch({ varName, label, role, theme, textOn = "light" }: ColorSwatchProps) {
  const hex = useCssVar(varName, theme);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 rounded-md border border-border-subtle flex items-end p-2"
        style={{ backgroundColor: `var(${varName})` }}
      >
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color: textOn === "light" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)" }}
        >
          {hex}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">{role}</p>
      </div>
    </div>
  );
}
