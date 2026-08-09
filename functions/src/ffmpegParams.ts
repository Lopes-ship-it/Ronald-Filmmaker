import type { EncodingParams, ProbeAnalysis } from "./types";

/**
 * Adaptive parameter selection — the core of "compressão inteligente" from
 * the spec. Rather than one fixed CRF/preset/resolution for every upload,
 * this looks at what ffprobe actually found (resolution, bitrate, fps,
 * codec) and picks parameters per source, following the rules the spec
 * lays out:
 *
 * - Up to 1080p (long edge ≤ 1920px): never touch resolution.
 * - ~2K (long edge ≤ 2560px): keep by default; only downscale to 1080p when
 *   the source is clearly over-encoded for web viewing at that size (see
 *   BITS_PER_PIXEL_DOWNSCALE_THRESHOLD below) — "reduzir apenas quando
 *   houver grande economia sem perda perceptível".
 * - 4K and above: downscale to 1080p by default (a portfolio site has no
 *   real use for serving 4K video to a <video> tag — nobody's display
 *   shows the difference at typical viewing sizes, and the bandwidth cost
 *   is real). Set KEEP_4K_RESOLUTION to true below to disable this and
 *   preserve 4K masters instead — this is the "config" the spec asks for;
 *   there's no separate admin UI toggle for it since it's a one-time
 *   infrastructure decision, not a per-upload choice.
 *
 * CRF (constant-quality mode), not a hand-computed average target bitrate,
 * is what actually delivers "bitrate adaptativo" per the spec's own
 * definition (more bits automatically for complex/busy scenes, fewer for
 * static ones) — that's what CRF mode *is*, and it measurably beats a
 * naive two-pass average-bitrate target for the same file size. A custom
 * scene-complexity-to-bitrate calculator would, in practice, do worse than
 * libx264's own CRF allocator. `maxrateKbps`/`bufsizeKbps` below add a VBV
 * cap on top of CRF ("capped CRF") purely as a backstop against pathological
 * cases (very grainy/noisy footage can make plain CRF spend far more than a
 * sane web-delivery bitrate) — it does not replace CRF's own per-scene
 * allocation.
 *
 * Real case this file guards against (found by actually running this
 * pipeline against one of this project's own sample clips — see
 * functions/smoke-test.js): a source that's already efficiently encoded
 * (e.g. previously compressed for WhatsApp/Instagram before being handed
 * to the admin) can end up SMALLER than a fresh CRF-18 re-encode would be —
 * re-encoding it would make the file bigger, and re-encoding an
 * already-lossy source a second time is also a real quality loss, not a
 * neutral operation. `chooseEncodingParams` sets `skipTranscode: true` for
 * exactly that case: the video stream is remuxed into a clean MP4
 * container (faststart, no quality loss, near-instant) instead of being
 * re-encoded at all. This is the only way to honestly satisfy the spec's
 * own priority order — "1. Preservação da qualidade visual" before
 * "2. Redução máxima do tamanho" — for a source that's already efficient.
 */

/** Set to `true` to stop auto-downscaling 4K+ sources to 1080p and keep their native resolution instead. */
export const KEEP_4K_RESOLUTION = false;

const LONG_EDGE_1080P = 1920;
const LONG_EDGE_2K = 2560;
const LONG_EDGE_4K = 3840;

/**
 * Bits per pixel per frame (bitrate / (width × height × fps)). A well-
 * encoded 1080p web video typically lands somewhere around 0.05–0.12 bpp;
 * noticeably above that suggests the source is inefficiently encoded (a
 * straight-off-camera or lightly-processed file) and has real economy to
 * gain from a resolution step-down, not just a CRF re-encode. Below it, the
 * source is already reasonably tight and a resolution cut would lose more
 * than it saves.
 */
const BITS_PER_PIXEL_DOWNSCALE_THRESHOLD = 0.1;

const MAX_FPS = 60;

/**
 * "Good web quality" bitrate ceiling by long-edge resolution — used two
 * ways: (1) if the source is already at or under this for its resolution,
 * there's nothing to gain from re-encoding at all (see skipTranscode
 * above); (2) otherwise, it caps the CRF pass's `-maxrate` so busy/grainy
 * footage can't balloon past a sane web-delivery bitrate. These are
 * intentionally generous (above typical CRF-18 output for well-behaved
 * footage) so the cap only ever kicks in for genuinely difficult content,
 * never fights CRF's own quality targeting on normal clips.
 */
function resolutionCeilingKbps(longEdge: number): number {
  if (longEdge <= 640) return 1500;
  if (longEdge <= 1280) return 2500;
  if (longEdge <= 1920) return 4500;
  if (longEdge <= 2560) return 6500;
  return 8500;
}

export function chooseEncodingParams(analysis: ProbeAnalysis): EncodingParams {
  const longEdge = Math.max(analysis.width, analysis.height);
  const bitsPerPixel =
    analysis.videoBitrateKbps > 0 && analysis.width > 0 && analysis.height > 0 && analysis.fps > 0
      ? (analysis.videoBitrateKbps * 1000) / (analysis.width * analysis.height * analysis.fps)
      : 0;

  let targetLongEdge: number | null = null;
  let crf = 18;

  if (longEdge <= LONG_EDGE_1080P) {
    // Already 1080p or smaller — never touch resolution.
    targetLongEdge = null;
    crf = 18;
  } else if (longEdge <= LONG_EDGE_2K) {
    // ~2K: keep unless the source is clearly over-encoded for its size.
    if (bitsPerPixel > BITS_PER_PIXEL_DOWNSCALE_THRESHOLD) {
      targetLongEdge = LONG_EDGE_1080P;
      crf = 20;
    } else {
      targetLongEdge = null;
      crf = 19;
    }
  } else if (longEdge <= LONG_EDGE_4K || !KEEP_4K_RESOLUTION) {
    // 4K and above (or anything past 2K when 4K masters aren't being kept):
    // default to a 1080p web-optimized version.
    targetLongEdge = LONG_EDGE_1080P;
    crf = 20;
  } else {
    // KEEP_4K_RESOLUTION opt-out — encode at native resolution.
    targetLongEdge = null;
    crf = 21;
  }

  const maxFps = analysis.fps > MAX_FPS ? MAX_FPS : null;
  const outputLongEdge = targetLongEdge ?? longEdge;
  const ceilingKbps = resolutionCeilingKbps(outputLongEdge);

  // Source is H.264/yuv420p already (so a remux alone produces a fully
  // playable, compatible file) AND already at or under the bitrate we'd
  // target for that resolution anyway — nothing to gain from re-encoding,
  // and real quality to lose from doing it. Skip transcoding entirely.
  const skipTranscode =
    !targetLongEdge &&
    analysis.videoCodec === "h264" &&
    analysis.pixelFormat === "yuv420p" &&
    analysis.videoBitrateKbps > 0 &&
    analysis.videoBitrateKbps <= ceilingKbps;

  return {
    targetLongEdge,
    crf,
    // "slow" is one step below libx264's "medium" default — deliberately:
    // this runs on a Cloud Function, not a person's browser tab, so
    // there's no one waiting on it in real time, and the spec explicitly
    // ranks visual quality and file size above processing speed. "slow"
    // buys a meaningfully better quality/size ratio than "medium" for a
    // modest extra encode-time cost.
    preset: "slow",
    audioBitrateK: 160,
    maxFps,
    skipTranscode,
    maxrateKbps: skipTranscode ? null : ceilingKbps,
    bufsizeKbps: skipTranscode ? null : ceilingKbps * 2,
  };
}
