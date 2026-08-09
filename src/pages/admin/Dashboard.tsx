import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilmSlate, Star, EyeSlash, Info, ArrowRight } from "@phosphor-icons/react";
import { adminListPortfolioProjects } from "@/lib/content";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { PortfolioProject } from "@/types";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
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

export function AdminDashboard() {
  const [projects, setProjects] = useState<PortfolioProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    adminListPortfolioProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setError("Falha ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const published = projects?.filter((p) => p.published !== false).length ?? 0;
  const drafts = projects?.filter((p) => p.published === false).length ?? 0;
  const featured = projects?.filter((p) => p.featured).length ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl text-paper-50 md:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-paper-400">Visão geral do conteúdo do site.</p>

      {!isFirebaseConfigured ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
          <Info size={20} className="mt-0.5 shrink-0 text-flare-400" aria-hidden />
          <p className="text-sm leading-relaxed text-paper-200">
            O Firebase não está configurado neste projeto — preencha{" "}
            <code>firebaseConfig</code> em <code>src/lib/firebase.ts</code> para o painel
            conseguir ler ou salvar conteúdo real no Firestore.
          </p>
        </div>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-flare-400">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projetos no total" value={projects?.length ?? "—"} icon={FilmSlate} />
            <StatCard label="Publicados" value={projects ? published : "—"} icon={FilmSlate} />
            <StatCard label="Em destaque" value={projects ? featured : "—"} icon={Star} />
            <StatCard label="Rascunhos" value={projects ? drafts : "—"} icon={EyeSlash} />
          </div>

          <Link
            to="/admin/projetos"
            className="mt-8 inline-flex items-center gap-2 text-sm text-flare-400 transition-colors hover:text-flare-300"
          >
            Gerenciar portfólio
            <ArrowRight size={15} aria-hidden />
          </Link>
        </>
      )}

      <div className="mt-10 rounded-[var(--radius-frame)] border border-paper-100/10 bg-ink-900/50 p-6">
        <p className="text-sm font-semibold text-paper-100">O que já funciona de verdade</p>
        <p className="mt-2 text-sm leading-relaxed text-paper-400">
          Todo o menu lateral já é funcional: portfólio (criar, editar, publicar/ocultar,
          destacar, reordenar, excluir, upload de vídeo com compressão no navegador e miniatura
          automática), categorias, serviços, equipamentos, contato, SEO global, biblioteca de
          mídia, configurações gerais, relatórios de visualizações e cliques, registro de
          auditoria e troca de senha — tudo lendo e gravando direto no Firestore e no Firebase
          Storage, com a autorização garantida pelas regras do Firebase (
          <code>firestore.rules</code> / <code>storage.rules</code>), não pela interface.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-paper-400">
          Relatórios conta visualizações e cliques reais registrados pelo próprio site, sem uma
          integração com o Google Analytics (fica de fora desta entrega). SEO cobre os campos
          globais; <code>sitemap.xml</code>/<code>robots.txt</code> continuam arquivos estáticos,
          já que o site é uma SPA sem servidor.
        </p>
      </div>
    </div>
  );
}
