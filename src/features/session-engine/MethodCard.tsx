import { Clock, Repeat } from "lucide-react";
import { Surface } from "../../components/ui/Surface";
import type { StudyMethod } from "./methods";

interface MethodCardProps {
  method: StudyMethod;
  onClick: () => void;
}

export function MethodCard({ method, onClick }: MethodCardProps) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Surface
        padding="md"
        className="flex h-full flex-col gap-3 transition-colors duration-150 hover:bg-bg-surface-hover"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-text-primary">{method.name}</h3>
          <div className="flex shrink-0 items-center gap-1.5 text-text-tertiary">
            {method.hasTimer && <Clock size={14} strokeWidth={1.75} />}
            {method.cyclic && <Repeat size={14} strokeWidth={1.75} />}
          </div>
        </div>
        <p className="text-sm text-text-secondary">{method.shortDescription}</p>
      </Surface>
    </button>
  );
}
