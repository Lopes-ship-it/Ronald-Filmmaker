import { useEffect, useState } from "react";
import { Eye, WhatsappLogo, InstagramLogo, WarningCircle } from "@phosphor-icons/react";
import { adminGetAnalyticsSummary, type AnalyticsSummary } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper-400">{label}</p>
        <Icon size={18} className="text-flare-400" aria-hidden />
      </div>
      <p className="mt-3 font-display text-3xl text-paper-50">{value}</p>
    </div>
  );
}

export function AdminReports() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    adminGetAnalyticsSummary()
      .then(setSummary)
      .catch(() => setError("Falha ao carregar."));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Relatórios</h1>
      <p className="mt-1 text-sm text-paper-400">
        Visualizações de projetos e cliques em WhatsApp/Instagram, contados a partir de eventos
        anônimos registrados pelo próprio site (sem cookies, sem dados pessoais).
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para ver dados de verdade.
          </p>
        </div>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-flare-400">
          {error}
        </p>
      ) : !summary ? (
        <div className="mt-10 flex justify-center" aria-hidden>
          <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Visualizações de projeto" value={summary.byType.project_view} icon={Eye} />
            <StatCard label="Cliques no WhatsApp" value={summary.byType.whatsapp_click} icon={WhatsappLogo} />
            <StatCard label="Cliques no Instagram" value={summary.byType.instagram_click} icon={InstagramLogo} />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-paper-100">Projetos mais vistos</p>
            {summary.topProjectViews.length === 0 ? (
              <p className="mt-3 text-sm italic text-paper-500">Ainda sem visualizações registradas.</p>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-paper-100/10 overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
                {summary.topProjectViews.map((row) => (
                  <div key={row.label} className="flex items-center justify-between bg-ink-900/40 px-4 py-3">
                    <p className="text-sm text-paper-200">{row.label}</p>
                    <p className="text-sm font-medium text-paper-50">{row.count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-paper-600">
            Integração com Google Analytics fica de fora desta entrega — os números acima já são
            reais (contados no Firestore a cada visita/clique), mas sem os detalhes que o GA
            oferece (origem de tráfego, dispositivo, funil). Pode ser adicionada depois sem
            afetar o que já existe aqui.
          </p>
        </>
      )}
    </div>
  );
}
