import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { extractThumbnail } from "./ffmpegRunner";
import { THUMBNAIL_PREFIX } from "./processVideo";
import type { VideoProcessingJob, VideoThumbnailSet } from "./types";

const THUMBNAIL_SIZES: { key: keyof VideoThumbnailSet; width: number }[] = [
  { key: "large", width: 1280 },
  { key: "medium", width: 640 },
  { key: "small", width: 320 },
];

interface RegenerateThumbnailRequest {
  jobId: string;
  atSeconds: number;
}

/**
 * Callable function backing "tentar outro frame" for server-processed
 * videos (VideoDropzone.tsx) — re-extracts all three thumbnail sizes from
 * the already-optimized video at a new timestamp and points the job's
 * `thumbnails` at fresh, timestamped file paths rather than overwriting
 * the existing ones in place: those were uploaded with a one-year
 * immutable cache-control header (see processVideo.ts), so overwriting
 * the same path would mean browsers/CDNs kept serving the old frame for
 * up to a year. A new path is the only way to actually change what
 * visitors see.
 */
export const regenerateThumbnail = onCall<RegenerateThumbnailRequest>(
  { region: "us-central1", memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "É preciso estar autenticado.");
    }

    const { jobId, atSeconds } = request.data;
    if (!jobId || typeof atSeconds !== "number" || !Number.isFinite(atSeconds) || atSeconds < 0) {
      throw new HttpsError("invalid-argument", "Parâmetros inválidos.");
    }

    const db = getFirestore();
    const jobRef = db.collection("videoProcessingJobs").doc(jobId);
    const snapshot = await jobRef.get();
    const job = snapshot.data() as VideoProcessingJob | undefined;

    if (!job || job.status !== "done" || !job.optimizedPath) {
      throw new HttpsError("failed-precondition", "O vídeo ainda não terminou de ser processado.");
    }

    const bucket = getStorage().bucket();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "thumb-"));
    const localVideo = path.join(tempDir, "video.mp4");

    try {
      await bucket.file(job.optimizedPath).download({ destination: localVideo });

      const safeAtSeconds =
        job.durationSeconds && job.durationSeconds > 0
          ? Math.min(atSeconds, Math.max(job.durationSeconds - 0.1, 0))
          : atSeconds;

      const version = Date.now();
      const thumbnails = {} as VideoThumbnailSet;
      for (const size of THUMBNAIL_SIZES) {
        const localThumb = path.join(tempDir, `thumb-${size.key}.jpg`);
        await extractThumbnail(localVideo, localThumb, safeAtSeconds, size.width);
        const thumbPath = `${THUMBNAIL_PREFIX}${jobId}-${size.key}-${version}.jpg`;
        await bucket.upload(localThumb, {
          destination: thumbPath,
          metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
        });
        await bucket.file(thumbPath).makePublic();
        thumbnails[size.key] = bucket.file(thumbPath).publicUrl();
      }

      await jobRef.set({ thumbnails, updatedAt: Date.now() }, { merge: true });

      return { thumbnails };
    } catch {
      throw new HttpsError("internal", "Não foi possível gerar a miniatura nesse ponto do vídeo.");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },
);
