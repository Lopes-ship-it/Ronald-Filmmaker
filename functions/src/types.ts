/**
 * Shared shapes for the server-side video pipeline. `VideoProcessingJob` is
 * the exact shape written to Firestore's `videoProcessingJobs/{jobId}`
 * collection — the client (src/lib/videoServerProcessing.ts) subscribes to
 * one of these documents to drive the upload/processing UI. Keep the two
 * definitions in sync by hand (this repo doesn't share a types package
 * between the app and functions/, since the client bundle must never pull
 * in Node-only code like firebase-admin).
 */

export type VideoProcessingJobStatus = "processing" | "done" | "error";

export interface VideoThumbnailSet {
  large: string;
  medium: string;
  small: string;
}

export interface VideoProcessingJob {
  status: VideoProcessingJobStatus;
  /** 0–1, updated periodically while `status === "processing"` (see ffmpegRunner.ts's progress parsing). Absent before the first update arrives. */
  progress?: number;
  originalPath: string;
  originalSizeBytes: number;
  optimizedPath?: string;
  optimizedUrl?: string;
  optimizedSizeBytes?: number;
  thumbnails?: VideoThumbnailSet;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  videoBitrateKbps?: number;
  /** Only set when status === "error" — always a Portuguese, user-facing message (see the project-wide convention of never surfacing raw ffmpeg/Node error text). */
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProbeAnalysis {
  width: number;
  height: number;
  durationSeconds: number;
  fps: number;
  videoCodec: string;
  pixelFormat: string;
  videoBitrateKbps: number;
  hasAudio: boolean;
  sizeBytes: number;
}

export interface EncodingParams {
  /** `null` means "keep the source resolution" — ffmpeg's own scale filter only ever downscales, matching the "never upscale" rule. */
  targetLongEdge: number | null;
  crf: number;
  preset: string;
  audioBitrateK: number;
  /** `null` means "keep the source fps" — only ever caps extreme outliers, never raises fps. */
  maxFps: number | null;
  /** When true, the source is already efficient enough that re-encoding would only make it bigger (and, since it'd be a second lossy generation, look worse) — remux only, no transcode. See ffmpegParams.ts's doc comment. */
  skipTranscode: boolean;
  /** VBV cap paired with CRF ("capped CRF") — a backstop against pathological content, not a replacement for CRF's own bit allocation. `null` when skipTranscode is true. */
  maxrateKbps: number | null;
  bufsizeKbps: number | null;
}
