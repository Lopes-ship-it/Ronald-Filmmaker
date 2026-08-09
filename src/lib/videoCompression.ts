import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

/**
 * Compression runs entirely in the browser via ffmpeg.wasm — no server, no
 * VPS, works with static hosting. The tradeoff (chosen deliberately): it
 * uses whatever CPU the person uploading has, so a very long file on a weak
 * laptop will take a while.
 *
 * The ffmpeg-core binary (~30MB) is self-hosted from this site's own
 * `public/` folder (copied in from node_modules at build/install time by
 * scripts/copy-ffmpeg-core.mjs — see that file), not fetched from an
 * external CDN. It used to be fetched from unpkg.com at runtime, but that
 * was found in production to hang indefinitely — not error, hang — on
 * networks that block that CDN (some corporate firewalls, some ISPs, some
 * VPNs): the browser's fetch just sits pending forever, since nothing ever
 * rejects it. Self-hosting removes that external dependency: if the
 * browser can already load this page, it can load these files too, since
 * they come from the exact same origin. It also means the file is covered
 * by this site's own long-lived caching (see public/.htaccess /
 * public/_headers / vercel.json), rather than depending on unpkg's.
 *
 * Two core builds ship this way: the regular single-threaded core, and
 * `@ffmpeg/core-mt`, which spreads the encode across every CPU core the
 * machine has — several times faster on a modern multi-core laptop, at no
 * quality cost (same libx264 settings either way). The multi-threaded core
 * only works when the page is "cross-origin isolated" (a browser security
 * mode the site opts into via response headers — see public/_headers,
 * public/.htaccess, and vercel.json), which some shared-hosting setups
 * strip in transit. `crossOriginIsolated` below reports whether that
 * actually happened for this page load; when it didn't (or the
 * multi-threaded core fails to load for any other reason) this
 * transparently falls back to the single-threaded core exactly as before,
 * so compression itself never breaks — cross-origin isolation only ever
 * changes how fast it runs, never whether it works.
 */

const CORE_VERSION = "0.12.10";
// Must match scripts/copy-ffmpeg-core.mjs's CORE_VERSION and output folder
// names exactly — that script is what actually puts these files in
// public/ (and, from there, into the deployed site's document root).
const CORE_BASE_URL = `/ffmpeg-core-${CORE_VERSION}`;
const CORE_MT_BASE_URL = `/ffmpeg-core-mt-${CORE_VERSION}`;

/**
 * A plain `await` on the core's fetch has no ceiling. Self-hosting (above)
 * removes the most common real-world cause of that fetch hanging forever,
 * but a timeout is still cheap insurance against any other stall (a slow
 * or flaky connection on the visitor's own end, disk/CDN issues on
 * whichever host serves this site's static files, a browser extension
 * quietly intercepting the request) — without one, any such stall hangs
 * the whole upload UI at "Carregando o compactador..." forever, with
 * nothing for the person to do but reload the page. This was observed in
 * production before self-hosting, not a hypothetical. Racing the load
 * against a timer turns a silent hang into a clear, actionable error
 * instead.
 */
const ENGINE_LOAD_TIMEOUT_MS = 60_000;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Marks an error's message as already being a friendly, Portuguese,
 * user-facing string — as opposed to the raw (usually English) errors
 * ffmpeg.wasm/the browser throw internally. VideoDropzone checks this flag
 * to decide whether to show the error's own message or fall back to a
 * generic one.
 */
