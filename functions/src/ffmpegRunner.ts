import { spawn } from "node:child_process";
import ffmpegPathRaw from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import type { EncodingParams, ProbeAnalysis } from "./types";

// ffmpeg-static's export is nullable in its own types (no prebuilt binary
// for an unsupported platform) — Cloud Functions always runs on linux x64,
// which it does support, but failing loudly here beats a confusing spawn
// ENOENT deep inside encodeVideo if that ever isn't true.
if (!ffmpegPathRaw) {
  throw new Error("ffmpeg-static não encontrou um binário do ffmpeg para esta plataforma.");
}
const FFMPEG_PATH: string = ffmpegPathRaw;
const FFPROBE_PATH = ffprobeInstaller.path;

/** Runs a command, collecting stdout/stderr fully — used for ffprobe (small JSON output) and short-lived commands, not for the long-running ffmpeg encode itself (see runFfmpegWithProgress). */
function runCommand(binary: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${binary} saiu com código ${code}. stderr: ${stderr.slice(-2000)}`));
      }
    });
  });
}

interface FfprobeStream {
  codec_type: string;
  codec_name?: string;
  pix_fmt?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  bit_rate?: string;
  duration?: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: {
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
}

function parseFrameRate(rate: string | undefined): number {
  if (!rate) return 30;
  const [num, den] = rate.split("/").map(Number);
  if (!den || Number.isNaN(num) || Number.isNaN(den) || den === 0) return 30;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : 30;
}

/**
 * Analyzes a downloaded file with ffprobe. Throws (with a Portuguese
 * message the caller can store as-is on the job) when the file has no
 * readable video stream at all — that's this pipeline's "arquivo
 * corrompido" detection, done server-side rather than trusting whatever
 * the browser claimed about the file before upload.
 */
export async function probeVideo(filePath: string): Promise<ProbeAnalysis> {
  let stdout: string;
  try {
    const result = await runCommand(FFPROBE_PATH, [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);
    stdout = result.stdout;
  } catch {
    throw new Error("Não foi possível ler o arquivo de vídeo — ele pode estar corrompido.");
  }

  let parsed: FfprobeOutput;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Não foi possível ler os metadados do vídeo.");
  }

  const videoStream = parsed.streams?.find((s) => s.codec_type === "video");
  if (!videoStream || !videoStream.width || !videoStream.height) {
    throw new Error("O arquivo enviado não contém uma faixa de vídeo válida.");
  }

  const durationSeconds = Number(videoStream.duration ?? parsed.format?.duration ?? 0);
  const hasAudio = Boolean(parsed.streams?.some((s) => s.codec_type === "audio"));
  const streamBitrate = Number(videoStream.bit_rate ?? 0);
  const formatBitrate = Number(parsed.format?.bit_rate ?? 0);
  const videoBitrateKbps = (streamBitrate > 0 ? streamBitrate : formatBitrate) / 1000;

  return {
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0,
    fps: parseFrameRate(videoStream.r_frame_rate),
    videoCodec: videoStream.codec_name ?? "desconhecido",
    pixelFormat: videoStream.pix_fmt ?? "desconhecido",
    videoBitrateKbps: Number.isFinite(videoBitrateKbps) ? videoBitrateKbps : 0,
    hasAudio,
    sizeBytes: Number(parsed.format?.size ?? 0),
  };
}

function buildScaleFilter(targetLongEdge: number | null): string | null {
  if (!targetLongEdge) return null;
  // Same "only ever downscale, preserve aspect ratio exactly" filter as the
  // browser-side compressor (src/lib/videoCompression.ts) — a portrait 9:16
  // upload stays 9:16, force_divisible_by=2 keeps both dimensions even
  // (required by yuv420p / most H.264 decoders).
  return `scale='min(${targetLongEdge},iw)':'min(${targetLongEdge},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
}

/**
 * Runs the actual compression pass, streaming progress via ffmpeg's own
 * `-progress pipe:1` machine-readable output (key=value lines) rather than
 * scraping the human-readable stderr log. `onProgress` is called with a
 * 0–1 ratio; the caller (processVideo.ts) is responsible for throttling
 * how often that turns into a Firestore write.
 */
export function encodeVideo(
  inputPath: string,
  outputPath: string,
  params: EncodingParams,
  durationSeconds: number,
  hasAudio: boolean,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const filters: string[] = [];
  const scaleFilter = buildScaleFilter(params.targetLongEdge);
  if (scaleFilter) filters.push(scaleFilter);

  const args = ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", params.preset, "-crf", String(params.crf)];

  if (filters.length > 0) {
    args.push("-vf", filters.join(","));
  }
  if (params.maxFps) {
    args.push("-r", String(params.maxFps));
  }
  // "Capped CRF" — a VBV ceiling on top of CRF's own per-scene bit
  // allocation, purely as a backstop against pathological (very
  // grainy/noisy) footage. See ffmpegParams.ts's doc comment.
  if (params.maxrateKbps && params.bufsizeKbps) {
    args.push("-maxrate", `${params.maxrateKbps}k`, "-bufsize", `${params.bufsizeKbps}k`);
  }

  // yuv420p is required for broad compatibility (Safari/iOS in particular
  // silently fail on non-4:2:0 chroma output) — always set explicitly
  // rather than trusting libx264's own default for the source's pixel
  // format.
  args.push("-pix_fmt", "yuv420p");

  if (hasAudio) {
    args.push("-c:a", "aac", "-b:a", `${params.audioBitrateK}k`, "-ac", "2", "-ar", "48000");
  } else {
    args.push("-an");
  }

  args.push("-movflags", "+faststart", "-progress", "pipe:1", "-nostats", outputPath);

  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, args);
    let stderrTail = "";
    let progressBuffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      progressBuffer += chunk.toString();
      const lines = progressBuffer.split("\n");
      progressBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const [key, value] = line.split("=");
        if (key === "out_time_ms" && durationSeconds > 0) {
          const outSeconds = Number(value) / 1_000_000;
          if (Number.isFinite(outSeconds)) {
            onProgress(Math.min(1, Math.max(0, outSeconds / durationSeconds)));
          }
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`ffmpeg saiu com código ${code}. stderr: ${stderrTail}`));
      }
    });
  });
}

/**
 * Repackages a video into a clean, faststart MP4 container WITHOUT
 * re-encoding (`-c copy` — a stream copy, not a transcode: no quality
 * change, near-instant regardless of duration). Used for
 * `EncodingParams.skipTranscode` — a source that's already H.264/yuv420p
 * and already at or under this pipeline's own target bitrate for its
 * resolution has nothing to gain from a fresh CRF pass, and a second lossy
 * generation is a real, measurable quality loss for zero benefit.
 */
export function remuxToMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, [
      "-y",
      "-i",
      inputPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
    let stderrTail = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg (remux) saiu com código ${code}. stderr: ${stderrTail}`));
    });
  });
}

/** Grabs a single frame as a JPEG thumbnail, scaled to `maxWidth` on the long edge (never upscaled — ffmpeg's scale filter here only shrinks). */
export async function extractThumbnail(
  inputPath: string,
  outputPath: string,
  atSeconds: number,
  maxWidth: number,
): Promise<void> {
  try {
    await runCommand(FFMPEG_PATH, [
      "-y",
      "-ss",
      String(Math.max(0, atSeconds)),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
      "-q:v",
      "3",
      outputPath,
    ]);
  } catch {
    throw new Error("Não foi possível gerar a miniatura do vídeo.");
  }
}
