import type { StudyMethod } from "./methods";
import { CornellRunner } from "./runners/CornellRunner";
import { DynamicInterleavingRunner } from "./runners/DynamicInterleavingRunner";
import { LeitnerRunner } from "./runners/LeitnerRunner";
import { PomodoroRunner } from "./runners/PomodoroRunner";
import { QuantitativeBlurtingRunner } from "./runners/QuantitativeBlurtingRunner";
import { RecallRunner } from "./runners/RecallRunner";
import { SocraticFeynmanRunner } from "./runners/SocraticFeynmanRunner";
import { SpacedRunner } from "./runners/SpacedRunner";
import { SpatialPalaceRunner } from "./runners/SpatialPalaceRunner";
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
      return <DynamicInterleavingRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "feynman":
      return <SocraticFeynmanRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "blurting":
      return <QuantitativeBlurtingRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
    case "palace":
      return <SpatialPalaceRunner methodId={method.id} subjectFolderId={subjectFolderId} />;
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
