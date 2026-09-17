import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-subtle bg-bg-surface/50 p-8 md:p-12 text-center transition-all duration-150">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary shadow-2xs">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <h3 className="font-serif text-base font-semibold text-text-primary tracking-tight">{title}</h3>
        <p className="text-xs md:text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
