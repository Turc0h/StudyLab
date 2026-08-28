import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import type { StudyMethod } from "./methods";
import { studyMethods } from "./methods";

interface MethodDetailModalProps {
  method: StudyMethod | null;
  onClose: () => void;
}

export function MethodDetailModal({ method, onClose }: MethodDetailModalProps) {
  const navigate = useNavigate();
  if (!method) return null;

  return (
    <Modal open={!!method} onClose={onClose} title={method.name}>
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <h4 className="mb-1 text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Qué es
          </h4>
          <p className="text-text-secondary">{method.whatItIs}</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Por qué funciona
          </h4>
          <p className="text-text-secondary">{method.whyItWorks}</p>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Cómo se usa acá
          </h4>
          <p className="text-text-secondary">{method.howItWorksHere}</p>
        </div>
        {method.combinesWith.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Combina bien con
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {method.combinesWith.map((id) => {
                const other = studyMethods.find((m) => m.id === id);
                return other ? (
                  <Badge key={id} variant="neutral">
                    {other.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
        <Button onClick={() => navigate(`/session?method=${method.id}`)}>
          {method.structureType === "spaced" ? "Ver repasos" : "Empezar sesión"}
        </Button>
      </div>
    </Modal>
  );
}
