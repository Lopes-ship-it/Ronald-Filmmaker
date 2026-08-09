import { useEffect, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { adminListLogs } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { AdminLogEntry } from "@/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    adminListLogs()
      .then(setLogs)
      .catch(() => setError("Falha ao carregar."));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Registros</h1>
      <p className="mt-1 text-sm text-paper-400">
        Histórico de ações administrativas — quem fez o quê e quando. Últimas 100 entradas.
      </p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <WarningCircle size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha <code>firebaseConfig</code>{" "}
            em <code>src/lib/firebase.ts</code> para ver o histórico de verdade.
          </p>
        </div>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-flare-400">
          {error}
        </p>
      ) : !logs ? (
        <div className="mt-10 flex justify-center" aria-hidden>
          <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
        </div>
      ) : logs.length === 0 ? (
        <p className="mt-10 text-sm italic text-paper-500">Nenhuma ação registrada ainda.</p>
      ) : (
        <div className="mt-6 flex flex-col divide-y divide-paper-100/10 overflow-hidden rounded-[var(--radius-frame)] border border-paper-100/10">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 bg-ink-900/40 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-paper-100">{log.action}</p>
                <p className="truncate text-xs text-paper-500">{log.actorEmail ?? "desconhecido"}</p>
              </div>
              <p className="shrink-0 text-xs text-paper-600">{formatDate(log.at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
