import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { SITE_LABELS, managerName } from "@/lib/prospection-demo";
import { currency, shortDate } from "@/lib/format";
import { LineBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/clients")({
  head: () => ({ meta: [{ title: "Clients — Prospection" }] }),
  component: CrmClientsPage,
});

function CrmClientsPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const [q, setQ] = useState("");
  const [strategic, setStrategic] = useState(false);

  const list = useMemo(
    () =>
      companies.filter(
        (c) =>
          c.kind === "client" &&
          (!strategic || c.strategic) &&
          (q.trim() === "" || c.name.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [companies, q, strategic],
  );

  return (
    <div>
      <PageHeader title="Clients" subtitle="Portefeuille existant — hors factures." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setStrategic((v) => !v)}
          className={`rounded-2xl px-3 py-1.5 text-sm ${strategic ? "bg-gradient-primary text-primary-foreground" : "border border-border"}`}
        >
          Stratégiques uniquement
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Services</th>
              <th className="px-4 py-3">CA signé</th>
              <th className="px-4 py-3">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const last = activities.filter((a) => a.companyId === c.id).map((a) => a.at).sort().at(-1);
              const open = opportunities.filter((o) => o.companyId === c.id && o.stage !== "perdu" && o.stage !== "gagne").length;
              return (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <Link to="/prospection/clients/$id" params={{ id: c.id }} className="font-semibold hover:text-primary">
                      {c.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {SITE_LABELS[c.site]} {c.strategic ? "· stratégique" : ""} · {open} opp.
                    </div>
                  </td>
                  <td className="px-4 py-3">{managerName(c.managerId)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.servicesBought.map((l) => (
                        <LineBadge key={l} line={l} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{currency(c.caSigned)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{last ? shortDate(last) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
