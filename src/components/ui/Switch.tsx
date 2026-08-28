import { clsx } from "clsx";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-10 shrink-0 rounded-md border transition-colors duration-150",
          checked ? "bg-accent border-transparent" : "bg-bg-surface-2 border-border",
        )}
      >
        <span
          className={clsx(
            "absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 rounded-sm bg-white transition-transform duration-150",
            checked && "translate-x-4.5",
          )}
        />
      </button>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </label>
  );
}
