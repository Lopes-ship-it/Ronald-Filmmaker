import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useDocumentHead, SITE_NAME } from "@/hooks/useDocumentHead";

export function NotFound() {
  // Explicit title/description here (rather than leaving whatever the
  // previous route set) so a bad URL never keeps showing another page's
  // meta tags in the tab or in a crawler that executes JS.
  useDocumentHead({
    title: `Página não encontrada — ${SITE_NAME}`,
    description: "Essa página não existe, ou mudou de endereço.",
  });

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-start justify-center gap-4 py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flare-400">Erro 404</p>
      <h1 className="font-display text-3xl text-paper-50 md:text-4xl">
        Essa página não existe, ou mudou de endereço.
      </h1>
      <Button to="/" variant="primary" className="mt-2">
        <ArrowLeft size={16} weight="bold" aria-hidden />
        Voltar ao início
      </Button>
    </div>
  );
}
