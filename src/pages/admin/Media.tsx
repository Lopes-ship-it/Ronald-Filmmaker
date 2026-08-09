import { useEffect, useState } from "react";
import { WarningCircle, Trash, Copy, FilmSlate } from "@phosphor-icons/react";
import { listMediaFiles, deleteFromMediaBucket, type MediaFile } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";

function isVideo(name: string): boolean {
  return /\.(mp4|mov|webm|m4v)$/i.test(name);
}

export function AdminMedia() {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  function load() {
    if (!isFirebaseConfigured) return;
    listMediaFiles()
      .then(setFiles)
      .catch(() => setError("Falha ao carregar."));
  }

  useEffect(load, []);

  async function handleDelete(path: string) {
    setBusyPath(path);
    try {
      await deleteFromMediaBucket(path);
      setConfirmPath(null);
      load();
    } catch {
      setError("Falha ao excluir.");
    } finally {
      setBusyPath(null);
    }
  }

  async function copyUrl(file: MediaFile) {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedPath(file.path);
      window.setTimeout(() => setCopiedPath(null), 1500);
    } catch {
      // Clipboard API unavailable — non-fatal, the URL is still visible via the link.
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Mídias</h1>
      <p className="mt-1 text-sm text-paper-400">
        Todos os arquivos enviados para o Firebase Storage (vídeos e miniaturas de projetos, fotos
        de categorias, equipamentos e configurações), num só lugar.
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para listar arquivos de verdade.
          </p>
        </div>
      ) : (
        <>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          {!files ? (
            <div className="mt-10 flex justify-center" aria-hidden>
              <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
            </div>
          ) : files.length === 0 ? (
            <p className="mt-10 text-sm italic text-paper-500">Nenhum arquivo enviado ainda.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="group relative overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/40"
                >
                  {isVideo(file.name) ? (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-ink-950/40 text-paper-600">
                      <FilmSlate size={22} aria-hidden />
                      <span className="text-[10px] italic">Vídeo</span>
                    </div>
                  ) : (
                    <img src={file.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  )}
                  <div className="p-2.5">
                    <p className="truncate text-[11px] text-paper-400" title={file.path}>
                      {file.name}
                    </p>
                  </div>
                  {/*
                    Visible by default (needed on touch devices, which have
                    no hover state to reveal these otherwise) and only
                    hover-gated from sm upward, where a mouse is more likely.
                  */}
                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => copyUrl(file)}
                      aria-label="Copiar URL"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-frame)] bg-ink-950/80 text-paper-200 hover:text-flare-400"
                    >
                      <Copy size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPath(file.path)}
                      aria-label="Excluir"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-frame)] bg-ink-950/80 text-paper-200 hover:text-flare-400"
                    >
                      <Trash size={14} aria-hidden />
                    </button>
                  </div>
                  {copiedPath === file.path ? (
                    <div className="absolute inset-x-0 bottom-0 bg-flare-500/90 py-1 text-center text-[10px] font-semibold text-ink-950">
                      URL copiada
                    </div>
                  ) : null}
                  {confirmPath === file.path ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/95 p-3 text-center">
                      <p className="text-[11px] text-paper-200">Excluir este arquivo?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyPath === file.path}
                          onClick={() => handleDelete(file.path)}
                          className="rounded-[var(--radius-frame)] bg-flare-500 px-2.5 py-1 text-[11px] font-semibold text-ink-950 hover:bg-flare-400"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPath(null)}
                          className="text-[11px] text-paper-400 hover:text-paper-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
