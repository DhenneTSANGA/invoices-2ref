import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { BarChart3, Target, Wallet } from "lucide-react";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { computeKpis } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/prospection/kpi")({
  head: () => ({ meta: [{ title: "KPI — Prospection" }] }),
  component: KpiPage,
});

function KpiPage() {
  const data = useProspectionDemoStore((s) => s);
  const k = computeKpis(data);

  return (
    <div>
      <PageHeader title="Rapports & KPI" subtitle="Tous les chiffres sont calculés depuis le store démo, pas saisis en dur." />
      <h3 className="mb-3 font-display font-semibold">Effort</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appels" value={k.calls} icon={BarChart3} />
        <StatCard label="E-mails" value={k.emails} icon={BarChart3} />
        <StatCard label="Visites" value={k.visits} icon={BarChart3} />
        <StatCard label="RDV réalisés" value={k.rdvDone} icon={Target} />
      </div>
      <h3 className="mb-3 font-display font-semibold">Résultats</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pipeline" value={k.pipeline} icon={Target} format={currency} />
        <StatCard label="Pondéré" value={k.weighted} icon={Target} variant="accent" format={currency} />
        <StatCard label="CA signé" value={k.signedCa} icon={Target} variant="success" format={currency} />
        <StatCard label="Signatures" value={k.signatures} icon={Target} />
      </div>
      <h3 className="mb-3 font-display font-semibold">Rentabilité</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Coût / RDV" value={k.costPerRdv} icon={Wallet} format={currency} />
        <StatCard label="CAC" value={k.cac} icon={Wallet} format={currency} />
        <StatCard label="ROI %" value={Math.round(k.roi)} icon={Wallet} suffix=" %" />
        <StatCard label="Dépenses" value={k.spent} icon={Wallet} format={currency} />
      </div>
      <h3 className="mb-3 font-display font-semibold">Portefeuille & repositionnement</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CA additionnel" value={k.extraSignedCa} icon={Target} format={currency} />
        <StatCard label="Lignes / client" value={Math.round(k.avgLines * 10) / 10} icon={BarChart3} />
        <StatCard label="Conseil dans pipeline %" value={Math.round(k.counselPipeShare * 100)} icon={Target} suffix=" %" />
        <StatCard label="Pistes converties" value={k.leadsConverted} icon={BarChart3} />
      </div>
    </div>
  );
}
