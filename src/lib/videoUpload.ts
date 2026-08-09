/**
 * Client-side upload validation. This is a convenience check that gives
 * fast, friendly feedback in the form — it is NOT the real security
 * boundary, since a browser's reported MIME type/extension can be spoofed.
 * The actual enforcement lives on Firebase Storage itself (see
 * storage.rules), which rejects a mismatched upload server-side regardless
 * of what the client claims.
 */

const ACCEPTED_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

/** Cap on the ORIGINAL file before compression. Compression then shrinks it further. */
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function validateVideoFile(
  file: File,
  maxSizeBytes: number = MAX_UPLOAD_SIZE_BYTES,
): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio ou corrompido." };
  }

  const ext = extensionOf(file.name);
  const mimeOk = ACCEPTED_MIME_TYPES.includes(file.type);
  const extOk = ACCEPTED_EXTENSIONS.includes(ext);
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: `Formato não suportado (${file.type || ext || "desconhecido"}). Envie MP4, MOV, WEBM ou M4V.`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(0)}MB). O limite atual é ${(
        maxSizeBytes /
        (1024 * 1024)
      ).toFixed(0)}MB.`,
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
