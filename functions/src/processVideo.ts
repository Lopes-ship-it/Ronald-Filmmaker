import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { probeVideo, encodeVideo, extractThumbnail, remuxToMp4 } from "./ffmpegRunner";
import { chooseEncodingParams } from "./ffmpegParams";
import type { VideoProcessingJob, VideoThumbnailSet } from "./types";

export const ORIGINAL_PREFIX = "videos/original/";
export const OPTIMIZED_PREFIX = "videos/optimized/";
export const THUMBNAIL_PREFIX = "videos/thumbnails/";

const THUMBNAIL_SIZES: { key: keyof VideoThumbnailSet; width: number }[] = [
  { key: "large", width: 1280 },
  { key: "medium", width: 640 },
  { key: "small", width: 320 },
];

/** Throttles how often encode progress turns into a Firestore write — ffmpeg reports progress many times a second, Firestore billing is per write. */
const PROGRESS_WRITE_INTERVAL_MS = 3000;

async function updateJob(
  jobRef: DocumentReference,
  patch: Partial<VideoProcessingJob>,
): Promise<void> {
  await jobRef.set({ ...patch, updatedAt: Date.now() }, { merge: true });
}

/**
 * Storage trigger: fires whenever a file finishes uploading under
 * `videos/original/` (the admin panel's VideoDropzone uploads the raw,
 * un-compressed file there — see src/lib/videoServerProcessing.ts). Runs
 * entirely server-side: probes the file, picks adaptive encoding
 * parameters, compresses with ffmpeg, generates three thumbnail sizes,
 * uploads the results to `videos/optimized/` and `videos/thumbnails/`,
 * records everything in `videoProcessingJobs/{jobId}`, and deletes the
 * temporary original — the full pipeline from the spec, steps 3–9.
 *
 * `jobId` is the uploaded file's own name (without extension) — the client
 * generates it with `crypto.randomUUID()` before starting the upload
 * (see uploadOriginalForProcessing), so it exists before any portfolio
 * project is saved and doesn't depend on the project's slug being final.
 */
