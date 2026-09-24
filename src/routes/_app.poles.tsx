import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { ServiceDashboardView } from "@/components/dashboard/ServiceDashboardView";
import { useClients, useDocumentsList } from "@/hooks/use-data";
import { canAccessDashboard } from "@/lib/roles";
import type { AppSession } from "@/lib/session.functions";
import {
  CLIENT_POLE_HINTS,
  CLIENT_POLE_LABELS,
  CLIENT_POLES,
  isClientPole,
  parseClientPole,
  type ClientPole,
} from "@/lib/client-pole";
import {
  computeMoneyTotals,
  type AmountBasis,
} from "@/lib/dashboard-metrics";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  pole: z
    .enum(["formation", "audit", "juridique", "comptabilite"])
    .optional(),
});

export const Route = createFileRoute("/_app/poles")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Pôles — 2R Hub" },
      {
        name: "description",
        content: "Tableau de bord par pôle : Formation, Audit, Juridique, Comptabilité.",
      },
    ],
  }),
  beforeLoad: ({ context }) => {
    const session = (context as { session?: NonNullable<AppSession> }).session;
    if (session && !canAccessDashboard(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: PolesPage,
});

function BasisToggle({
  value,
  onChange,
}: {
  value: AmountBasis;
  onChange: (v: AmountBasis) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-surface/70 p-1 text-xs font-semibold">
      {(["ttc", "ht"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-xl px-3 py-1.5 transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function PolesPage() {
  const { pole: poleSearch } = Route.useSearch();
  const navigate = useNavigate({ from: "/poles" });
  const selected: ClientPole = isClientPole(poleSearch)
    ? poleSearch
    : "formation";
  const { data: documents = [], isPending: loadingDocs } = useDocumentsList();
  const { data: clients = [], isPending: loadingClients } = useClients();
  const [basis, setBasis] = useState<AmountBasis>("ttc");

  const byPole = useMemo(() => {
    const map = new Map<
      ClientPole,
      { documents: typeof documents; clients: typeof clients }
    >();
    for (const pole of CLIENT_POLES) {
      map.set(pole, { documents: [], clients: [] });
    }
    for (const doc of documents) {
      const pole = parseClientPole(doc.pole);
      map.get(pole)!.documents.push(doc);
    }
    for (const client of clients) {
      const pole = parseClientPole(client.pole);
      map.get(pole)!.clients.push(client);
    }
    return map;
  }, [documents, clients]);

  if (loadingDocs || loadingClients) {
    return (
      <LoadingState
        icon={Layers}
        title="Chargement des pôles"
        description="Agrégation des indicateurs par service…"
      />
    );
  }

  const active = byPole.get(selected)!;

  return (
    <div>
      <PageHeader
        title="Pôles"
        subtitle="Tableau de bord de chaque service, sans modifier la vue d’ensemble du cabinet."
        actions={<BasisToggle value={basis} onChange={setBasis} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CLIENT_POLES.map((pole) => {
          const slice = byPole.get(pole)!;
          const money = computeMoneyTotals(slice.documents, basis);
          const invoicesCount = slice.documents.filter(
            (d) => d.type === "invoice",
          ).length;
          const activePole = selected === pole;
          return (
            <button
              key={pole}
              type="button"
              onClick={() =>
                navigate({ search: { pole }, replace: true })
              }
              className={cn(
                "rounded-3xl border p-4 text-left transition",
                activePole
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border/60 bg-surface/70 hover:bg-muted",
              )}
            >
              <div className="font-display text-sm font-semibold">
                {CLIENT_POLE_LABELS[pole]}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {CLIENT_POLE_HINTS[pole]}
              </p>
              <div className="mt-3 font-numeric text-lg font-bold">
                {currency(money.ca, "XAF")}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {slice.clients.length} client
                {slice.clients.length === 1 ? "" : "s"} · {invoicesCount}{" "}
                facture{invoicesCount === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <ServiceDashboardView
          pole={selected}
          documents={active.documents}
          clients={active.clients}
          basis={basis}
        />
      </div>
    </div>
  );
}
