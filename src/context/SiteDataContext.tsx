import { createContext, useContext } from "react";
import type {
  SiteSettings,
  Service,
  ProcessStep,
  EquipmentItem,
  PortfolioCategoryInfo,
} from "@/types";

export interface SiteData {
  settings: SiteSettings;
  services: Service[];
  process: ProcessStep[];
  equipment: EquipmentItem[];
  portfolioCategories: PortfolioCategoryInfo[];
}

export const SiteDataContext = createContext<SiteData | null>(null);

export function useSiteData(): SiteData {
  const ctx = useContext(SiteDataContext);
  if (!ctx) {
    throw new Error("useSiteData must be used within SiteDataContext.Provider");
  }
  return ctx;
}
