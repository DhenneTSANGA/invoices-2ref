import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { CalendarClock, Check, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { DossierWorkspace } from "@/components/dossier/DossierWorkspace";
import { MissionStatusBadge } from "@/components/dossier/DossierBadges";
import {
  ClientPoleBadge,
  FilterChip,
  PoleFilterChips,
} from "@/components/clients/ClientPolePicker";
import { useDossierDemoStore } from "@/store/useDossierDemoStore";
import {
  MISSION_STATUS_LABELS,
  type MissionStatus,
} from "@/lib/dossier-demo";
import { memberVisibilityPole } from "@/lib/staff-pole";
import { useSession } from "@/hooks/use-data";
import { shortDate } from "@/lib/format";
import { isMember } from "@/lib/roles";
import type { ClientPole } from "@/lib/client-pole";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/missions")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Missions — 2R Hub" }] }),
  component: MissionsPage,
});

const STATUSES = Object.keys(MISSION_STATUS_LABELS) as MissionStatus[];

function MissionsPage() {
  const { q: qSearch } = Route.useSearch();
  const { data: session } = useSession();
  const missions = useDossierDemoStore((s) => s.missions);
  const setMissionStatus = useDossierDemoStore((s) => s.setMissionStatus);
  const toggleMissionTask = useDossierDemoStore((s) => s.toggleMissionTask);
  const memberPole = memberVisibilityPole(session?.staff);
  const poleLocked = session ? isMember(session.staff.role) : false;

  const [q, setQ] = useState(qSearch ?? "");
  const [poleFilter, setPoleFilter] = useState<"all" | ClientPole>("all");
  const [status, setStatus] = useState<"all" | MissionStatus>("all");

  useEffect(() => {
    if (qSearch != null) setQ(qSearch);
  }, [qSearch]);

  const scoped = useMemo(
    () => missions.filter((m) => !memberPole || m.pole === memberPole),
    [missions, memberPole],
  );

  const filtered = scoped.filter((m) => {
    const hay = `${m.clientName} ${m.title} ${m.owner}`.toLowerCase();
    return (
      (poleFilter === "all" || m.pole === poleFilter) &&
      (status === "all" || m.status === status) &&
      (q.trim() === "" || hay.includes(q.trim().toLowerCase()))
    );
  });

  const active = scoped.filter(
    (m) => m.status === "en_cours" || m.status === "planifiee",
  ).length;

  return (
    <DossierWorkspace>
      <PageHeader
        title="Missions"
        subtitle="Planning des interventions — distinct des factures d’abonnement."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Missions" value={scoped.length} icon={CalendarClock} />
        <StatCard
          label="Actives"
          value={active}
          icon={CalendarClock}
          variant="accent"
        />
        <StatCard
          label="Terminées"
          value={scoped.filter((m) => m.status === "terminee").length}
          icon={CalendarClock}
          variant="success"
        />
      </div>

      <div className="glass-panel mb-4 rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Client, mission, responsable…"
            className="w-full rounded-xl border border-border/60 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {poleLocked ? null : (
        <div className="mb-3">
          <PoleFilterChips value={poleFilter} onChange={setPoleFilter} />
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={status === "all"} onClick={() => setStatus("all")}>
          Tous statuts
        </FilterChip>
        {STATUSES.map((st) => (
          <FilterChip
            key={st}
            active={status === st}
            onClick={() => setStatus(st)}
          >
            {MISSION_STATUS_LABELS[st]}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucune mission"
          description="Le planning de démo n’écrit rien en base."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => {
            const done = m.tasks.filter((t) => t.done).length;
            return (
              <article key={m.id} className="glass-panel rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.clientName} · {m.owner}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ClientPoleBadge pole={m.pole} />
                      <MissionStatusBadge status={m.status} />
                      <span className="text-xs text-muted-foreground">
                        {shortDate(m.startOn)} → {shortDate(m.endOn)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setMissionStatus(m.id, st)}
                        className={cn(
                          "rounded-xl px-2.5 py-1 text-[11px] font-medium",
                          m.status === st
                            ? "bg-gradient-primary text-primary-foreground"
                            : "border border-border bg-surface hover:bg-muted",
                        )}
                      >
                        {MISSION_STATUS_LABELS[st]}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Tâches {done}/{m.tasks.length}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {m.tasks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleMissionTask(m.id, t.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm",
                          t.done
                            ? "text-muted-foreground line-through"
                            : "hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border",
                            t.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border",
                          )}
                        >
                          {t.done ? <Check className="h-3 w-3" /> : null}
                        </span>
                        {t.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </DossierWorkspace>
  );
}
