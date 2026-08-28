import { db } from "../../db/db";
import { generateId } from "../files/fileHelpers";

export async function logSession(
  methodId: string,
  subjectFolderId: string | null,
  startedAt: number,
  durationSec: number,
) {
  if (durationSec <= 0) return;
  await db.sessions.add({
    id: generateId(),
    methodId,
    subjectFolderId,
    startedAt,
    endedAt: Date.now(),
    durationSec,
  });
}
