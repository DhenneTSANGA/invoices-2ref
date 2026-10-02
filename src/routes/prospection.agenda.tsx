import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { NewActivityDialog } from "@/components/prospection/CrmForms";
import { ActivityStatusBadge } from "@/components/prospection/ProspectionBadges";
import { CrmCard, CrmCardGrid, DateTile, KindMark } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, CrmSearchEmpty, CrmSearchField, FilterChip, matchesSearch } from "@/components/prospection/CrmUi";
import { ACTIVITY_LABELS, managerName } from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Prospection" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const activities = useProspectionDemoStore((s) => s.activities);
  const setActivityStatus = useProspectionDemoStore((s) => s.setActivityStatus);
  const [view, setView] = useState<"jour" | "semaine" | "mois">("semaine");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const dated = useMemo(
    () =>
      [...activities]
        .filter(
          (a) =>
            a.kind === "rdv" ||
            a.kind === "visite" ||
            a.kind === "evenement" ||
            a.kind === "tache" ||
            a.status === "planifiee" ||
            a.status === "a_faire",
        )
        .sort((a, b) => a.at.localeCompare(b.at)),
    [activities],
  );

  const today = new Date().toISOString().slice(0, 10);
  const filtered = dated.filter((a) => {
    const inPeriod =
      view === "jour"
        ? a.at === today
        : view === "semaine"
          ? Math.abs(new Date(a.at).getTime() - new Date(today).getTime()) < 8 * 86400000
          : a.at.slice(0, 7) === today.slice(0, 7);
    if (!inPeriod) return false;
    const co = companies.find((c) => c.id === a.companyId);
    return matchesSearch(query, co?.name, a.title, a.summary, a.time, ACTIVITY_LABELS[a.kind], managerName(a.ownerId));
  });

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Jour, semaine, mois — RDV, visites, événements, tâches planifiées."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouveau RDV
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher dans l’agenda"
        placeholder="Rechercher une entreprise, un rendez-vous, un manager…"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["jour", "semaine", "mois"] as const).map((v) => (
          <FilterChip key={v} active={view === v} onClick={() => setView(v)}>
            {v}
          </FilterChip>
        ))}
      </div>
      {filtered.length === 0 ? (
        query ? (
          <CrmSearchEmpty
            title="Aucun rendez-vous"
            description="Rien ne correspond à cette recherche sur la période affichée."
            onClear={() => setQuery("")}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Rien sur cette période.</p>
        )
      ) : (
        <CrmCardGrid dense>
          {filtered.map((a, i) => {
            const co = companies.find((c) => c.id === a.companyId);
            return (
              <CrmCard key={a.id} index={i} className="h-full">
                <div className="flex items-start gap-3">
                  <DateTile iso={a.at} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {a.time ?? "Toute la journée"} · {ACTIVITY_LABELS[a.kind]}
                        </p>
                        <h2 className="mt-0.5 font-display text-base font-semibold leading-tight">
                          {co?.name ?? "Entreprise"}
                        </h2>
                      </div>
                      <ActivityStatusBadge status={a.status} />
                    </div>
                    <p className="mt-2 text-sm">{a.title}</p>
                    {a.summary ? <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p> : null}
                  </div>
                  <KindMark kind={a.kind} />
                </div>
                {a.status !== "terminee" && a.status !== "annulee" ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                      onClick={() => {
                        setActivityStatus(a.id, "terminee");
                        toast.success("Marqué fait");
                      }}
                    >
                      Fait
                    </button>
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                      onClick={() => {
                        setActivityStatus(a.id, "annulee");
                        toast.success("Annulé");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : null}
              </CrmCard>
            );
          })}
        </CrmCardGrid>
      )}
      <NewActivityDialog open={open} onOpenChange={setOpen} defaultKind="rdv" />
    </div>
  );
}
