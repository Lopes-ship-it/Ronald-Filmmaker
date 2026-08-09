import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  SquaresFour,
  FilmSlate,
  FolderSimple,
  Wrench,
  Camera,
  EnvelopeSimple,
  MagnifyingGlass,
  Images,
  GearSix,
  ChartBar,
  ClockCounterClockwise,
  UserCircle,
  SignOut,
  List,
  X,
  House,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  to?: string;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  /** Sections not built yet — shown, but visibly disabled with a badge instead of pretending to work. */
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: SquaresFour },
  { label: "Portfólio", to: "/admin/projetos", icon: FilmSlate },
  { label: "Categorias", to: "/admin/categorias", icon: FolderSimple },
  { label: "Serviços", to: "/admin/servicos", icon: Wrench },
  { label: "Equipamentos", to: "/admin/equipamentos", icon: Camera },
  { label: "Contato", to: "/admin/contato", icon: EnvelopeSimple },
  { label: "SEO", to: "/admin/seo", icon: MagnifyingGlass },
  { label: "Mídias", to: "/admin/midias", icon: Images },
  { label: "Configurações gerais", to: "/admin/configuracoes", icon: GearSix },
  { label: "Relatórios", to: "/admin/relatorios", icon: ChartBar },
  { label: "Registros", to: "/admin/registros", icon: ClockCounterClockwise },
  { label: "Perfil", to: "/admin/perfil", icon: UserCircle },
];

/**
 * Shell for every /admin/* screen: a persistent sidebar (collapsible on
 * mobile) plus a topbar with the signed-in operator's email and sign-out.
 * Every item in NAV_ITEMS below is wired to a real screen.
 */
export function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    try {
      if (firebaseAuth) {
        await signOut(firebaseAuth);
      }
    } catch {
      // Best-effort — even if Firebase's own sign-out call fails (rare;
      // usually a network hiccup), still send the operator back to the
      // login screen below rather than leaving "Sair" looking broken.
    }
    navigate("/admin/login", { replace: true });
  }

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.comingSoon || !item.to) {
          return (
            <div
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm text-paper-600"
              title="Em breve"
            >
              <span className="flex items-center gap-3">
                <Icon size={17} aria-hidden />
                {item.label}
              </span>
              <span className="rounded-full border border-paper-100/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-paper-600">
                Em breve
              </span>
            </div>
          );
        }
        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/admin"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-flare-500/10 text-flare-300"
                  : "text-paper-300 hover:bg-paper-100/5 hover:text-paper-100",
              )
            }
          >
            <Icon size={17} aria-hidden />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-ink-950">
      <div className="flex min-h-[100dvh]">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-paper-100/10 bg-ink-900/40 backdrop-blur-sm lg:flex lg:flex-col">
          <div className="border-b border-paper-100/10 px-5 py-6">
            <p className="font-display text-lg text-paper-50">Ronald Filmmaker</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-paper-500">
              Painel administrativo
            </p>
          </div>
          {navContent}
          <div className="flex flex-col gap-1 border-t border-paper-100/10 px-3 py-4">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm text-paper-400 transition-colors hover:bg-paper-100/5 hover:text-flare-400"
            >
              <House size={17} aria-hidden />
              Voltar ao site
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm text-paper-400 transition-colors hover:bg-paper-100/5 hover:text-flare-400"
            >
              <SignOut size={17} aria-hidden />
              Sair
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-paper-100/10 bg-ink-900">
              <div className="flex items-center justify-between border-b border-paper-100/10 px-5 py-6">
                <div>
                  <p className="font-display text-lg text-paper-50">Ronald Filmmaker</p>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-paper-500">
                    Painel administrativo
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setMobileOpen(false)}
                  className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-paper-400 hover:text-paper-100"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              {navContent}
              <div className="flex flex-col gap-1 border-t border-paper-100/10 px-3 py-4">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm text-paper-400 transition-colors hover:bg-paper-100/5 hover:text-flare-400"
                >
                  <House size={17} aria-hidden />
                  Voltar ao site
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-frame)] px-3 py-2.5 text-sm text-paper-400 transition-colors hover:bg-paper-100/5 hover:text-flare-400"
                >
                  <SignOut size={17} aria-hidden />
                  Sair
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-paper-100/10 bg-ink-950/80 px-3 py-2.5 backdrop-blur-sm lg:px-8 lg:py-4">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-paper-300 transition-colors hover:text-paper-100 lg:hidden"
            >
              <List size={22} aria-hidden />
            </button>
            <div className="hidden lg:block" />
            <div className="flex min-w-0 items-center gap-1">
              <Link
                to="/"
                aria-label="Voltar ao site"
                title="Voltar ao site"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-paper-300 transition-colors hover:text-flare-400 sm:hidden"
              >
                <House size={19} aria-hidden />
              </Link>
              <Link
                to="/"
                className="hidden shrink-0 items-center gap-1.5 rounded-[var(--radius-frame)] border border-paper-100/15 px-3 py-2 text-xs text-paper-300 transition-colors hover:border-flare-500/40 hover:text-flare-400 sm:flex"
              >
                <House size={14} aria-hidden />
                Voltar ao site
              </Link>
              <p className="truncate pl-1 text-sm text-paper-400">{user?.email ?? "administrador"}</p>
            </div>
          </header>
          <main id="conteudo" className="flex-1 px-5 py-8 lg:px-8 lg:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
