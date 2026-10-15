import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileDown, FileSpreadsheet, Target, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import {
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  computeKpis,
  portfolioManagers,
  type KpiPeriod,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-model";
import { currency } from "@/lib/format";
import { addDaysIso, crmTodayIso, currentCrmMonth, shiftCrmMonth } from "@/lib/crm-month";
import { downloadTablePdf, downloadXlsx } from "@/lib/crm-export";
import { useProspectionStore } from "@/store/useProspectionStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/kpi")({
  head: () => ({ meta: [{ title: "KPI — Prospection" }] }),
  component: KpiPage,
});

type PeriodKey = "month" | "last_month" | "8_weeks" | "all";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  month: "Ce mois",
  last_month: "Mois dernier",
  "8_weeks": "8 dernières semaines",
  all: "Depuis le début",
};

function periodRange(key: PeriodKey): KpiPeriod {
  const today = crmTodayIso();
  if (key === "month") return { from: `${currentCrmMonth()}-01`, to: today };
  if (key === "last_month") {
    const m = shiftCrmMonth(currentCrmMonth(), -1);
    return { from: `${m}-01`, to: addDaysIso(`${currentCrmMonth()}-01`, -1) };
  }
  if (key === "8_weeks") return { from: addDaysIso(today, -55), to: today };
  return {};
}

