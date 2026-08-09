import { useCallback, useEffect, useRef, useState } from "react";
import { CloudArrowUp, WarningCircle, CheckCircle, X } from "@phosphor-icons/react";
import { validateVideoFile, formatBytes, formatDuration } from "@/lib/videoUpload";
import { compressVideo, type CompressionStage, type CompressionResult } from "@/lib/videoCompression";
import {
  uploadOriginalForProcessing,
  watchProcessingJob,
  type UploadProgress,
} from "@/lib/videoServerProcessing";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { VideoThumbnailSet } from "@/types";

/**
 * Whichever path actually produced the ready video — ProjectForm.tsx reads
 * `source` to decide how to finish the job at submit time (a "server"
 * result is already fully uploaded/processed and just needs its URL saved;
 * a "client" result still holds an in-memory Blob that gets uploaded when
 * the project is saved, exactly like before this pipeline existed) and how
 * to regenerate the thumbnail ("tentar outro frame" calls a different
 * function per source — see regenerateServerThumbnail vs
 * extractVideoThumbnail).
 */
export type VideoReadyResult =
  | {
      source: "server";
      jobId: string;
      videoUrl: string;
      thumbnails: VideoThumbnailSet;
      durationSeconds: number;
      width: number;
      height: number;
      sizeBytes: number;
    }
  | {
      source: "client";
      compression: CompressionResult;
      sourceFile: File;
    };

interface VideoDropzoneProps {
  /** Fires once a video is fully ready to attach to the project — either processed server-side or compressed in the browser (see VideoReadyResult). */
  onReady: (result: VideoReadyResult) => void;
  /** Fires when the person clears the selection (at any stage — uploading, processing, or after ready). */
  onClear?: () => void;
  disabled?: boolean;
}

const STAGE_LABELS: Record<CompressionStage, string> = {
  "loading-engine": "Carregando o compactador (só na primeira vez)...",
  "reading-file": "Lendo o arquivo...",
  compressing: "Compactando vídeo...",
  "reading-metadata": "Lendo informações do vídeo compactado...",
  done: "Pronto.",
};

/** How long to wait, after the raw upload finishes, for the Cloud Function to create its Firestore job doc before assuming server processing isn't available and falling back to the browser compressor. */
const SERVER_PROCESSING_TIMEOUT_MS = 25_000;

type State =
  | { kind: "empty" }
  | { kind: "uploading"; fileName: string; progress: UploadProgress }
  | { kind: "processing"; fileName: string; progress: number }
  | { kind: "compressing"; stage: CompressionStage; progress: number; fileName: string }
  | {
      kind: "ready";
      fileName: string;
      width: number;
      height: number;
      durationSeconds: number;
      originalSizeBytes: number;
      finalSizeBytes: number;
      result: VideoReadyResult;
    }
  | { kind: "error"; message: string };

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Drag-and-drop (or click-to-browse) video picker. Primary path: upload
 * the raw file to Firebase Storage and let a Cloud Function compress it
 * server-side (functions/src/processVideo.ts) — this component just
 * uploads and watches a Firestore doc for progress, no compression logic
 * of its own. If that path isn't available (Firebase not configured
 * locally), never starts (no job doc appears within
 * SERVER_PROCESSING_TIMEOUT_MS), or the job errors, this automatically
 * falls back to compressing the video right in the browser
 * (src/lib/videoCompression.ts, the original approach) so publishing a
 * video is never blocked on the server pipeline having a bad day.
 */
