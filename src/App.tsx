import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Header } from "@/sections/Header";
import { Footer } from "@/sections/Footer";
import { ScrollManager } from "@/components/ScrollManager";
import { RequireAuth } from "@/components/RequireAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AuthProvider } from "@/context/AuthContext";
import { SiteDataContext, type SiteData } from "@/context/SiteDataContext";
import {
  getSiteSettings,
  getServices,
  getProcessSteps,
  getEquipment,
  getPortfolioCategories,
  getPortfolioProjects,
} from "@/lib/content";
import type { PortfolioProject } from "@/types";

// Each route is its own chunk — the public site only pays for Home on first
// load; /portfolio and /portfolio/:slug are fetched on navigation.
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const PortfolioPage = lazy(() =>
  import("@/pages/PortfolioPage").then((m) => ({ default: m.PortfolioPage })),
);
const ProjectPage = lazy(() => import("@/pages/ProjectPage").then((m) => ({ default: m.ProjectPage })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const AdminLogin = lazy(() =>
  import("@/pages/admin/Login").then((m) => ({ default: m.AdminLogin })),
);
const AdminDashboard = lazy(() =>
  import("@/pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboard })),
);
const AdminProjects = lazy(() =>
  import("@/pages/admin/Projects").then((m) => ({ default: m.AdminProjects })),
);
const AdminProjectForm = lazy(() =>
  import("@/pages/admin/ProjectForm").then((m) => ({ default: m.AdminProjectForm })),
);
const AdminCategories = lazy(() =>
  import("@/pages/admin/Categories").then((m) => ({ default: m.AdminCategories })),
);
const AdminServices = lazy(() =>
  import("@/pages/admin/Services").then((m) => ({ default: m.AdminServices })),
);
const AdminEquipment = lazy(() =>
  import("@/pages/admin/Equipment").then((m) => ({ default: m.AdminEquipment })),
);
const AdminContact = lazy(() =>
  import("@/pages/admin/Contact").then((m) => ({ default: m.AdminContact })),
);
const AdminSettings = lazy(() =>
  import("@/pages/admin/Settings").then((m) => ({ default: m.AdminSettings })),
);
const AdminSeo = lazy(() => import("@/pages/admin/Seo").then((m) => ({ default: m.AdminSeo })));
const AdminMedia = lazy(() => import("@/pages/admin/Media").then((m) => ({ default: m.AdminMedia })));
const AdminReports = lazy(() =>
  import("@/pages/admin/Reports").then((m) => ({ default: m.AdminReports })),
);
const AdminLogs = lazy(() => import("@/pages/admin/Logs").then((m) => ({ default: m.AdminLogs })));
const AdminProfile = lazy(() =>
  import("@/pages/admin/Profile").then((m) => ({ default: m.AdminProfile })),
);

function FullPageLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink-950">
      <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" aria-hidden />
      <span className="sr-only">Carregando</span>
    </div>
  );
}

function FullPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-ink-950 px-6 text-center">
      <p className="text-sm text-paper-300">
        Não foi possível carregar o site agora. Verifique sua conexão e tente novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-[var(--radius-frame)] border border-paper-100/20 px-4 py-2 text-sm text-paper-100 transition-colors hover:border-flare-500/50 hover:text-flare-400"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function RouteLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-hidden>
      <div className="h-8 w-8 animate-pulse rounded-full bg-flare-500/60" />
    </div>
  );
}

/**
 * Layout for every PUBLIC page (Home, Portfolio, project pages, 404): the
 * fixed site header + footer wrap only this route group via <Outlet/>.
 *
 * This used to be rendered unconditionally around the whole app, including
 * every /admin/* route — the public header is `fixed`/`z-50`, so on mobile
 * its own hamburger button sat visually on top of the admin panel's own
 * topbar and logo. Tapping "open menu" in the admin panel often actually
 * hit the public header's logo underneath it, instantly navigating away to
 * "/". Scoping Header/Footer to only the public route group removes that
 * overlap entirely — the admin panel now only ever renders its own
 * self-contained chrome (see AdminLayout).
 */
function PublicShell({ settings }: { settings: SiteData["settings"] }) {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Outlet />
      </main>
      <Footer settings={settings} />
    </>
  );
}

function App() {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioProject[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);

    Promise.all([
      getSiteSettings(),
      getServices(),
      getProcessSteps(),
      getEquipment(),
      getPortfolioCategories(),
      getPortfolioProjects(),
    ])
      .then(([settings, services, process, equipment, portfolioCategories, projects]) => {
        if (cancelled) return;
        setSiteData({ settings, services, process, equipment, portfolioCategories });
        setPortfolio(projects);
      })
      .catch(() => {
        // Every read in lib/content.ts already swallows its own Firestore
        // errors and falls back to mock data, so this branch should never
        // fire in practice — it's a defensive backstop so a future
        // regression (or an unexpected synchronous throw) shows a real
        // error screen with a retry button instead of hanging on the
        // loading spinner forever with no way to recover.
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loadError) {
    return <FullPageError onRetry={() => setAttempt((a) => a + 1)} />;
  }

  if (!siteData || !portfolio) {
    return <FullPageLoader />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteDataContext.Provider value={siteData}>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-frame)] focus:bg-flare-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
          >
            Pular para o conteúdo
          </a>

          <div className="grain-overlay" />

          <ScrollManager />

          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route element={<PublicShell settings={siteData.settings} />}>
                <Route path="/" element={<Home portfolio={portfolio} />} />
                <Route path="/portfolio" element={<PortfolioPage portfolio={portfolio} />} />
                <Route path="/portfolio/:slug" element={<ProjectPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="projetos" element={<AdminProjects />} />
                <Route path="projetos/novo" element={<AdminProjectForm />} />
                <Route path="projetos/:id" element={<AdminProjectForm />} />
                <Route path="categorias" element={<AdminCategories />} />
                <Route path="servicos" element={<AdminServices />} />
                <Route path="equipamentos" element={<AdminEquipment />} />
                <Route path="contato" element={<AdminContact />} />
                <Route path="configuracoes" element={<AdminSettings />} />
                <Route path="seo" element={<AdminSeo />} />
                <Route path="midias" element={<AdminMedia />} />
                <Route path="relatorios" element={<AdminReports />} />
                <Route path="registros" element={<AdminLogs />} />
                <Route path="perfil" element={<AdminProfile />} />
              </Route>
            </Routes>
          </Suspense>
        </SiteDataContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
