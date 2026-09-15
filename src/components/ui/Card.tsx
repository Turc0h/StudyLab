import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border-subtle p-5 md:p-6 transition-colors duration-150 shadow-2xs",
        elevated ? "bg-bg-elevated" : "bg-bg-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, ...props }) => (
  <div className={clsx("mb-4 flex flex-col gap-1 border-b border-border-subtle pb-3", className)} {...props}>
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, ...props }) => (
  <h3 className={clsx("font-serif text-base md:text-lg font-semibold text-text-primary tracking-tight", className)} {...props}>
    {children}
  </h3>
);
