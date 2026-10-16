import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CrmCard, IconMark } from "@/components/prospection/CrmCards";
import { getCrmTeamTrend } from "@/lib/prospection.functions";
import type { TeamTrendWeek } from "@/lib/crm-team-pulse";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Évolution semaine par semaine de l’équipe (vue direction, cahier des charges §6).
 * Deux graphiques côte à côte — jamais deux échelles sur un même graphique :
 * le CA signé (barres) et l’activité (signatures, offres, RDV en courbes).
 * Couleurs : jetons --chart-1..3 du thème, validés (clair) et ajustés pour le sombre.
 */

const SERIES = [
  { key: "signatures", label: "Signatures", color: "var(--trend-1)" },
  { key: "proposals", label: "Offres", color: "var(--trend-2)" },
  { key: "rdv", label: "RDV", color: "var(--trend-3)" },
] as const;

const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00.000Z`),
  );

const compactFcfa = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`
    : n >= 1000
      ? `${Math.round(n / 1000)} k`
      : String(n);

type Row = TeamTrendWeek & { label: string };

function TrendTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  mode: "revenue" | "activity";
}) {
  if (!active || !payload?.length) return null;
  const w = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold">
        Semaine du {weekLabel(w.weekKey)}
        {w.partial ? " (en cours)" : ""}
      </div>
      {mode === "revenue" ? (
        <div className="mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">CA signé</span>
          <span className="tabular-nums">{currency(w.signedAmount)}</span>
        </div>
      ) : (
        SERIES.map((s) => (
          <div key={s.key} className="mt-1 flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums">{w[s.key]}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function TeamTrend() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["crm-team-trend"],
    queryFn: () => getCrmTeamTrend(),
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  return <TeamTrendView data={data} isPending={isPending} isError={isError} />;
}

/** Affichage seul (données fournies) — séparé de la récupération pour être testable. */
export function TeamTrendView({
  data,
  isPending = false,
  isError = false,
}: {
  data?: TeamTrendWeek[];
  isPending?: boolean;
  isError?: boolean;
}) {
  const rows: Row[] = (data ?? []).map((w) => ({
    ...w,
    label: w.partial ? "En cours" : weekLabel(w.weekKey),
  }));
  const last = rows.length - 1;
  const totalRevenue = rows.reduce((s, w) => s + w.signedAmount, 0);
  const totalSignatures = rows.reduce((s, w) => s + w.signatures, 0);
  const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

  return (
    <CrmCard
      className={cn(
        "mt-4",
        // Catégories : clair = --chart-1..3 ; sombre = mêmes teintes, luminosité 0,62–0,66 (validé).
        "[--trend-1:#2867e4] [--trend-2:#de9300] [--trend-3:#00b481]",
        "dark:[--trend-1:#427ff7] dark:[--trend-2:#c78200] dark:[--trend-3:#00a374]",
      )}
    >
      <div className="flex items-start gap-3">
        <IconMark icon={TrendingUp} tone="bg-primary/15 text-primary" />
        <div>
          <h3 className="font-display text-base font-semibold">Évolution semaine par semaine</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Équipe des managers · 8 dernières semaines
            {data ? ` · ${currency(totalRevenue)} signés · ${totalSignatures} mission(s)` : ""}
          </p>
        </div>
      </div>

      {isPending || isError ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {isError ? "Évolution indisponible pour le moment." : "Chargement de l’évolution…"}
        </p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <figure>
            <figcaption className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              CA signé par semaine
            </figcaption>
            <div className="h-56" role="img" aria-label="CA signé par semaine sur 8 semaines">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={compactFcfa}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={<TrendTooltip mode="revenue" />}
                  />
                  <Bar dataKey="signedAmount" fill="var(--trend-1)" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {rows.map((w) => (
                      <Cell key={w.weekKey} fillOpacity={w.partial ? 0.55 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>

          <figure>
            <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Activité par semaine</span>
              <span className="flex items-center gap-3 normal-case tracking-normal" aria-hidden>
                {SERIES.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </span>
            </figcaption>
            <div className="h-56" role="img" aria-label="Signatures, offres et RDV par semaine sur 8 semaines">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 16, right: 28, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                    content={<TrendTooltip mode="activity" />}
                  />
                  {SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: s.color }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                      isAnimationActive={false}
                    >
                      {/* Étiquette directe sur le dernier point : la couleur n’est jamais seule porteuse. */}
                      <LabelList
                        dataKey={s.key}
                        content={(props: { index?: number; x?: number | string; y?: number | string; value?: unknown }) =>
                          props.index === last ? (
                            <text
                              x={Number(props.x) + 8}
                              y={Number(props.y) + 4}
                              fontSize={11}
                              fill="var(--muted-foreground)"
                            >
                              {String(props.value)}
                            </text>
                          ) : null
                        }
                      />
                    </Line>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        La dernière semaine est en cours (barre atténuée). Survolez une semaine pour le détail.
      </p>
    </CrmCard>
  );
}
