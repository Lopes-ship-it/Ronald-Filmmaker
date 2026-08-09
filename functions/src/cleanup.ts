import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import { ORIGINAL_PREFIX } from "./processVideo";

const STALE_AFTER_MS = 48 * 60 * 60 * 1000; // 48h

/**
 * Daily safety net for "Limpeza Automática" from the spec. processVideo.ts
 * already deletes each temporary original as soon as it finishes
 * processing it successfully — this function exists for the cases that
 * path doesn't cover: a job that errored partway (its original is kept on
 * purpose so a developer can inspect what failed), an original whose
 * Storage-trigger event never fired for some reason, or a raw upload the
 * client abandoned by falling back to browser-side compression instead
 * (see src/lib/videoServerProcessing.ts). Anything under videos/original/
 * older than 48h is deleted outright, regardless of its job's status —
 * that's well past any legitimate processing time, including a large 4K
 * file's up-to-30-minute encode budget (see processVideo.ts's
 * timeoutSeconds).
 */
export const cleanupOrphanedOriginals = onSchedule(
  { schedule: "every 24 hours", region: "us-central1", timeoutSeconds: 540 },
  async () => {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: ORIGINAL_PREFIX });
    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      const createdAt = file.metadata.timeCreated ? new Date(file.metadata.timeCreated).getTime() : 0;
      if (createdAt && now - createdAt > STALE_AFTER_MS) {
        await file.delete().catch((err: unknown) => {
          logger.warn(`Falha ao remover original órfão ${file.name}:`, err);
        });
        deleted += 1;
      }
    }

    logger.info(`cleanupOrphanedOriginals: ${deleted} arquivo(s) removido(s) de ${files.length} verificado(s).`);
  },
);
