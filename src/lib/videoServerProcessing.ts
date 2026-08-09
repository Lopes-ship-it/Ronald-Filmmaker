import { ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firebaseStorage, firebaseFirestore, firebaseFunctions } from "@/lib/firebase";
import type { VideoProcessingJob, VideoThumbnailSet } from "@/types";

/**
 * Client half of the server-side video pipeline described in
 * functions/README.md: the browser uploads the raw, un-compressed file
 * straight to `videos/original/{jobId}{ext}` and does nothing else —
 * every actual compression/thumbnail/streaming-optimization step runs in
 * the `processVideo` Cloud Function once that upload lands (see
 * functions/src/processVideo.ts), driven purely by a Storage trigger, no
 * request from this file at all. This module's job is: start that upload
 * with real progress reporting, then watch `videoProcessingJobs/{jobId}`
 * in Firestore for the Function's own status updates.
 *
 * VideoDropzone.tsx is the only caller, and always has a fallback ready:
 * if this whole path fails or hangs (Cloud Functions not deployed yet,
 * offline, an actual processing error), it falls back to the original
 * browser-side compressor (src/lib/videoCompression.ts) so publishing a
 * video never becomes impossible just because the server path had a bad
 * day.
 */

const ORIGINAL_PREFIX = "videos/original/";

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  /** 0–1 */
  ratio: number;
  /** Bytes/second, smoothed a little — 0 until at least one prior progress sample exists. */
  speedBytesPerSecond: number;
  /** Seconds, based on the current speed sample — `null` when speed is still 0 (right at the start). */
  etaSeconds: number | null;
}

export interface OriginalUpload {
  jobId: string;
  task: UploadTask;
  /** Resolves once the raw upload itself finishes (NOT once processing finishes — that's watchProcessingJob's job). */
  done: Promise<void>;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot) : ".mp4";
}

/**
 * Starts the raw upload. `jobId` is generated here (not tied to the
 * portfolio project's slug, which may not exist yet for a new project) —
 * it's what both this upload and the resulting Firestore job document are
 * keyed by.
 */
export function uploadOriginalForProcessing(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): OriginalUpload {
  if (!firebaseStorage) {
    throw new Error("Firebase Storage não está configurado.");
  }

  const jobId = crypto.randomUUID();
  const path = `${ORIGINAL_PREFIX}${jobId}${extensionOf(file.name)}`;
  const task = uploadBytesResumable(ref(firebaseStorage, path), file, {
    contentType: file.type || "video/mp4",
  });

  let lastSampleAt = Date.now();
  let lastSampleBytes = 0;
  let speedBytesPerSecond = 0;

  task.on("state_changed", (snapshot) => {
    if (!onProgress) return;
    const now = Date.now();
    const elapsedSeconds = (now - lastSampleAt) / 1000;
    // Only recompute speed every ~500ms — snapshot events fire very
    // frequently and a per-event delta is too noisy to show as "velocidade
    // do upload" without visibly jittering.
    if (elapsedSeconds >= 0.5) {
      const bytesSinceLastSample = snapshot.bytesTransferred - lastSampleBytes;
      speedBytesPerSecond = bytesSinceLastSample / elapsedSeconds;
      lastSampleAt = now;
      lastSampleBytes = snapshot.bytesTransferred;
    }

    const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
    onProgress({
      bytesTransferred: snapshot.bytesTransferred,
      totalBytes: snapshot.totalBytes,
      ratio: snapshot.totalBytes > 0 ? snapshot.bytesTransferred / snapshot.totalBytes : 0,
      speedBytesPerSecond,
      etaSeconds: speedBytesPerSecond > 0 ? remainingBytes / speedBytesPerSecond : null,
    });
  });

  const done = new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      undefined,
      (err) => reject(err),
      () => resolve(),
    );
  });

  return { jobId, task, done };
}

/**
 * Subscribes to a job's live status. Fires with `null` for the (usually
 * brief) window before the Cloud Function has created the document at
 * all — VideoDropzone treats a `null` that persists too long as "the
 * function probably isn't deployed" and falls back to browser compression.
 */
export function watchProcessingJob(
  jobId: string,
  onUpdate: (job: VideoProcessingJob | null) => void,
): Unsubscribe {
  if (!firebaseFirestore) {
    throw new Error("Firestore não está configurado.");
  }
  return onSnapshot(
    doc(firebaseFirestore, "videoProcessingJobs", jobId),
    (snapshot) => onUpdate(snapshot.exists() ? (snapshot.data() as VideoProcessingJob) : null),
    () => onUpdate(null),
  );
}

interface RegenerateThumbnailResponse {
  thumbnails: VideoThumbnailSet;
}

/** Backs "tentar outro frame" for a server-processed video — see functions/src/regenerateThumbnail.ts. */
export async function regenerateServerThumbnail(
  jobId: string,
  atSeconds: number,
): Promise<VideoThumbnailSet> {
  if (!firebaseFunctions) {
    throw new Error("Cloud Functions não está configurado.");
  }
  const callable = httpsCallable<{ jobId: string; atSeconds: number }, RegenerateThumbnailResponse>(
    firebaseFunctions,
    "regenerateThumbnail",
  );
  const result = await callable({ jobId, atSeconds });
  return result.data.thumbnails;
}
