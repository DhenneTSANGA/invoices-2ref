import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { NewActivityDialog } from "@/components/prospection/CrmForms";
import { ActivityStatusBadge } from "@/components/prospection/ProspectionBadges";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, FilterChip, matchesSearch } from "@/components/prospection/CrmUi";
import { ACTIVITY_LABELS, managerName, type Activity } from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Prospection" }] }),
  component: AgendaPage,
});

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function buildMonthCells(cursor: Date) {
  const first = startOfMonth(cursor);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

function AgendaPage() {
  const { companies } = useProspectionCompanies();
  const activities = useProspectionDemoStore((s) => s.activities);
  const setActivityStatus = useProspectionDemoStore((s) => s.setActivityStatus);
  const deleteActivity = useProspectionDemoStore((s) => s.deleteActivity);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => isoDay(new Date()));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const dated = useMemo(
    () =>
      [...activities]
        .filter(
          (a) =>
            a.kind === "rdv" ||
            a.kind === "visite" ||
            a.kind === "evenement" ||
            a.kind === "appel" ||
            a.kind === "email" ||
            a.status === "planifiee" ||
            a.status === "a_faire",
        )
        .sort((a, b) => `${a.at}${a.time ?? ""}`.localeCompare(`${b.at}${b.time ?? ""}`)),
    [activities],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of dated) {
      const co = companies.find((c) => c.id === a.companyId);
      if (
        !matchesSearch(
          query,
          co?.name,
          a.title,
          a.summary,
          a.time,
          ACTIVITY_LABELS[a.kind],
          managerName(a.ownerId),
        )
      ) {
        continue;
      }
      const list = map.get(a.at) ?? [];
      list.push(a);
      map.set(a.at, list);
    }
    return map;
  }, [dated, companies, query]);

  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const selectedEvents = byDay.get(selected) ?? [];
  const today = isoDay(new Date());

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Calendrier mensuel — RDV, visites, événements et tâches planifiées."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Nouveau RDV
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={CRM_SECONDARY_BTN + " !px-2.5 !py-2"}
            onClick={() => setCursor((c) => addMonths(c, -1))}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[10rem] text-center font-display text-lg font-semibold capitalize">
            {monthLabel(cursor)}
          </h2>
          <button
            type="button"
            className={CRM_SECONDARY_BTN + " !px-2.5 !py-2"}
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <FilterChip
            active={false}
            onClick={() => {
              const now = new Date();
              setCursor(startOfMonth(now));
              setSelected(isoDay(now));
            }}
          >
            Aujourd’hui
          </FilterChip>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer le calendrier…"
          className="w-full rounded-xl border border-border/60 bg-surface/70 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="grid grid-cols-7 border-b border-border/50 bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const key = isoDay(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const events = byDay.get(key) ?? [];
            const isSelected = key === selected;
            const isToday = key === today;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  "min-h-[5.5rem] border-b border-r border-border/40 p-1.5 text-left transition hover:bg-muted/50 sm:min-h-[6.5rem]",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  isSelected && "bg-primary/8 ring-2 ring-inset ring-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {events.length > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums">
                      {events.length}
                    </span>
                  ) : null}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {events.slice(0, 3).map((a) => (
                    <li
                      key={a.id}
                      className="truncate rounded-md bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                      title={a.title}
                    >
                      {(a.time ? `${a.time} ` : "") + a.title}
                    </li>
                  ))}
                  {events.length > 3 ? (
                    <li className="text-[10px] text-muted-foreground">+{events.length - 3}</li>
                  ) : null}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-5">
        <h3 className="mb-3 font-display font-semibold">
          {new Date(`${selected}T12:00:00`).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement ce jour.</p>
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((a) => {
              const co = companies.find((c) => c.id === a.companyId);
              return (
                <li
                  key={a.id}
                  className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {a.time ?? "Toute la journée"} · {ACTIVITY_LABELS[a.kind]}
                      </p>
                      <ActivityStatusBadge status={a.status} />
                    </div>
                    <h4 className="mt-1 font-display text-base font-semibold">
                      {co?.name ?? "Entreprise"}
                    </h4>
                    <p className="mt-1 text-sm">{a.title}</p>
                    {a.summary ? (
                      <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">{managerName(a.ownerId)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {a.status !== "terminee" && a.status !== "annulee" ? (
                      <>
                        <button
                          type="button"
                          className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                          onClick={() => {
                            void setActivityStatus(a.id, "terminee").then(
                              () => toast.success("Marqué fait"),
                              (err) =>
                                toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
                            );
                          }}
                        >
                          Fait
                        </button>
                        <button
                          type="button"
                          className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                          onClick={() => {
                            void setActivityStatus(a.id, "annulee").then(
                              () => toast.success("Annulé"),
                              (err) =>
                                toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
                            );
                          }}
                        >
                          Annuler
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs"}
                      onClick={() => setEditing(a)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className={CRM_SECONDARY_BTN + " !px-3 !py-1.5 !text-xs text-danger"}
                      onClick={() => {
                        if (!confirm("Supprimer cette activité ?")) return;
                        void deleteActivity(a.id).then(
                          () => toast.success("Activité supprimée"),
                          (err) =>
                            toast.error(err instanceof Error ? err.message : "Suppression impossible"),
                        );
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NewActivityDialog open={open} onOpenChange={setOpen} defaultKind="rdv" />
      <NewActivityDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
