import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { ACTIVITY_LABELS } from "@/lib/prospection-demo";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/prospection/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Prospection" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const activities = useProspectionDemoStore((s) => s.activities);
  const [view, setView] = useState<"jour" | "semaine" | "mois">("semaine");

  const dated = useMemo(
    () =>
      [...activities]
        .filter((a) => a.kind === "rdv" || a.kind === "visite" || a.kind === "evenement" || a.status === "planifiee" || a.status === "a_faire")
        .sort((a, b) => a.at.localeCompare(b.at)),
    [activities],
  );

  const today = new Date().toISOString().slice(0, 10);
  const filtered = dated.filter((a) => {
    if (view === "jour") return a.at === today;
    if (view === "semaine") {
      const t = new Date(today).getTime();
      const d = new Date(a.at).getTime();
      return Math.abs(d - t) < 8 * 86400000;
    }
    return a.at.slice(0, 7) === today.slice(0, 7);
  });

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Jour, semaine, mois — RDV, visites, relances, événements." />
      <div className="mb-4 flex gap-2">
        {(["jour", "semaine", "mois"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-2xl px-3 py-1.5 text-sm capitalize ${view === v ? "bg-gradient-primary text-primary-foreground" : "border border-border"}`}
          >
            {v}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <li className="text-sm text-muted-foreground">Rien sur cette période.</li>
        ) : (
          filtered.map((a) => {
            const co = companies.find((c) => c.id === a.companyId);
            return (
              <li key={a.id} className="glass-panel rounded-2xl px-4 py-3 text-sm">
                <div className="font-medium">{shortDate(a.at)} {a.time ?? ""} · {ACTIVITY_LABELS[a.kind]}</div>
                <div className="text-muted-foreground">{co?.name} — {a.title}</div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
