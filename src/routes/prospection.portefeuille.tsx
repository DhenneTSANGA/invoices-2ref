import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  managerName,
  missingServices,
  type Site,
} from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/portefeuille")({
  head: () => ({ meta: [{ title: "Portefeuille — Prospection" }] }),
  component: PortefeuillePage,
});

function PortefeuillePage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const [site, setSite] = useState<"all" | Site>("all");

  const filtered = useMemo(
    () =>
      companies.filter(
        (a) => a.kind === "client" && (site === "all" || a.site === site),
      ),
    [companies, site],
  );

  return (
    <div>
      <PageHeader
        title="Portefeuille"
        subtitle="Matrice client × 5 lignes. Un ❌ = opportunité de vente croisée."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={site === "all"} onClick={() => setSite("all")} label="Toutes implantations" />
        {(Object.keys(SITE_LABELS) as Site[]).map((s) => (
          <Chip key={s} active={site === s} onClick={() => setSite(s)} label={SITE_LABELS[s]} />
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Client</th>
                {SERVICE_LINES.map((l) => (
                  <th key={l} className="px-3 py-3">{SERVICE_LINE_LABELS[l]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const miss = missingServices(a);
                return (
                  <tr key={a.id} className="border-b border-border/40">
                    <td className="px-4 py-3">
                      <Link to="/prospection/clients/$id" params={{ id: a.id }} className="font-semibold hover:text-primary">
                        {a.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {managerName(a.managerId)} · {SITE_LABELS[a.site]}
                        {miss.length ? ` · ${miss.length} à proposer` : ""}
                      </div>
                    </td>
                    {SERVICE_LINES.map((l) => {
                      const bought = a.servicesBought.includes(l);
                      return (
                        <td key={l} className="px-3 py-3">
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", bought ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-800")}>
                            {bought ? "Acheté" : "À proposer"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Potentiel agrégé plans de compte : {currency(filtered.reduce((s, c) => s + (c.plan?.feePotential ?? 0), 0))}
      </p>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-2xl px-3 py-1.5 text-xs font-medium", active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-surface hover:bg-muted")}>
      {label}
    </button>
  );
}
