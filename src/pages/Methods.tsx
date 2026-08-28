import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MethodCard } from "../features/session-engine/MethodCard";
import { MethodDetailModal } from "../features/session-engine/MethodDetailModal";
import type { StudyMethod } from "../features/session-engine/methods";
import { studyMethods } from "../features/session-engine/methods";

export function Methods() {
  const [selected, setSelected] = useState<StudyMethod | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Selector de métodos"
        title="Métodos"
        description="8 técnicas de estudio con respaldo científico, todas sobre el mismo motor de sesión. Elegí una para ver la ficha completa."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studyMethods.map((method) => (
          <MethodCard key={method.id} method={method} onClick={() => setSelected(method)} />
        ))}
      </div>

      <MethodDetailModal method={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
