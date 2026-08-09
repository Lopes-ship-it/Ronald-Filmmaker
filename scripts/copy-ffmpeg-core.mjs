#!/usr/bin/env node
/**
 * Copies the ffmpeg.wasm core binary (single-threaded only — see below)
 * from node_modules into public/, so it's served from this site's own
 * origin instead of fetched at runtime from an external CDN (unpkg.com).
 *
 * Why: the admin panel's browser-side video compressor (src/lib/
 * videoCompression.ts) is the automatic fallback whenever the server-side
 * Cloud Functions pipeline isn't available. It was originally built to
 * fetch its ~30MB "core" binary from unpkg.com on first use. In production
 * this was observed to hang indefinitely on some networks (corporate
 * firewalls, some ISPs, VPNs) that block that CDN outright — the browser's
 * fetch never resolves or rejects, so nothing short of a timeout ever
 * surfaces an error. Self-hosting removes that external dependency
 * entirely: the browser is already talking to this site's own origin to
 * load the page, so if that connection works, this download works too.
 *
 * Only the single-threaded core ships (not @ffmpeg/core-mt): the
 * multi-threaded core needs Cross-Origin-Opener-Policy +
 * Cross-Origin-Embedder-Policy site-wide, which was tried and reverted
 * after it broke the YouTube/Vimeo embeds on the public portfolio pages
 * and, on at least one real browser (Microsoft Edge), blocked ffmpeg.wasm's
 * own Worker script from loading at all — see the doc comment at the top
 * of src/lib/videoCompression.ts for the full story.
 *
 * Runs automatically after `npm install` (see package.json's
 * "postinstall") and again right before `npm run dev` / `npm run build`
 * (defensive — cheap to re-run, and covers install flows that skip
 * lifecycle scripts, e.g. `npm ci --ignore-scripts`).
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Must match CORE_VERSION in src/lib/videoCompression.ts, and the exact
// version pinned (not "^") in package.json — this is a prebuilt binary,
// not application code, so there's no reason to auto-upgrade it, and a
// version drift between the installed package and this constant would
// silently serve the wrong wasm binary.
const CORE_VERSION = "0.12.10";

const pkg = "@ffmpeg/core";
const destDir = `ffmpeg-core-${CORE_VERSION}`;
const srcDir = path.join(root, "node_modules", pkg, "dist", "esm");
const outDir = path.join(root, "public", destDir);

if (!existsSync(srcDir)) {
  console.warn(
    `[copy-ffmpeg-core] ${pkg} não encontrado em node_modules — pulei. Rode "npm install" primeiro (e depois "npm run build" de novo) para que a compactação de vídeo no navegador funcione. O pipeline no servidor (Cloud Functions), se estiver ativo, não é afetado.`,
  );
} else {
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(srcDir)) {
    copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  }
  console.log(`[copy-ffmpeg-core] ${pkg} -> public/${destDir}/`);
}
