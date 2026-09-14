import React from "react";
import { clsx } from "clsx";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 - 100
  max?: number;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={clsx(
        "h-1.5 w-full overflow-hidden rounded-full bg-border-subtle",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      {...props}
    >
      <div
        className="h-full bg-accent-primary transition-all duration-150 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
