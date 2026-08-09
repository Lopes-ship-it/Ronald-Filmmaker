import { useEffect, useState } from "react";
import clsx from "clsx";
import { WarningCircle, CheckCircle, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { adminGetSiteSettings, updateSiteSettings, uploadToMediaBucket } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { SiteSettings } from "@/types";

const inputClass =
  "w-full rounded-[var(--radius-frame)] border border-paper-100/20 bg-ink-950/40 px-4 py-2.5 text-sm text-paper-50 placeholder:text-paper-600 focus:border-flare-500 focus:outline-none";
const labelClass = "mb-1.5 block text-xs text-paper-400";

type FormState = Pick<
  SiteSettings,
  "aboutPhotoUrl" | "aboutStory" | "aboutMission" | "aboutVision"
> & {
  aboutDifferentials: string;
  aboutSpecialties: string;
};

function ImageField({
  label,
  value,
  onChange,
  uploadPath,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadPath: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
      const url = await uploadToMediaBucket(`${uploadPath}-${Date.now()}${ext}`, file, {
        contentType: file.type,
      });
      onChange(url);
    } catch {
      setUploadError("Falha ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
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
      {uploadError ? (
        <p role="alert" className="mt-1.5 text-xs text-flare-400">
          {uploadError}
        </p>
      ) : null}
      {value ? (
        <img src={value} alt="" className="mt-2 h-24 w-full rounded-[var(--radius-frame)] border border-paper-100/10 object-cover" />
      ) : null}
    </div>
  );
}

export function AdminSettings() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    adminGetSiteSettings()
      .then((settings) =>
        setForm({
          aboutPhotoUrl: settings.aboutPhotoUrl,
          aboutStory: settings.aboutStory,
          aboutMission: settings.aboutMission,
          aboutVision: settings.aboutVision,
          aboutDifferentials: settings.aboutDifferentials.join(", "),
          aboutSpecialties: settings.aboutSpecialties.join(", "),
        }),
      )
      .catch(() => setError("Falha ao carregar."));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await updateSiteSettings({
        aboutPhotoUrl: form.aboutPhotoUrl,
        aboutStory: form.aboutStory,
        aboutMission: form.aboutMission,
        aboutVision: form.aboutVision,
        aboutDifferentials: form.aboutDifferentials
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        aboutSpecialties: form.aboutSpecialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setSaved(true);
    } catch {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Configurações gerais</h1>
      <p className="mt-1 text-sm text-paper-400">
        Textos e imagens da seção Sobre do site público.
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para editar de verdade.
          </p>
        </div>
      ) : !form ? (
        <div className="mt-10 flex justify-center" aria-hidden>
          <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex max-w-2xl flex-col gap-6">
          <section className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-paper-100">Sobre</p>
            <ImageField
              label="Foto"
              value={form.aboutPhotoUrl}
              onChange={(v) => update("aboutPhotoUrl", v)}
              uploadPath="settings/about-photo"
            />
            <div>
              <label htmlFor="aboutStory" className={labelClass}>
                História
              </label>
              <textarea
                id="aboutStory"
                rows={4}
                value={form.aboutStory}
                onChange={(e) => update("aboutStory", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="aboutMission" className={labelClass}>
                Missão
              </label>
              <textarea
                id="aboutMission"
                rows={2}
                value={form.aboutMission}
                onChange={(e) => update("aboutMission", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="aboutVision" className={labelClass}>
                Visão
              </label>
              <textarea
                id="aboutVision"
                rows={2}
                value={form.aboutVision}
                onChange={(e) => update("aboutVision", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="aboutDifferentials" className={labelClass}>
                Diferenciais (separados por vírgula)
              </label>
              <input
                id="aboutDifferentials"
                value={form.aboutDifferentials}
                onChange={(e) => update("aboutDifferentials", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="aboutSpecialties" className={labelClass}>
                Especialidades (separadas por vírgula)
              </label>
              <input
                id="aboutSpecialties"
                value={form.aboutSpecialties}
                onChange={(e) => update("aboutSpecialties", e.target.value)}
                className={inputClass}
              />
            </div>
          </section>

          {error ? (
            <p role="alert" className="text-sm text-flare-400">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm text-flare-400">
                <CheckCircle size={16} weight="fill" aria-hidden />
                Salvo
              </span>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
