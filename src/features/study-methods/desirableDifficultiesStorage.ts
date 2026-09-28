import { db, type FrictionBarrier, type DesirableDifficultiesConfigRecord } from "../../db/db.ts";

export { type FrictionBarrier, type DesirableDifficultiesConfigRecord };

export const DEFAULT_DESIRABLE_TOPIC = "Resolución de Ecuaciones Diferenciales";

export const DEFAULT_DESIRABLE_NOTES =
  "Se aplicó intento ciego en 4 problemas sin mirar las fórmulas. La sensación inicial fue de lentitud y duda, pero al contrastar con las respuestas modelo se logró identificar la causa exacta del error algebraico.";

export const DEFAULT_BARRIERS: FrictionBarrier[] = [
  {
    id: "delayed-testing",
    title: "Evaluación Diferida (Separación Temporal)",
    scientificMechanism:
      "La evocación inmediata solo prueba la memoria de trabajo a corto plazo; el intervalo de olvido fuerza la consolidación sináptica real.",
    practicalAction: "No te autoevalúes al terminar de leer. Programa el test para 24 a 48 horas después.",
    enabled: true,
  },
  {
    id: "blind-interleaving",
    title: "Entrelazado Ciego de Problemas",
    scientificMechanism:
      "Al agrupar ejercicios por tema, el cerebro se ahorra el paso crucial: discernir qué fórmula o algoritmo debe aplicarse.",
    practicalAction: "Mezcla consignas de 3 unidades distintas sin títulos ni pistas previas.",
    enabled: true,
  },
  {
    id: "generation-first",
    title: "Intento Ciego Previo (Efecto Generación)",
    scientificMechanism:
      "Intentar resolver un problema antes de ver la solución activa lagunas de conocimiento que aumentan la asimilación posterior.",
    practicalAction:
      "Escribe tu mejor hipótesis o cálculo preliminar durante 3 minutos antes de abrir la resolución modelo.",
    enabled: true,
  },
  {
    id: "context-variation",
    title: "Variación Deliberada de Contexto",
    scientificMechanism:
      "Asociar la información a un único entorno acústico o físico debilita la transferencia a situaciones de examen real.",
    practicalAction: "Cambia de espacio físico, tipografía o dispositivo entre sesiones del mismo tema.",
    enabled: false,
  },
];

export function buildDesirableDifficultiesId(subjectFolderId: string | null | undefined): string {
  const normalizedFolder = subjectFolderId?.trim() || "global";
  return `desirable_diff_config_${normalizedFolder}`;
}

/**
 * Recupera la configuración guardada de dificultades deseables para una materia/carpeta específica.
 */
export async function getDesirableDifficultiesConfig(
  subjectFolderId: string | null | undefined,
): Promise<DesirableDifficultiesConfigRecord | undefined> {
  const id = buildDesirableDifficultiesId(subjectFolderId);
  return db.desirableDifficultiesConfigs.get(id);
}

/**
 * Guarda o actualiza de manera idempotente la configuración de dificultades deseables.
 */
export async function saveDesirableDifficultiesConfig(
  record: Omit<DesirableDifficultiesConfigRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<DesirableDifficultiesConfigRecord> {
  const id = record.id || buildDesirableDifficultiesId(record.subjectFolderId);
  const now = Date.now();
  const fullRecord: DesirableDifficultiesConfigRecord = {
    id,
    subjectFolderId: record.subjectFolderId || null,
    topic: record.topic.trim() || DEFAULT_DESIRABLE_TOPIC,
    barriers: record.barriers,
    perceivedFluency: record.perceivedFluency,
    testedRetention: record.testedRetention,
    sessionNotes: record.sessionNotes,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  await db.desirableDifficultiesConfigs.put(fullRecord);
  return fullRecord;
}
