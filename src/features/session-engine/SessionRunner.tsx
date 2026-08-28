import type { StudyMethod } from "./methods";
import { CornellRunner } from "./runners/CornellRunner";
import { FeynmanRunner } from "./runners/FeynmanRunner";
import { InterleavingRunner } from "./runners/InterleavingRunner";
import { LeitnerRunner } from "./runners/LeitnerRunner";
import { PomodoroRunner } from "./runners/PomodoroRunner";
import { RecallRunner } from "./runners/RecallRunner";
import { SpacedRunner } from "./runners/SpacedRunner";
import { Sq3rRunner } from "./runners/Sq3rRunner";

interface SessionRunnerProps {
  method: StudyMethod;
  subjectFolderId: string | null;
  onHideDocument?: (hidden: boolean) => void;
}

/** Motor de sesión: un solo despachador, un componente de ejecución por método. */
export function SessionRunner({ method, subjectFolderId, onHideDocument }: SessionRunnerProps) {
  switch (method.structureType) {
    case "pomodoro":
      return <PomodoroRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "recall":
      return (
        <RecallRunner
          methodId={method.id}
          subjectFolderId={subjectFolderId}
          onHideDocument={onHideDocument}
        />
      );
    case "interleaving":
      return <InterleavingRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "feynman":
      return <FeynmanRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "cornell":
      return <CornellRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "sq3r":
      return <Sq3rRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "leitner":
      return <LeitnerRunner subjectFolderId={subjectFolderId} />;
    case "spaced":
      return <SpacedRunner subjectFolderId={subjectFolderId} />;
    default:
      return null;
  }
}
