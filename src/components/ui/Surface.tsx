import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: 1 | 2;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

/** Panel elevado — separación por contraste sutil, sin bordes duros. */
export function Surface({ level = 1, padding = "md", className, ...props }: SurfaceProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border-subtle",
        level === 1 ? "bg-bg-surface" : "bg-bg-surface-2",
        "shadow-[var(--shadow-surface)]",
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
