import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCrmObjectivesBoard } from "@/lib/prospection.functions";
import { useProspectionStore } from "@/store/useProspectionStore";

/**
 * Objectifs du mois de tous les managers du cabinet (cible et réalisé), calculés
 * côté serveur. Recalculé après chaque saisie (étape, action, cible modifiée).
 */
export function useObjectivesBoard(month: string) {
  const refreshKey = useProspectionStore(
    (s) =>
      `${s.activities.length}:${s.opportunities.map((o) => `${o.id}:${o.stage}`).join(",")}:${s.objectives
        .filter((o) => o.month === month)
        .map((o) => `${o.managerId}:${o.metric}:${o.target}`)
        .join(",")}`,
  );
  return useQuery({
    queryKey: ["crm-objectives-board", month, refreshKey],
    queryFn: () => getCrmObjectivesBoard({ data: { month } }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}
