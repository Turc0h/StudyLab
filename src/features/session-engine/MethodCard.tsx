import { Clock, Repeat } from "lucide-react";
import { Surface } from "../../components/ui/Surface";
import type { StudyMethod } from "./methods";

interface MethodCardProps {
  method: StudyMethod;
  onClick: () => void;
}

export function MethodCard({ method, onClick }: MethodCardProps) {
  return (
    <button type="button" onClick={onClick} className="text-left w-full h-full">
      <Surface
        padding="md"
        glass={true}
        interactive={true}
        className="flex h-full flex-col justify-between gap-3 border border-border-subtle/80 transition-all duration-200"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
              // METHOD_{method.id.toUpperCase().slice(0, 4)}
            </span>
            <div className="flex shrink-0 items-center gap-1.5 text-text-tertiary">
              {method.hasTimer && (
                <span title="Temporizado" className="flex items-center gap-1 rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  <Clock size={11} strokeWidth={2} />
                  TIMER
                </span>
              )}
              {method.cyclic && (
                <span title="Por ciclos" className="flex items-center gap-1 rounded bg-bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                  <Repeat size={11} strokeWidth={2} />
                  CICLOS
                </span>
              )}
            </div>
          </div>
          <h3 className="font-display text-base font-bold text-text-primary">{method.name}</h3>
          <p className="text-xs leading-relaxed text-text-secondary">{method.shortDescription}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle/50 pt-2 font-mono text-[11px] text-text-tertiary">
          <span>VER DETALLES</span>
          <span className="text-accent">→</span>
        </div>
      </Surface>
    </button>
  );
}
