import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { NewActivityDialog } from "@/components/prospection/CrmForms";
import { ActivityStatusBadge } from "@/components/prospection/ProspectionBadges";
import { CrmCard, CrmCardGrid, KindMark } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, CrmSearchEmpty, CrmSearchField, FilterChip, matchesSearch } from "@/components/prospection/CrmUi";
import {
  ACTIVITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  managerName,
  type ActivityKind,
} from "@/lib/prospection-demo";
import { shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/activites")({
  head: () => ({ meta: [{ title: "Activités — Prospection" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const activities = useProspectionDemoStore((s) => s.activities);
  const setActivityStatus = useProspectionDemoStore((s) => s.setActivityStatus);
  const [open, setOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | ActivityKind>("all");
  const [query, setQuery] = useState("");
  const [crFor, setCrFor] = useState<string | undefined>();

  const list = useMemo(() => {
    const filtered = [...activities]
      .sort((a, b) => b.at.localeCompare(a.at) || (b.time ?? "").localeCompare(a.time ?? ""))
      .filter((a) => {
        if (kindFilter !== "all" && a.kind !== kindFilter) return false;
        const co = companies.find((c) => c.id === a.companyId);
        return matchesSearch(
          query,
          co?.name,
          a.title,
          a.summary,
          a.nextAction,
          ACTIVITY_LABELS[a.kind],
          ACTIVITY_STATUS_LABELS[a.status],
          managerName(a.ownerId),
        );
      });
    return query.trim() ? filtered : filtered.slice(0, 60);
  }, [activities, companies, kindFilter, query]);

  return (
    <div>
      <PageHeader
        title="Activités"
        subtitle="Appels, e-mails, visites, RDV, relances — noter ce qui s’est passé + compte rendu."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouvelle activité
          </button>
        }
      />
      <CrmSearchField
        value={query}
        onChange={setQuery}
        label="Rechercher une activité"
        placeholder="Rechercher une entreprise, un objet, un manager…"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
          Toutes
        </FilterChip>
        {(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => (
          <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
            {ACTIVITY_LABELS[k]}
          </FilterChip>
        ))}
      </div>

      {list.length === 0 ? (
        <CrmSearchEmpty
          title="Aucune activité"
          description="Aucune activité ne correspond à cette recherche."
          onClear={query ? () => setQuery("") : undefined}
        />
      ) : (
      <CrmCardGrid dense>
        {list.map((a, i) => {
          const co = companies.find((c) => c.id === a.companyId);
          const needsCr = a.kind === "rdv" && a.status !== "terminee" && a.status !== "annulee";
          return (
            <CrmCard key={a.id} index={i} className="h-full">
              <div className="flex items-start gap-3">
                <KindMark kind={a.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {ACTIVITY_LABELS[a.kind]}
                      </p>
                      <h2 className="mt-0.5 font-display text-base font-semibold leading-tight">
                        {co?.name ?? "Entreprise"}
                      </h2>
                    </div>
                    <ActivityStatusBadge status={a.status} />
                  </div>
                  <p className="mt-2 text-sm font-medium">{a.title}</p>
                  {a.summary ? <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {managerName(a.ownerId)} · {shortDate(a.at)}
                    {a.time ? ` · ${a.time}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {needsCr ? (
                  <button
                    type="button"
                    className={CRM_PRIMARY_BTN + " !px-3 !py-1.5 !text-xs"}
                    onClick={() => setCrFor(a.id)}
                  >
                    Ajouter le CR
                  </button>
                ) : null}
                {a.status !== "terminee" && a.status !== "annulee" ? (
                  <button
                    type="button"
                    className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                    onClick={() => {
                      setActivityStatus(a.id, "terminee");
                      toast.success("Marquée terminée");
                    }}
                  >
                    Terminée
                  </button>
                ) : null}
                {a.status !== "annulee" ? (
                  <button
                    type="button"
                    className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                    onClick={() => {
                      setActivityStatus(a.id, "annulee");
                      toast.success("Annulée");
                    }}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </CrmCard>
          );
        })}
      </CrmCardGrid>
      )}

      <NewActivityDialog open={open} onOpenChange={setOpen} />
      <NewActivityDialog
        open={Boolean(crFor)}
        onOpenChange={(v) => {
          if (!v) setCrFor(undefined);
        }}
        completeActivityId={crFor}
      />
    </div>
  );
}