export const processVideo = onObjectFinalized(
  {
    region: "us-central1",
    memory: "4GiB",
    cpu: 2,
    timeoutSeconds: 1800,
    concurrency: 1,
  },
  async (event) => {
    const filePath = event.data.name;
    const bucketName = event.data.bucket;

    if (!filePath || !filePath.startsWith(ORIGINAL_PREFIX)) {
      // Not one of ours — this bucket also holds portfolio/, media/, etc.
      return;
    }

    const jobId = path.basename(filePath, path.extname(filePath));
    const db = getFirestore();
    const bucket = getStorage().bucket(bucketName);
    const jobRef = db.collection("videoProcessingJobs").doc(jobId);

    // Idempotency guard — Cloud Storage triggers can redeliver the same
    // event; never re-process (and re-bill) a job that already finished.
    const existing = await jobRef.get();
    if (existing.exists && existing.data()?.status === "done") {
      logger.info(`Job ${jobId} já concluído, ignorando evento duplicado.`);
      return;
    }

    const now = Date.now();
    const originalSizeBytes = Number(event.data.size ?? 0);

    await jobRef.set(
      {
        status: "processing",
        progress: 0,
        originalPath: filePath,
        originalSizeBytes,
        createdAt: existing.exists ? (existing.data()?.createdAt ?? now) : now,
        updatedAt: now,
      } as VideoProcessingJob,
      { merge: true },
    );

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "video-"));
    const inputExt = path.extname(filePath) || ".mp4";
    const localInput = path.join(tempDir, `input${inputExt}`);
    const localOutput = path.join(tempDir, "output.mp4");

    try {
      await bucket.file(filePath).download({ destination: localInput });

      const analysis = await probeVideo(localInput);
      if (analysis.durationSeconds <= 0) {
        throw new Error(
          "Não foi possível determinar a duração do vídeo — o arquivo pode estar corrompido.",
        );
      }

      const params = chooseEncodingParams(analysis);

      if (params.skipTranscode) {
        // Source is already efficient for its resolution — remux only,
        // don't re-encode (see ffmpegParams.ts's doc comment). Near-
        // instant, so there's no meaningful progress to report.
        logger.info(`Job ${jobId}: fonte já eficiente (${analysis.videoBitrateKbps}kbps), apenas remuxando.`);
        await remuxToMp4(localInput, localOutput);
        await jobRef.update({ progress: 1, updatedAt: Date.now() }).catch(() => {});
      } else {
        let lastProgressWrite = 0;
        await encodeVideo(
          localInput,
          localOutput,
          params,
          analysis.durationSeconds,
          analysis.hasAudio,
          (ratio) => {
            const nowTs = Date.now();
            if (nowTs - lastProgressWrite >= PROGRESS_WRITE_INTERVAL_MS) {
              lastProgressWrite = nowTs;
              jobRef.update({ progress: ratio, updatedAt: nowTs }).catch(() => {
                // Best-effort — a missed progress tick isn't worth failing the job over.
              });
            }
          },
        );
      }

      // Re-probe the actual output rather than hand-computing the scaled
      // dimensions — ffmpeg's own aspect-ratio rounding (force_divisible_by
      // in ffmpegRunner.ts's scale filter) is the source of truth for the
      // final width/height/bitrate, not a recomputation of it here.
      const outputAnalysis = await probeVideo(localOutput);
      const optimizedStat = await fs.stat(localOutput);

      const optimizedPath = `${OPTIMIZED_PREFIX}${jobId}.mp4`;
      await bucket.upload(localOutput, {
        destination: optimizedPath,
        metadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" },
      });
      await bucket.file(optimizedPath).makePublic();
      const optimizedUrl = bucket.file(optimizedPath).publicUrl();

      // Thumbnails from a frame ~10% into the clip — avoids a black/fade-in
      // first frame while still being representative for a short clip.
      const thumbAtSeconds = Math.min(
        analysis.durationSeconds * 0.1,
        Math.max(analysis.durationSeconds - 0.1, 0),
      );
      const thumbnails = {} as VideoThumbnailSet;
      for (const size of THUMBNAIL_SIZES) {
        const localThumb = path.join(tempDir, `thumb-${size.key}.jpg`);
        await extractThumbnail(localOutput, localThumb, thumbAtSeconds, size.width);
        const thumbPath = `${THUMBNAIL_PREFIX}${jobId}-${size.key}.jpg`;
        await bucket.upload(localThumb, {
          destination: thumbPath,
          metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
        });
        await bucket.file(thumbPath).makePublic();
        thumbnails[size.key] = bucket.file(thumbPath).publicUrl();
      }

      await updateJob(jobRef, {
        status: "done",
        progress: 1,
        optimizedPath,
        optimizedUrl,
        optimizedSizeBytes: optimizedStat.size,
        thumbnails,
        durationSeconds: outputAnalysis.durationSeconds,
        width: outputAnalysis.width,
        height: outputAnalysis.height,
        fps: outputAnalysis.fps,
        videoCodec: "h264",
        videoBitrateKbps: Math.round(outputAnalysis.videoBitrateKbps),
      });

      // Clean up the temporary original now that the optimized version
      // exists — "Limpeza Automática" from the spec. A failed delete here
      // isn't fatal: the scheduled cleanupOrphanedOriginals function (see
      // cleanup.ts) sweeps up anything older than 48h regardless of status.
      await bucket
        .file(filePath)
        .delete()
        .catch(() => {});
    } catch (err) {
      logger.error(`processVideo falhou para o job ${jobId}:`, err);
      const message = err instanceof Error ? err.message : "Falha ao processar o vídeo.";
      await updateJob(jobRef, { status: "error", errorMessage: message });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },
);
