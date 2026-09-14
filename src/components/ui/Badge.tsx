import React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "secondary" | "success" | "warning" | "error" | "danger";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className,
  ...props
}) => {
  const variantStyles = {
    neutral: "bg-bg-secondary text-text-secondary border-border-subtle",
    accent: "bg-accent-primary/10 text-accent-primary border-accent-primary/20",
    secondary: "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    error: "bg-error/10 text-error border-error/20",
    danger: "bg-error/10 text-error border-error/20",
  }[variant];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-sans font-medium",
        variantStyles,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
