import type { PropsWithChildren, ReactNode } from "react";

interface SectionProps extends PropsWithChildren {
  index: string;
  title: string;
  description?: ReactNode;
}

export function Section({ index, title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3 border-b border-border-subtle pb-4">
        <span className="font-mono text-xs text-accent tabular-nums">{index}</span>
        <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
      </div>
      {description && <p className="max-w-2xl text-sm text-text-secondary">{description}</p>}
      {children}
    </section>
  );
}
