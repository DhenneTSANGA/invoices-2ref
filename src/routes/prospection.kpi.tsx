import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Target, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { CRM_PRIMARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import {
  MANAGERS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  computeKpis,
  type ServiceLine,
} from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/kpi")({
  head: () => ({ meta: [{ title: "KPI — Prospection" }] }),
  component: KpiPage,
});

function KpiPage() {
  const data = useProspectionDemoStore((s) => s);
  const [managerId, setManagerId] = useState<"all" | string>("all");
  const [line, setLine] = useState<"all" | ServiceLine>("all");

  const filtered = useMemo(() => {
    const opportunities = data.opportunities.filter(
      (o) =>
        (managerId === "all" || o.ownerId === managerId) && (line === "all" || o.line === line),
    );
    const activities = data.activities.filter(
      (a) => managerId === "all" || a.ownerId === managerId,
    );
    const expenses = data.expenses.filter(
      (e) => managerId === "all" || e.managerId === managerId,
    );
    return { ...data, opportunities, activities, expenses };
  }, [data, managerId, line]);

  const k = computeKpis(filtered);

  function exportCsv() {
    const rows = [
      ["indicateur", "valeur"],
      ["appels", String(k.calls)],
      ["emails", String(k.emails)],
      ["visites", String(k.visits)],
      ["rdv", String(k.rdvDone)],
      ["pipeline", String(k.pipeline)],
      ["pondere", String(Math.round(k.weighted))],
      ["ca_signe", String(k.signedCa)],
      ["cout_rdv", String(Math.round(k.costPerRdv))],
      ["cac", String(Math.round(k.cac))],
      ["roi_pct", String(Math.round(k.roi))],
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi-prospection.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  return (
    <div>
      <PageHeader
        title="Rapports & KPI"
        subtitle="Piloter, pas opérer. Chiffres calculés depuis la démo."
        actions={
          <button type="button" onClick={exportCsv} className={CRM_PRIMARY_BTN}>
            Exporter CSV
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={managerId === "all"} onClick={() => setManagerId("all")}>
          Tous les managers
        </FilterChip>
        {MANAGERS.map((m) => (
          <FilterChip key={m.id} active={managerId === m.id} onClick={() => setManagerId(m.id)}>
            {m.name}
          </FilterChip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={line === "all"} onClick={() => setLine("all")}>
          Toutes les lignes
        </FilterChip>
        {SERVICE_LINES.map((l) => (
          <FilterChip key={l} active={line === l} onClick={() => setLine(l)}>
            {SERVICE_LINE_LABELS[l]}
          </FilterChip>
        ))}
      </div>
      <h3 className="mb-3 font-display font-semibold">Effort</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/activites">
          <StatCard label="Appels" value={k.calls} icon={BarChart3} />
        </Link>
        <Link to="/prospection/activites">
          <StatCard label="E-mails" value={k.emails} icon={BarChart3} />
        </Link>
        <Link to="/prospection/activites">
          <StatCard label="Visites" value={k.visits} icon={BarChart3} />
        </Link>
        <Link to="/prospection/agenda">
          <StatCard label="RDV réalisés" value={k.rdvDone} icon={Target} />
        </Link>
      </div>
      <h3 className="mb-3 font-display font-semibold">Résultats</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/opportunites">
          <StatCard label="Pipeline" value={k.pipeline} icon={Target} format={currency} />
        </Link>
        <Link to="/prospection/opportunites">
          <StatCard label="Pondéré" value={k.weighted} icon={Target} variant="accent" format={currency} />
        </Link>
        <StatCard label="CA signé" value={k.signedCa} icon={Target} variant="success" format={currency} />
        <StatCard label="Signatures" value={k.signatures} icon={Target} />
      </div>
      <h3 className="mb-3 font-display font-semibold">Rentabilité</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Coût / RDV" value={k.costPerRdv} icon={Wallet} format={currency} />
        <StatCard label="CAC" value={k.cac} icon={Wallet} format={currency} />
        <StatCard label="ROI %" value={Math.round(k.roi)} icon={Wallet} suffix=" %" />
        <Link to="/prospection/budget">
          <StatCard label="Dépenses" value={k.spent} icon={Wallet} format={currency} />
        </Link>
      </div>
      <h3 className="mb-3 font-display font-semibold">Portefeuille & repositionnement</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CA additionnel" value={k.extraSignedCa} icon={Target} format={currency} />
        <StatCard label="Lignes / client" value={Math.round(k.avgLines * 10) / 10} icon={BarChart3} />
        <StatCard
          label="Conseil dans pipeline %"
          value={Math.round(k.counselPipeShare * 100)}
          icon={Target}
          suffix=" %"
        />
        <Link to="/prospection/pistes">
          <StatCard label="Pistes converties" value={k.leadsConverted} icon={BarChart3} />
        </Link>
      </div>
    </div>
  );
}
