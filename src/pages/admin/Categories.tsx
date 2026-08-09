import { useEffect, useState } from "react";
import clsx from "clsx";
import { PencilSimple, ArrowUp, ArrowDown, WarningCircle, X, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { getPortfolioCategories, updateCategory, reorderCategories, uploadToMediaBucket } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import { PORTFOLIO_CATEGORY_LABELS, type PortfolioCategoryInfo } from "@/types";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";

/**
 * Categories are a bounded, code-defined set (PortfolioCategory is a fixed
 * TypeScript union used throughout filtering/labelling logic) — this screen
 * edits each existing category's description, banner, and order rather
 * than creating or deleting arbitrary ones. See content.ts's comment above
 * updateCategory/reorderCategories for the full reasoning.
 */
export function AdminCategories() {
  const [items, setItems] = useState<PortfolioCategoryInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ slug: string; description: string; bannerUrl: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    getPortfolioCategories()
      .then(setItems)
      .catch(() => setError("Falha ao carregar."));
  }

  useEffect(load, []);

  async function move(item: PortfolioCategoryInfo, direction: -1 | 1) {
    if (!items) return;
    const sorted = items.slice().sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((i) => i.slug === item.slug);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    [sorted[index], sorted[swapWith]] = [sorted[swapWith], sorted[index]];
    setBusySlug(item.slug);
    try {
      await reorderCategories(sorted.map((i) => i.slug));
      load();
    } catch {
      setError("Falha ao reordenar.");
    } finally {
      setBusySlug(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !items) return;
    setSaving(true);
    setError(null);
    try {
      const current = items.find((i) => i.slug === editing.slug);
      await updateCategory(editing.slug as PortfolioCategoryInfo["slug"], {
        description: editing.description,
        bannerUrl: editing.bannerUrl,
        order: current?.order ?? 0,
      });
      setEditing(null);
      load();
    } catch {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
      const path = `categories/${editing?.slug}-${Date.now()}${ext}`;
      const url = await uploadToMediaBucket(path, file, { contentType: file.type });
      setEditing((prev) => (prev ? { ...prev, bannerUrl: url } : prev));
    } catch {
      setError("Falha ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  const sorted = (items ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Categorias</h1>
      <p className="mt-1 text-sm text-paper-400">
        Descrição e banner de cada categoria do portfólio — as categorias em si são fixas no
        código (aparecem nos filtros e no cadastro de projetos), esta tela edita o conteúdo delas.
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para editar categorias de verdade.
          </p>
        </div>
      ) : (
        <>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          {editing ? (
            <form
              onSubmit={handleSubmit}
              className="mt-6 flex flex-col gap-4 rounded-[var(--radius-frame)] border border-flare-500/25 bg-ink-900/50 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-paper-100">
                  Editando {PORTFOLIO_CATEGORY_LABELS[editing.slug as keyof typeof PORTFOLIO_CATEGORY_LABELS]}
                </p>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  aria-label="Cancelar"
                  className="-m-2 rounded-full p-2 text-paper-500 hover:text-paper-200"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div>
                <label htmlFor="description" className="mb-1.5 block text-xs text-paper-400">
                  Descrição
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="bannerUrl" className="mb-1.5 block text-xs text-paper-400">
                  Banner
                </label>
                <div className="flex gap-2">
                  <input
                    id="bannerUrl"
                    value={editing.bannerUrl}
                    onChange={(e) => setEditing((prev) => (prev ? { ...prev, bannerUrl: e.target.value } : prev))}
                    className={inputClass}
                  />
                  <label
                    className={clsx(
                      "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-frame)] border border-paper-100/20 px-3 text-xs text-paper-300 hover:border-paper-100/40 hover:text-paper-100",
                      uploading && "pointer-events-none opacity-50",
                    )}
                  >
                    <UploadSimple size={13} aria-hidden />
                    {uploading ? "Enviando..." : "Enviar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void handleUpload(file);
                      }}
                    />
                  </label>
                </div>
                {editing.bannerUrl ? (
                  <img
                    src={editing.bannerUrl}
                    alt=""
                    className="mt-2 h-24 w-full rounded-[var(--radius-frame)] border border-paper-100/10 object-cover"
                  />
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          ) : null}

          {!items ? (
            <div className="mt-10 flex justify-center" aria-hidden>
              <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
            </div>
          ) : (
            <div className="mt-6 flex flex-col divide-y divide-paper-100/10 overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
              {sorted.map((item) => (
                <div
                  key={item.slug}
                  className={clsx(
                    "flex flex-wrap items-center gap-4 bg-ink-900/40 p-4 transition-opacity",
                    busySlug === item.slug && "opacity-50",
                  )}
                >
                  <img
                    src={item.bannerUrl}
                    alt=""
                    className="h-14 w-24 shrink-0 rounded-[var(--radius-frame)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-paper-100">
                      {PORTFOLIO_CATEGORY_LABELS[item.slug]}
                    </p>
                    <p className="truncate text-xs text-paper-500">
                      {item.description || "Sem descrição ainda"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(item, -1)}
                      aria-label="Mover para cima"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                    >
                      <ArrowUp size={13} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item, 1)}
                      aria-label="Mover para baixo"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                    >
                      <ArrowDown size={13} aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ slug: item.slug, description: item.description, bannerUrl: item.bannerUrl })
                    }
                    aria-label="Editar"
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                  >
                    <PencilSimple size={14} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
