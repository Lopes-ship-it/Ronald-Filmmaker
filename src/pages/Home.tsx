import { Hero } from "@/sections/Hero";
import { About } from "@/sections/About";
import { Services } from "@/sections/Services";
import { PortfolioPreview } from "@/sections/PortfolioPreview";
import { Process } from "@/sections/Process";
import { Equipment } from "@/sections/Equipment";
import { Contact } from "@/sections/Contact";
import { useSiteData } from "@/context/SiteDataContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import type { PortfolioProject } from "@/types";

interface HomeProps {
  portfolio: PortfolioProject[];
}

export function Home({ portfolio }: HomeProps) {
  const { settings, services, process, equipment } = useSiteData();

  useDocumentHead({
    title: settings.seoTitle,
    description: settings.seoDescription,
    image: settings.seoImageUrl,
  });

  return (
    <>
      <Hero />
      <About settings={settings} />
      <Services services={services} />
      <PortfolioPreview projects={portfolio} />
      <Process steps={process} />
      <Equipment items={equipment} />
      <Contact settings={settings} />
    </>
  );
}
