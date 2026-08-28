import type { PropsWithChildren, ReactNode } from "react";

interface PageHeaderProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-border-subtle pb-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
            {eyebrow}
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="max-w-xl text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </header>
  );
}
