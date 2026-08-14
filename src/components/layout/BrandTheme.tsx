import { useEffect } from "react";
import { useCompany } from "@/hooks/use-data";
import { applyPrimaryColor } from "@/lib/brand-theme";

/** Applique la couleur primaire du cabinet actif (boutons, accents, entêtes). */
export function BrandTheme() {
  const { data: company } = useCompany();

  useEffect(() => {
    applyPrimaryColor(company?.primaryColor);
  }, [company?.primaryColor]);

  return null;
}
