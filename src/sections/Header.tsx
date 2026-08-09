import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { List, X, LockKey } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Sobre", to: "/#sobre" },
  { label: "Serviços", to: "/#servicos" },
  { label: "Portfólio", to: "/portfolio" },
  { label: "Processo", to: "/#processo" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!(entry?.isIntersecting ?? true)),
      { rootMargin: "-1px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 h-16 transition-colors duration-300 md:h-[72px]",
          scrolled
            ? "border-b border-paper-100/10 bg-ink-950/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container-page flex h-full items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-paper-50"
            aria-label="Ronald Filmmaker, ir para o topo"
          >
            <img src="/brand/ronald-icon.webp" alt="" className="h-7 w-auto md:h-8" />
            <span className="font-display text-base tracking-wide md:text-lg">
              Ronald Filmmaker
            </span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-paper-200 transition-colors hover:text-flare-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link
              to="/admin/login"
              aria-label="Login administrativo"
              className="flex h-9 w-9 items-center justify-center text-paper-500 transition-colors hover:text-flare-400"
            >
              <LockKey size={18} aria-hidden />
            </Link>
            <Button to="/#contato" variant="primary" className="px-6 py-3 text-xs">
              Solicitar Orçamento
            </Button>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center text-paper-50 lg:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} aria-hidden /> : <List size={22} aria-hidden />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink-950 pt-16 lg:hidden"
          >
            <nav aria-label="Navegação móvel" className="container-page flex flex-1 flex-col justify-center py-6">
              <ul className="flex flex-col gap-2">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.to}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                    className="border-b border-paper-100/10 py-4"
                  >
                    <Link
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className="font-display text-2xl text-paper-50"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8">
                <Button
                  to="/#contato"
                  variant="primary"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-4"
                >
                  Solicitar Orçamento
                </Button>
              </div>
              <Link
                to="/admin/login"
                onClick={() => setMenuOpen(false)}
                className="mt-6 flex items-center gap-2 text-sm text-paper-600 transition-colors hover:text-flare-400"
              >
                <LockKey size={16} aria-hidden />
                Login administrativo
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
