import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
//
// NOTE: this project does NOT set Cross-Origin-Opener-Policy /
// Cross-Origin-Embedder-Policy, on purpose. An earlier version did (here
// and in public/_headers, public/.htaccess, vercel.json), to unlock
// ffmpeg.wasm's multi-threaded core in the admin panel's video compactor
// (src/lib/videoCompression.ts) — several times faster, same quality. That
// was reverted after it broke two things in production: the YouTube/Vimeo
// <iframe> embeds on the public portfolio pages (COEP requires embedded
// cross-origin frames to opt in with their own header, which YouTube/Vimeo
// don't do for this site), and — on at least one real browser (Microsoft
// Edge) — it blocked ffmpeg.wasm's own dedicated Worker script from
// loading at all, hanging the compressor indefinitely on the admin upload
// screen. Do not re-add these headers without solving both of those
// problems first.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
})
