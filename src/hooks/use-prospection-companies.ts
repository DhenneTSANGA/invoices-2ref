import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { listClientsForProspection } from "@/lib/data.functions";
import { mergeProspectionCompanies } from "@/lib/prospection-facturation-clients";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import type { Company } from "@/lib/prospection-demo";

export const prospectionClientsKey = ["prospection", "facturation-clients"] as const;

/** Clients Facturation (live, 2 cabinets) + prospects CRM locaux. */
export function useProspectionCompanies(): {
  companies: Company[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { session } = useRouteContext({ from: "/prospection" });
  const localCompanies = useProspectionDemoStore((s) => s.companies);
  const overlays = useProspectionDemoStore((s) => s.clientOverlays);
  const defaultManagerId = session.staff.id;

  const query = useQuery({
    queryKey: prospectionClientsKey,
    queryFn: () => listClientsForProspection(),
    staleTime: 60_000,
  });

  const companies = useMemo(
    () =>
      mergeProspectionCompanies({
        facturationClients: query.data ?? [],
        localCompanies,
        overlays: overlays ?? {},
        defaultManagerId,
      }),
    [query.data, localCompanies, overlays, defaultManagerId],
  );

  return {
    companies,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
