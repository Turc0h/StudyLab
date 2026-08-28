import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-10 w-full rounded-md border border-border bg-bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors duration-150 focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}
