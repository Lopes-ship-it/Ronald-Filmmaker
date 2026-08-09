import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Plus,
  PencilSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  WarningCircle,
  X,
  UploadSimple,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { isFirebaseConfigured } from "@/lib/firebase";
import { uploadToMediaBucket } from "@/lib/content";

export type FieldConfig<T> =
  | { key: keyof T & string; label: string; type: "text"; placeholder?: string }
  | { key: keyof T & string; label: string; type: "textarea"; placeholder?: string }
  | { key: keyof T & string; label: string; type: "number"; placeholder?: string }
  | { key: keyof T & string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: keyof T & string; label: string; type: "image"; placeholder?: string };

interface SimpleEntity {
  id: string;
  order: number;
}

interface CollectionApi<T extends SimpleEntity> {
  adminList: () => Promise<T[]>;
  create: (input: Omit<T, "id">) => Promise<T>;
  update: (id: string, input: Omit<T, "id">) => Promise<T>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}

interface SimpleCollectionAdminProps<T extends SimpleEntity> {
  title: string;
  description?: string;
  storageFolder: string;
  itemLabel: (item: T) => string;
  itemSubtitle?: (item: T) => string;
  fields: FieldConfig<T>[];
  defaults: Record<string, string>;
  api: CollectionApi<T>;
}

type FormValues = Record<string, string>;

function toFormValues<T>(item: Partial<T> | undefined, fields: FieldConfig<T>[], defaults: FormValues): FormValues {
  const values: FormValues = { ...defaults };
  for (const field of fields) {
    const raw = item?.[field.key];
    if (raw !== undefined && raw !== null) values[field.key] = String(raw);
  }
  return values;
}

function fromFormValues<T extends SimpleEntity>(
  values: FormValues,
  fields: FieldConfig<T>[],
  order: number,
): Omit<T, "id"> {
  const result: Record<string, unknown> = { order };
  for (const field of fields) {
    const raw = values[field.key] ?? "";
    result[field.key] = field.type === "number" ? Number(raw) || 0 : raw;
  }
  return result as Omit<T, "id">;
}

/**
 * Generic list + inline form admin screen for the small flat collections
 * (services, equipment) — every one of them is `{ id, order, ...a handful
 * of scalar fields }`, so one configurable component replaces near-identical
 * CRUD pages. Category management (src/pages/admin/Categories.tsx) is a
 * special case — see that file — and doesn't use this component.
 */