export function VideoDropzone({ onReady, onClear, disabled }: VideoDropzoneProps) {
  const [state, setState] = useState<State>({ kind: "empty" });
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Bumped on every new file pick / clear so a stale async continuation
  // (an upload finishing, a Firestore snapshot arriving, the fallback
  // timeout firing) from a PREVIOUS file never overwrites the state of
  // whatever is happening now.
  const generationRef = useRef(0);
  const unsubscribeJobRef = useRef<(() => void) | null>(null);
  const uploadTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(
    () => () => {
      unsubscribeJobRef.current?.();
    },
    [],
  );

  const runClientCompression = useCallback(
    (file: File, generation: number) => {
      setState({ kind: "compressing", stage: "loading-engine", progress: 0, fileName: file.name });
      compressVideo(file, {
        onStage: (stage) => {
          if (generation !== generationRef.current) return;
          setState((prev) => (prev.kind === "compressing" ? { ...prev, stage } : prev));
        },
        onProgress: (progress) => {
          if (generation !== generationRef.current) return;
          setState((prev) => (prev.kind === "compressing" ? { ...prev, progress } : prev));
        },
      })
        .then((result) => {
          if (generation !== generationRef.current) return;
          const readyResult: VideoReadyResult = { source: "client", compression: result, sourceFile: file };
          setState({
            kind: "ready",
            fileName: file.name,
            width: result.width,
            height: result.height,
            durationSeconds: result.durationSeconds,
            originalSizeBytes: result.originalSizeBytes,
            finalSizeBytes: result.compressedSizeBytes,
            result: readyResult,
          });
          onReady(readyResult);
        })
        .catch((err: unknown) => {
          if (generation !== generationRef.current) return;
          // The raw error from ffmpeg.wasm/the browser is usually in
          // English — the site's error messages are always in Portuguese,
          // so a fixed, friendly message is shown by default. Errors this
          // module raises itself (e.g. the engine-load timeout) are marked
          // `friendly` and already have a specific, actionable Portuguese
          // message, which is worth showing instead of the generic one.
          const message =
            err instanceof Error && "friendly" in err && err.friendly
              ? err.message
              : "Não foi possível compactar o vídeo. Verifique sua conexão e tente novamente.";
          setState({ kind: "error", message });
        });
    },
    [onReady],
  );

  const runServerProcessing = useCallback(
    (file: File, generation: number) => {
      setState({
        kind: "uploading",
        fileName: file.name,
        progress: {
          bytesTransferred: 0,
          totalBytes: file.size,
          ratio: 0,
          speedBytesPerSecond: 0,
          etaSeconds: null,
        },
      });

      let upload: ReturnType<typeof uploadOriginalForProcessing>;
      try {
        upload = uploadOriginalForProcessing(file, (progress) => {
          if (generation !== generationRef.current) return;
          setState((prev) => (prev.kind === "uploading" ? { ...prev, progress } : prev));
        });
      } catch {
        runClientCompression(file, generation);
        return;
      }

      uploadTaskRef.current = upload.task;

      upload.done
        .then(() => {
          if (generation !== generationRef.current) return;
          setState({ kind: "processing", fileName: file.name, progress: 0 });

          let settled = false;
          const timeoutId = setTimeout(() => {
            if (settled || generation !== generationRef.current) return;
            settled = true;
            unsubscribeJobRef.current?.();
            unsubscribeJobRef.current = null;
            runClientCompression(file, generation);
          }, SERVER_PROCESSING_TIMEOUT_MS);

          unsubscribeJobRef.current = watchProcessingJob(upload.jobId, (job) => {
            if (settled || generation !== generationRef.current) return;
            if (!job) return; // Function hasn't created its doc yet — keep waiting, or hit the timeout above.

            if (job.status === "processing") {
              clearTimeout(timeoutId);
              setState({ kind: "processing", fileName: file.name, progress: job.progress ?? 0 });
              return;
            }

            clearTimeout(timeoutId);
            settled = true;
            unsubscribeJobRef.current?.();
            unsubscribeJobRef.current = null;

            if (job.status === "done" && job.optimizedUrl && job.thumbnails) {
              const readyResult: VideoReadyResult = {
                source: "server",
                jobId: upload.jobId,
                videoUrl: job.optimizedUrl,
                thumbnails: job.thumbnails,
                durationSeconds: job.durationSeconds ?? 0,
                width: job.width ?? 0,
                height: job.height ?? 0,
                sizeBytes: job.optimizedSizeBytes ?? 0,
              };
              setState({
                kind: "ready",
                fileName: file.name,
                width: readyResult.width,
                height: readyResult.height,
                durationSeconds: readyResult.durationSeconds,
                originalSizeBytes: job.originalSizeBytes,
                finalSizeBytes: readyResult.sizeBytes,
                result: readyResult,
              });
              onReady(readyResult);
            } else {
              // status === "error" (or a "done" doc missing fields it
              // should always have) — fall back rather than dead-end here.
              runClientCompression(file, generation);
            }
          });
        })
        .catch(() => {
          if (generation !== generationRef.current) return;
          runClientCompression(file, generation);
        });
    },
    [onReady, runClientCompression],
  );

  const handleFile = useCallback(
    (file: File) => {
      const validation = validateVideoFile(file);
      if (!validation.ok) {
        setState({ kind: "error", message: validation.error ?? "Arquivo inválido." });
        return;
      }

      const generation = ++generationRef.current;
      unsubscribeJobRef.current?.();
      unsubscribeJobRef.current = null;
      uploadTaskRef.current = null;

      if (isFirebaseConfigured) {
        runServerProcessing(file, generation);
      } else {
        // No Firebase project configured locally — there's no Cloud
        // Function to upload to either, so go straight to the browser
        // compressor instead of waiting out a doomed upload attempt.
        runClientCompression(file, generation);
      }
    },
    [runServerProcessing, runClientCompression],
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    generationRef.current += 1;
    unsubscribeJobRef.current?.();
    unsubscribeJobRef.current = null;
    uploadTaskRef.current?.cancel();
    uploadTaskRef.current = null;
    setState({ kind: "empty" });
    onClear?.();
  }

  if (state.kind === "ready") {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-frame)] border border-flare-500/30 bg-flare-500/5 p-4">
        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-paper-100">{state.fileName}</p>
          <p className="mt-1 text-xs text-paper-500">
            {state.width}×{state.height} · {formatDuration(state.durationSeconds)} ·{" "}
            {formatBytes(state.originalSizeBytes)} → {formatBytes(state.finalSizeBytes)} compactado
            {state.result.source === "server" ? " (processado no servidor)" : " (compactado no navegador)"}
          </p>
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={reset}
            aria-label="Remover vídeo selecionado"
            className="-m-2 shrink-0 rounded-full p-2 text-paper-500 transition-colors hover:text-flare-400"
          >
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }

  if (state.kind === "uploading") {
    const pct = Math.round(state.progress.ratio * 100);
    return (
      <div className="rounded-[var(--radius-frame)] border border-paper-100/15 bg-ink-950/40 p-4">
        <p className="truncate text-sm text-paper-100">{state.fileName}</p>
        <p className="mt-1 text-xs text-paper-500">
          Enviando... {pct}%
          {state.progress.speedBytesPerSecond > 0 ? ` · ${formatSpeed(state.progress.speedBytesPerSecond)}` : ""}
          {state.progress.etaSeconds != null
            ? ` · restam ${formatDuration(state.progress.etaSeconds)}`
            : ""}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-100/10">
          <div
            className="h-full rounded-full bg-flare-500 transition-[width] duration-200"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>
    );
  }

  if (state.kind === "processing") {
    const pct = Math.round(state.progress * 100);
    return (
      <div className="rounded-[var(--radius-frame)] border border-paper-100/15 bg-ink-950/40 p-4">
        <p className="truncate text-sm text-paper-100">{state.fileName}</p>
        <p className="mt-1 text-xs text-paper-500">Processando no servidor... {pct}%</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-100/10">
          <div
            className="h-full rounded-full bg-flare-500 transition-[width] duration-200"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>
    );
  }

  if (state.kind === "compressing") {
    return (
      <div className="rounded-[var(--radius-frame)] border border-paper-100/15 bg-ink-950/40 p-4">
        <p className="truncate text-sm text-paper-100">{state.fileName}</p>
        <p className="mt-1 text-xs text-paper-500">{STAGE_LABELS[state.stage]}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-100/10">
          <div
            className="h-full rounded-full bg-flare-500 transition-[width] duration-200"
            style={{
              width: `${state.stage === "compressing" ? Math.max(4, state.progress * 100) : 8}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-frame)] border border-dashed px-6 py-10 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-paper-100/10 opacity-50"
            : dragActive
              ? "cursor-pointer border-flare-500 bg-flare-500/5"
              : "cursor-pointer border-paper-100/20 hover:border-paper-100/40"
        }`}
      >
        <CloudArrowUp size={26} className="text-paper-500" aria-hidden />
        <p className="text-sm text-paper-200">
          Arraste um vídeo aqui ou <span className="text-flare-400">clique para escolher</span>
        </p>
        <p className="text-xs text-paper-600">
          MP4, MOV, WEBM ou M4V — compactado automaticamente ao enviar
        </p>
        <input
          ref={inputRef}
          type="file"
          disabled={disabled}
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>
      {state.kind === "error" ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-flare-400">
          <WarningCircle size={14} aria-hidden />
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