const pct = (n: number) => `${Math.round(n * 100)} %`;
const times = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ×`;

function KpiPage() {
  const data = useProspectionStore((s) => s);
  const managers = portfolioManagers(data.managers);
  const { companies } = useProspectionCompanies();
  const [managerId, setManagerId] = useState<"all" | string>("all");
  const [line, setLine] = useState<"all" | ServiceLine>("all");
  const [site, setSite] = useState<"all" | Site>("all");
  const [periodKey, setPeriodKey] = useState<PeriodKey>("month");
  const period = periodRange(periodKey);

  const filtered = useMemo(() => {
    const siteCompanies = companies.filter((c) => site === "all" || c.site === site);
    const siteIds = new Set(siteCompanies.map((c) => c.id));
    const inSite = (companyId?: string) => site === "all" || (companyId ? siteIds.has(companyId) : false);
    const opportunities = data.opportunities.filter(
      (o) =>
        (managerId === "all" || o.ownerId === managerId) &&
        (line === "all" || o.line === line) &&
        inSite(o.companyId),
    );
    const activities = data.activities.filter(
      (a) => (managerId === "all" || a.ownerId === managerId) && inSite(a.companyId),
    );
    const expenses = data.expenses.filter(
      (e) => (managerId === "all" || e.managerId === managerId) && (site === "all" || inSite(e.companyId)),
    );
    return { ...data, companies: siteCompanies, opportunities, activities, expenses };
  }, [data, companies, managerId, line, site]);

  const k = computeKpis(filtered, period);

  const rows: [string, string, string][] = [
    ["Effort", "Appels", String(k.calls)],
    ["Effort", "E-mails", String(k.emails)],
    ["Effort", "Visites", String(k.visits)],
    ["Effort", "Événements", String(k.events)],
    ["Effort", "Prospects qualifiés", String(k.qualified)],
    ["Résultat", "Premiers contacts (entreprises)", String(k.contacts)],
    ["Résultat", "RDV réalisés", String(k.rdvDone)],
    ["Résultat", "Propositions envoyées", `${k.proposals} · ${currency(k.proposalsAmount)}`],
    ["Résultat", "Missions signées", `${k.signatures} · ${currency(k.signedCa)}`],
    ["Résultat", "Taux RDV / contacts", pct(k.rdvPerContact)],
    ["Résultat", "Taux propositions / RDV", pct(k.proposalPerRdv)],
    ["Résultat", "Taux signatures / propositions", pct(k.signaturePerProposal)],
    ["Résultat", "Pipeline pondéré (en cours)", currency(k.weighted)],
    ["Portefeuille", "Taux de revue du portefeuille", pct(k.reviewRate)],
    ["Portefeuille", "CA additionnel signé", currency(k.extraSignedCa)],
    ["Portefeuille", "Lignes de service par client", (Math.round(k.avgLines * 10) / 10).toString()],
    ["Portefeuille", "Pistes remontées / converties", `${k.leads} / ${k.leadsConverted}`],
    ["Repositionnement", "Part du conseil dans le pipeline", pct(k.counselPipeShare)],
    ["Repositionnement", "Part du conseil dans les signatures", pct(k.counselSignShare)],
    ["Repositionnement", "Ventes croisées (clients formation proposés / signés)", `${k.crossSellProposals} / ${k.crossSellWon}`],
    ["Rentabilité", "Dépenses", currency(k.spent)],
    ["Rentabilité", "Coût par RDV", currency(k.costPerRdv)],
    ["Rentabilité", "Coût d’acquisition client", currency(k.cac)],
    ["Rentabilité", "Retour sur investissement (honoraires / dépenses)", times(k.roi)],
  ];

  const scope = [
    PERIOD_LABELS[periodKey],
    managerId === "all" ? "tous les managers" : (managers.find((m) => m.id === managerId)?.name ?? ""),
    line === "all" ? "toutes les lignes" : SERVICE_LINE_LABELS[line],
    site === "all" ? "toutes implantations" : SITE_LABELS[site],
  ].join(" · ");

  const exportXlsx = () =>
    downloadXlsx("kpi-prospection.xlsx", [
      {
        name: "KPI",
        columns: [
          { header: "Famille", key: "family", width: 18 },
          { header: "Indicateur", key: "label", width: 52 },
          { header: "Valeur", key: "value", width: 28 },
        ],
        rows: rows.map(([family, label, value]) => ({ family, label, value })),
      },
    ])
      .then(() => toast.success("Export Excel téléchargé"))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Export impossible"));

  const exportPdf = () =>
    downloadTablePdf(
      "kpi-prospection.pdf",
      "Rapports & KPI — Prospection",
      scope,
      ["Famille", "Indicateur", "Valeur"],
      rows,
    )
      .then(() => toast.success("Export PDF téléchargé"))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Export impossible"));

  return (
    <div>
      <PageHeader
        title="Rapports & KPI"
        subtitle={`Indicateurs du cahier des charges — ${scope}`}
        actions={
          <>
            <button type="button" onClick={exportXlsx} className={CRM_PRIMARY_BTN}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button type="button" onClick={exportPdf} className={CRM_SECONDARY_BTN}>
              <FileDown className="h-4 w-4" />
              PDF
            </button>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
          <FilterChip key={p} active={periodKey === p} onClick={() => setPeriodKey(p)}>
            {PERIOD_LABELS[p]}
          </FilterChip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip active={managerId === "all"} onClick={() => setManagerId("all")}>
          Tous les managers
        </FilterChip>
        {managers.map((m) => (
          <FilterChip key={m.id} active={managerId === m.id} onClick={() => setManagerId(m.id)}>
            {m.name}
          </FilterChip>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip active={line === "all"} onClick={() => setLine("all")}>
          Toutes les lignes
        </FilterChip>
        {SERVICE_LINES.map((l) => (
          <FilterChip key={l} active={line === l} onClick={() => setLine(l)}>
            {SERVICE_LINE_LABELS[l]}
          </FilterChip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={site === "all"} onClick={() => setSite("all")}>
          Toutes implantations
        </FilterChip>
        {(Object.keys(SITE_LABELS) as Site[]).map((s) => (
          <FilterChip key={s} active={site === s} onClick={() => setSite(s)}>
            {SITE_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      <h3 className="mb-3 font-display font-semibold">Effort</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/activites">
          <StatCard label="Appels · e-mails · visites" value={k.calls + k.emails + k.visits} icon={BarChart3} hint={`${k.calls} appels · ${k.emails} e-mails · ${k.visits} visites`} />
        </Link>
        <Link to="/prospection/opportunites">
          <StatCard label="Prospects qualifiés" value={k.qualified} icon={Target} />
        </Link>
        <StatCard label="Premiers contacts" value={k.contacts} icon={BarChart3} hint="Entreprises contactées" />
        <Link to="/prospection/agenda">
          <StatCard label="RDV réalisés" value={k.rdvDone} icon={Target} />
        </Link>
      </div>

      <h3 className="mb-3 font-display font-semibold">Résultats</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Propositions envoyées" value={k.proposals} icon={Target} hint={currency(k.proposalsAmount)} />
        <StatCard label="CA signé" value={k.signedCa} icon={Target} variant="success" format={currency} hint={`${k.signatures} mission(s)`} />
        <Link to="/prospection/opportunites">
          <StatCard label="Pipeline pondéré" value={k.weighted} icon={Target} variant="accent" format={currency} hint={`${currency(k.pipeline)} brut (en cours)`} />
        </Link>
        <StatCard
          label="Transformation"
          value={Math.round(k.signaturePerProposal * 100)}
          suffix=" %"
          icon={Target}
          hint={`RDV/contacts ${pct(k.rdvPerContact)} · propositions/RDV ${pct(k.proposalPerRdv)} · signatures/propositions`}
        />
      </div>

      <h3 className="mb-3 font-display font-semibold">Rentabilité</h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/budget">
          <StatCard label="Dépenses" value={k.spent} icon={Wallet} format={currency} />
        </Link>
        <StatCard label="Coût / RDV" value={k.costPerRdv} icon={Wallet} format={currency} />
        <StatCard label="Coût d’acquisition" value={k.cac} icon={Wallet} format={currency} hint="Dépenses / missions signées" />
        <StatCard label="Retour sur investissement" value={k.roi} icon={Wallet} format={times} hint="Honoraires signés / dépenses" />
      </div>

      <h3 className="mb-3 font-display font-semibold">Portefeuille & repositionnement</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/prospection/portefeuille">
          <StatCard label="Revue du portefeuille" value={Math.round(k.reviewRate * 100)} suffix=" %" icon={BarChart3} hint={`${Math.round(k.avgLines * 10) / 10} ligne(s) par client`} />
        </Link>
        <StatCard label="CA additionnel" value={k.extraSignedCa} icon={Target} format={currency} hint="Clients existants" />
        <StatCard
          label="Conseil dans le pipeline"
          value={Math.round(k.counselPipeShare * 100)}
          icon={Target}
          suffix=" %"
          hint={`${pct(k.counselSignShare)} des signatures`}
        />
        <StatCard
          label="Ventes croisées"
          value={k.crossSellProposals}
          icon={BarChart3}
          hint={`Clients formation avec proposition conseil · ${k.crossSellWon} signée(s)`}
        />
      </div>
    </div>
  );
}
