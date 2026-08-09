/**
 * Grabs a single frame from a video file/blob as a WebP image, entirely in
 * the browser (an off-DOM <video> seeks to a timestamp, a <canvas> draws
 * that frame). Used for the "usar a miniatura automática" default and for
 * "escolher um frame específico" (re-called with a different `atSeconds`).
 */
export async function extractVideoThumbnail(source: Blob | File, atSeconds = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const safeTime = Math.min(Math.max(atSeconds, 0), Math.max(video.duration - 0.05, 0));
      video.currentTime = safeTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas 2D indisponível neste navegador."));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Falha ao gerar a miniatura."));
        },
        "image/webp",
        0.96,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível carregar o vídeo para gerar a miniatura."));
    };

    video.src = url;
  });
}

/** Video duration in seconds, without compressing — used to bound the "choose a frame" scrubber. */
export async function readVideoDuration(source: Blob | File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a duração do vídeo."));
    };
    video.src = url;
  });
}
