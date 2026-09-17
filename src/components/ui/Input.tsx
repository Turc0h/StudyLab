import React from "react";
import { clsx } from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={clsx(
        "w-full rounded border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-primary/20 transition-all duration-150 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={clsx(
        "w-full rounded border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent-primary/20 transition-all duration-150 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};
