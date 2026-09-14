import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2;
  padding?: "none" | "sm" | "md" | "lg";
  glass?: boolean;
  interactive?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/** Panel elevado — microbordes futuristas, opción glassmorphism y elevación sutil. */
export function Surface({
  level = 1,
  padding = "md",
  glass = true,
  interactive = false,
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={clsx(
        "rounded-lg transition-all duration-200",
        glass
          ? "glass-panel"
          : level === 1
            ? "border border-border-subtle bg-bg-surface shadow-[var(--shadow-surface)]"
            : "border border-border bg-bg-surface-2 shadow-[var(--shadow-surface)]",
        interactive && "glass-panel-interactive cursor-pointer",
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
