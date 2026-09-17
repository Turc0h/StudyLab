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
    "inline-flex items-center justify-center font-sans font-medium rounded-md border transition-colors duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  }[size];

  const variantStyles = {
    primary:
      "bg-accent-primary text-bg-elevated border-transparent hover:bg-accent-hover focus-visible:ring-accent-primary",
    secondary:
      "bg-accent-secondary text-bg-elevated border-transparent hover:opacity-90 focus-visible:ring-accent-secondary",
    outline:
      "bg-bg-elevated text-text-primary border-border-subtle hover:bg-bg-secondary focus-visible:ring-accent-primary",
    ghost:
      "bg-transparent text-text-secondary border-transparent hover:bg-bg-secondary hover:text-text-primary focus-visible:ring-accent-primary shadow-none",
    danger:
      "bg-error text-bg-elevated border-transparent hover:opacity-90 focus-visible:ring-error",
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
