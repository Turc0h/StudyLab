import React from "react";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium rounded border transition-colors duration-150 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  }[size];

  const variantStyles = {
    primary:
      "bg-accent-primary text-bg-elevated border-transparent hover:bg-accent-hover focus:ring-1 focus:ring-accent-primary",
    secondary:
      "bg-accent-secondary text-bg-elevated border-transparent hover:opacity-90 focus:ring-1 focus:ring-accent-secondary",
    outline:
      "bg-bg-elevated text-text-primary border-border-subtle hover:bg-bg-secondary focus:ring-1 focus:ring-border-subtle",
    ghost:
      "bg-transparent text-text-secondary border-transparent hover:bg-bg-secondary hover:text-text-primary",
    danger:
      "bg-error text-bg-elevated border-transparent hover:opacity-90 focus:ring-1 focus:ring-error",
  }[variant];

  return (
    <button
      className={clsx(baseStyles, sizeStyles, variantStyles, className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
