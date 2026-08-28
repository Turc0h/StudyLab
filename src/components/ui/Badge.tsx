import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

type Variant = "neutral" | "accent" | "danger" | "warning" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  neutral: "bg-bg-surface-2 text-text-secondary",
  accent: "bg-accent-muted text-accent",
  danger: "bg-danger-muted text-danger",
  warning: "bg-warning-muted text-warning",
  success: "bg-success-muted text-success",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide uppercase",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