class FriendlyError extends Error {
  friendly = true as const;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FriendlyError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Wraps @ffmpeg/util's toBlobURL with an explicit check on the response.
 * Without this, a request for a core file that isn't actually present at
 * this URL (e.g. a deploy that ran `npm run build` without first running
 * `npm install`, so scripts/copy-ffmpeg-core.mjs never populated public/,
 * or an upload that didn't include the "ffmpeg-core-" subfolders) can
 * still "succeed" from fetch()'s point of view: this site's own SPA
 * routing fallback (public/.htaccess, vercel.json) rewrites ANY unmatched
 * path to index.html so client-side routing works, so a missing
 * ffmpeg-core file comes back as a 200 with the site's own HTML instead
 * of a real 404. That HTML then gets treated as if it were the real
 * JS/WASM core, which fails silently deep inside ffmpeg.wasm's own
 * worker-message protocol — the outer promise never resolves OR rejects,
 * so nothing surfaces until this module's own timeout fires, with a
 * generic "check your connection" message that doesn't point at the real
 * cause at all. Checking the response's Content-Type here catches that
 * exact case immediately, with a message that names the real problem.
 */
async function fetchCoreFileAsBlobURL(url: string, mimeType: string): Promise<string> {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("text/html")) {
    throw new FriendlyError(
      `O arquivo do compactador de vídeo não foi encontrado no servidor (${url}). O deploy deste site provavelmente não incluiu a pasta public/ffmpeg-core-*/ — rode "npm install" e depois "npm run build" de novo, e reenvie a pasta dist/ inteira (incluindo as subpastas ffmpeg-core-*).`,
    );
  }
  const blob = new Blob([await res.arrayBuffer()], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function loadCore(baseURL: string, multiThreaded: boolean): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await fetchCoreFileAsBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await fetchCoreFileAsBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    ...(multiThreaded
      ? { workerURL: await fetchCoreFileAsBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript") }
      : {}),
  });
  return ffmpeg;
}

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      if (typeof window !== "undefined" && window.crossOriginIsolated) {
        try {
          const ffmpeg = await withTimeout(
            loadCore(CORE_MT_BASE_URL, true),
            ENGINE_LOAD_TIMEOUT_MS,
            "Tempo esgotado carregando o compactador (multi-thread).",
          );
          ffmpegInstance = ffmpeg;
          return ffmpeg;
        } catch {
          // Fall through to the single-threaded core below — a stall,
          // timeout, or unexpected browser quirk on the multi-threaded path
          // should never take video upload down entirely.
        }
      }
      const ffmpeg = await withTimeout(
        loadCore(CORE_BASE_URL, false),
        ENGINE_LOAD_TIMEOUT_MS,
        "Não foi possível carregar o compactador de vídeo. Verifique sua conexão com a internet e tente novamente — se persistir, tente recarregar a página.",
      );
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();

    // Never cache a FAILED load — without this, one bad attempt (a
    // transient network stall, a timeout) would permanently poison every
    // future attempt in this page session with the same rejected promise,
    // silently breaking "tentar novamente" until the person reloads the
    // page.
    loadPromise.catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot) : ".mp4";
}

function readVideoDimensions(
  blob: Blob,
): Promise<{ width: number; height: number; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const result = {
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds: video.duration,
      };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler os metadados do vídeo compactado."));
    };
    video.src = url;
  });
}

export type CompressionStage =
  | "loading-engine"
  | "reading-file"
  | "compressing"
  | "reading-metadata"
  | "done";

export interface CompressVideoOptions {
  /** 0–1, how far through the ffmpeg encode pass. */
  onProgress?: (ratio: number) => void;
  onStage?: (stage: CompressionStage) => void;
}

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  durationSeconds: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

/**
 * H.264 + AAC, CRF 18 (visually indistinguishable from the source for
 * virtually all footage — one step below this project's previous CRF 20,
 * and two below the original CRF 23 default) with the "medium" preset
 * (libx264's own default, one step slower than the previous "fast"). Both
 * changes push more bits toward quality per the same input. Resolution is
 * left untouched unless the source is larger than 2160px on its long edge
 * (only ever downscales, never upscales, and preserves the original aspect
 * ratio exactly, so a portrait 9:16 upload stays 9:16).
 *
 * Tradeoff, disclosed here because it's real: "medium" + CRF 18 takes
 * noticeably longer to encode than this project's previous settings, and
 * the output file is somewhat larger for the same footage, since CRF 18
 * spends more bits to hit that quality bar. Both costs buy a genuinely
 * sharper, less compressed result. ffmpeg.wasm has no hardware
 * acceleration either way, but does use every CPU core (not just one) when
 * the page is cross-origin isolated — see the module doc comment above —
 * which claws back a large chunk of that wait on most machines.
 */
export async function compressVideo(
  file: File,
  { onProgress, onStage }: CompressVideoOptions = {},
): Promise<CompressionResult> {
  onStage?.("loading-engine");
  const ffmpeg = await loadFFmpeg();

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", progressHandler);

  const inputName = `input${extensionOf(file.name)}`;
  const outputName = "output.mp4";

  try {
    onStage?.("reading-file");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onStage?.("compressing");
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-vf",
      "scale='min(2160,iw)':'min(2160,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as BlobPart], { type: "video/mp4" });

    onStage?.("reading-metadata");
    const dims = await readVideoDimensions(blob);

    onStage?.("done");
    return {
      blob,
      ...dims,
      originalSizeBytes: file.size,
      compressedSizeBytes: blob.size,
    };
  } finally {
    ffmpeg.off("progress", progressHandler);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