export function SimpleCollectionAdmin<T extends SimpleEntity>({
  title,
  description,
  storageFolder,
  itemLabel,
  itemSubtitle,
  fields,
  defaults,
  api,
}: SimpleCollectionAdminProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; values: FormValues } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  function load() {
    if (!isFirebaseConfigured) return;
    api
      .adminList()
      .then(setItems)
      .catch(() => setError("Falha ao carregar."));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => (items ?? []).slice().sort((a, b) => a.order - b.order), [items]);

  function openCreate() {
    setEditing({ id: null, values: toFormValues(undefined, fields, defaults) });
  }

  function openEdit(item: T) {
    setEditing({ id: item.id, values: toFormValues(item, fields, defaults) });
  }

  function closeForm() {
    setEditing(null);
  }

  function updateField(key: string, value: string) {
    setEditing((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));
  }

  async function handleUpload(field: FieldConfig<T>, file: File) {
    setUploadingField(field.key);
    try {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
      const path = `${storageFolder}/${Date.now()}${ext}`;
      const url = await uploadToMediaBucket(path, file, { contentType: file.type });
      updateField(field.key, url);
    } catch {
      setError("Falha ao enviar imagem.");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const order = editing.id
        ? (items?.find((i) => i.id === editing.id)?.order ?? sorted.length)
        : sorted.length;
      const input = fromFormValues<T>(editing.values, fields, order);
      if (editing.id) {
        await api.update(editing.id, input);
      } else {
        await api.create(input);
      }
      closeForm();
      load();
    } catch {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await api.remove(id);
      setConfirmDeleteId(null);
      load();
    } catch {
      setError("Falha ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  async function move(item: T, direction: -1 | 1) {
    const index = sorted.findIndex((i) => i.id === item.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setBusyId(item.id);
    try {
      await api.reorder(reordered.map((i) => i.id));
      load();
    } catch {
      setError("Falha ao reordenar.");
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-paper-50 md:text-3xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-paper-400">{description}</p> : null}
        </div>
        {isFirebaseConfigured ? (
          <Button variant="primary" onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus size={16} weight="bold" aria-hidden />
            Novo item
          </Button>
        ) : null}
      </div>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha{" "}
            <code>firebaseConfig</code> em <code>src/lib/firebase.ts</code> para gerenciar
            conteúdo de verdade.
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
                  {editing.id ? "Editar item" : "Novo item"}
                </p>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Cancelar"
                  className="-m-2 rounded-full p-2 text-paper-500 hover:text-paper-200"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
                    <label htmlFor={field.key} className="mb-1.5 block text-xs text-paper-400">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={field.key}
                        rows={3}
                        value={editing.values[field.key] ?? ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={field.key}
                        value={editing.values[field.key] ?? ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className={inputClass}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "image" ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            id={field.key}
                            value={editing.values[field.key] ?? ""}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder ?? "https://..."}
                            className={inputClass}
                          />
                          <label
                            className={clsx(
                              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-frame)] border border-paper-100/20 px-3 text-xs text-paper-300 hover:border-paper-100/40 hover:text-paper-100",
                              uploadingField === field.key && "pointer-events-none opacity-50",
                            )}
                          >
                            <UploadSimple size={13} aria-hidden />
                            {uploadingField === field.key ? "Enviando..." : "Enviar"}
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void handleUpload(field, file);
                              }}
                            />
                          </label>
                        </div>
                        {editing.values[field.key] ? (
                          <img
                            src={editing.values[field.key]}
                            alt=""
                            className="h-20 w-32 rounded-[var(--radius-frame)] border border-paper-100/10 object-cover"
                          />
                        ) : null}
                      </div>
                    ) : (
                      <input
                        id={field.key}
                        type={field.type === "number" ? "number" : "text"}
                        value={editing.values[field.key] ?? ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeForm}>
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
          ) : sorted.length === 0 ? (
            <p className="mt-10 text-sm italic text-paper-500">Nenhum item ainda.</p>
          ) : (
            <div className="mt-6 flex flex-col divide-y divide-paper-100/10 overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
              {sorted.map((item) => (
                <div
                  key={item.id}
                  className={clsx(
                    "flex flex-wrap items-center gap-4 bg-ink-900/40 p-4 transition-opacity",
                    busyId === item.id && "opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-paper-100">{itemLabel(item)}</p>
                    {itemSubtitle ? (
                      <p className="truncate text-xs text-paper-500">{itemSubtitle(item)}</p>
                    ) : null}
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label="Editar"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-paper-100/35 hover:text-paper-100"
                    >
                      <PencilSimple size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label="Excluir"
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-frame)] border border-paper-100/15 text-paper-400 hover:border-flare-500/50 hover:text-flare-400"
                    >
                      <Trash size={14} aria-hidden />
                    </button>
                  </div>

                  {confirmDeleteId === item.id ? (
                    <div className="flex w-full items-center gap-3 rounded-[var(--radius-frame)] border border-flare-500/30 bg-flare-500/5 p-3">
                      <WarningCircle size={16} className="shrink-0 text-flare-400" aria-hidden />
                      <p className="flex-1 text-xs text-paper-200">
                        Excluir "{itemLabel(item)}" permanentemente?
                      </p>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="rounded-[var(--radius-frame)] bg-flare-500 px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-flare-400 disabled:opacity-50"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-paper-400 hover:text-paper-100"
                      >
                        Cancelar
                      </button>
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
