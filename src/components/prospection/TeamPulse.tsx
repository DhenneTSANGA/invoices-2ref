import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CrmCard, EntityMark, IconMark } from "@/components/prospection/CrmCards";
import { getCrmTeamPulse } from "@/lib/prospection.functions";
import type {
  TeamPulseCounts,
  TeamPulseManager,
  TeamPulsePeriod,
  TeamPulseTargets,
} from "@/lib/crm-team-pulse";
import { currency, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Émulation entre managers : classement (gauche) et progression vers les
 * objectifs (droite), sur la semaine ou le mois en cours. Compteurs et CA signé
 * de chacun, avec sa part du total de l’équipe — jamais les clients ni le détail
 * des affaires.
 */

type Metric = keyof TeamPulseTargets;

const METRICS: { key: Metric; label: string; short: string }[] = [
  { key: "signatures", label: "Missions signées", short: "Signatures" },
  { key: "proposals", label: "Offres envoyées", short: "Offres" },
  { key: "rdv", label: "RDV réalisés", short: "RDV" },
  { key: "contacts", label: "Premiers contacts", short: "Contacts" },
  { key: "qualified", label: "Prospects qualifiés", short: "Prospects" },
];

const PERIOD_COPY: Record<TeamPulsePeriod, { tab: string; of: string; previous: string }> = {
  week: { tab: "Cette semaine", of: "de la semaine", previous: "la semaine dernière à la même heure" },
  month: { tab: "Ce mois", of: "du mois", previous: "le mois dernier à la même date" },
};

const PERIOD_KEY = "crm-team-pulse-period";

/** Taux d’atteinte d’un indicateur (en %, non plafonné). */
function attainment(done: number, target: number) {
  return target > 0 ? Math.round((done / target) * 100) : 0;
}

/** Score de la période : moyenne des taux d’atteinte, chaque indicateur plafonné à 100 %. */
function periodScore(counts: TeamPulseCounts, targets: TeamPulseTargets) {
  const rated = METRICS.filter((m) => targets[m.key] > 0);
  if (rated.length === 0) return 0;
  const sum = rated.reduce(
    (s, m) => s + Math.min(100, attainment(counts[m.key], targets[m.key])),
    0,
  );
  return Math.round(sum / rated.length);
}

/** Part d’un manager dans le total de l’équipe (en %). */
function share(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function Delta({ value, unit = "", className }: { value: number; unit?: string; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        value > 0
          ? "text-emerald-700 dark:text-emerald-300"
          : value < 0
            ? "text-danger"
            : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {value > 0 ? "+" : ""}
      {fmt(value)}
      {unit}
    </span>
  );
}

function sinceLabel(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l’instant";
  return `il y a ${Math.round(s / 60)} min`;
}

function sumCounts(list: TeamPulseCounts[]): TeamPulseCounts {
  return list.reduce(
    (t, c) => ({
      qualified: t.qualified + c.qualified,
      contacts: t.contacts + c.contacts,
      rdv: t.rdv + c.rdv,
      proposals: t.proposals + c.proposals,
      signatures: t.signatures + c.signatures,
      actions: t.actions + c.actions,
      signedAmount: t.signedAmount + c.signedAmount,
    }),
    { qualified: 0, contacts: 0, rdv: 0, proposals: 0, signatures: 0, actions: 0, signedAmount: 0 },
  );
}

function sumTargets(list: TeamPulseTargets[]): TeamPulseTargets {
  const round = (n: number) => Math.round(n * 10) / 10;
  const t = list.reduce(
    (acc, c) => ({
      qualified: acc.qualified + c.qualified,
      contacts: acc.contacts + c.contacts,
      rdv: acc.rdv + c.rdv,
      proposals: acc.proposals + c.proposals,
      signatures: acc.signatures + c.signatures,
    }),
    { qualified: 0, contacts: 0, rdv: 0, proposals: 0, signatures: 0 },
  );
  return {
    qualified: round(t.qualified),
    contacts: round(t.contacts),
    rdv: round(t.rdv),
    proposals: round(t.proposals),
    signatures: round(t.signatures),
  };
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-xl border border-border/60 bg-surface/70 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-xs font-semibold transition",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TeamPulse({ refreshKey }: { refreshKey: string }) {
  const [period, setPeriod] = useState<TeamPulsePeriod>(() => {
    try {
      return localStorage.getItem(PERIOD_KEY) === "month" ? "month" : "week";
    } catch {
      return "week";
    }
  });
  const { data, isPending, isError } = useQuery({
    queryKey: ["crm-team-pulse", period, refreshKey],
    queryFn: () => getCrmTeamPulse({ data: { period } }),
    // « Temps réel » : rafraîchi chaque minute, au retour sur l’onglet et après chaque saisie.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const changePeriod = (p: TeamPulsePeriod) => {
    setPeriod(p);
    try {
      localStorage.setItem(PERIOD_KEY, p);
    } catch {
      /* préférence non mémorisée */
    }
  };

  const toolbar = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Émulation de l’équipe
      </h2>
      <Segmented
        label="Période"
        value={period}
        onChange={changePeriod}
        options={[
          { value: "week", label: PERIOD_COPY.week.tab },
          { value: "month", label: PERIOD_COPY.month.tab },
        ]}
      />
    </div>
  );

  if (isPending || isError || !data) {
    return (
      <section className="mb-5">
        {toolbar}
        <CrmCard>
          <p className="text-sm text-muted-foreground">
            {isError
              ? "Statistiques d’équipe indisponibles pour le moment."
              : "Chargement de l’activité de l’équipe…"}
          </p>
        </CrmCard>
      </section>
    );
  }

  const copy = PERIOD_COPY[data.period];
  const team = sumCounts(data.managers.map((m) => m.current));
  const ranked = data.managers
    .map((m) => ({
      ...m,
      score: periodScore(m.current, m.targets),
      previousScore: periodScore(m.previous, m.targets),
      revenueShare: share(m.current.signedAmount, team.signedAmount),
    }))
    // Classement : atteinte des objectifs, puis CA signé, puis volume d’actions.
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.current.signedAmount - a.current.signedAmount ||
        b.current.actions - a.current.actions,
    );
  const self = ranked.find((m) => m.id === data.selfId) ?? null;
  const updated = sinceLabel(data.generatedAt, now);
  const teamScore = periodScore(team, sumTargets(data.managers.map((m) => m.targets)));

  return (
    <section className="mb-5">
      {toolbar}
      <div className="grid gap-4 lg:grid-cols-5">
        <CrmCard className="h-full lg:col-span-3">
          <div className="flex items-start gap-3">
            <div className="flex items-start gap-3">
              <IconMark icon={Users} tone="bg-primary/15 text-primary" />
              <div>
                <h3 className="font-display text-base font-semibold">Activité de l’équipe</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.period === "week" ? "Semaine du" : "Depuis le"} {shortDate(data.periodStart)} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    en direct, {updated}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-muted/45 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              CA signé par l’équipe {copy.of}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-sans text-2xl font-semibold">{currency(team.signedAmount)}</span>
              <span className="text-xs text-muted-foreground">
                {team.signatures} mission(s) · {team.proposals} offre(s) · {team.rdv} RDV
              </span>
            </div>
          </div>

          {ranked.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
              Aucun manager désigné pour l’instant.
            </p>
          ) : (
            <div className="-mx-1 mt-3 overflow-x-auto px-1">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">
                  Chiffre d’affaires signé, activité et atteinte des objectifs de chaque manager
                </caption>
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-2 text-left font-semibold">#</th>
                    <th className="pb-2 pr-2 text-left font-semibold">Manager</th>
                    <th className="px-2 pb-2 text-left font-semibold">CA signé · part</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="px-1.5 pb-2 text-right font-semibold">
                        {m.short}
                      </th>
                    ))}
                    <th className="px-1.5 pb-2 text-right font-semibold">Actions</th>
                    <th className="pb-2 pl-2 text-left font-semibold">Objectifs</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((m, i) => {
                    const isSelf = m.id === data.selfId;
                    return (
                      <tr
                        key={m.id}
                        className={cn("border-t border-border/50", isSelf && "bg-primary/[0.06]")}
                      >
                        <td className="py-2.5 pr-2 align-middle">
                          {i === 0 && (m.score > 0 || m.current.signedAmount > 0) ? (
                            <Trophy className="h-4 w-4 text-amber-500" aria-label="1er" />
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <EntityMark name={m.name} size="sm" />
                            <span className="max-w-[8rem] truncate font-medium" title={m.name}>
                              {m.name}
                            </span>
                            {isSelf ? (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                Vous
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className="px-2 py-2.5"
                          title={`${m.revenueShare} % du CA signé par l’équipe ${copy.of}`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "tabular-nums",
                                m.current.signedAmount > 0 ? "font-semibold" : "text-muted-foreground",
                              )}
                            >
                              {currency(m.current.signedAmount)}
                            </span>
                            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                              {m.revenueShare} %
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full min-w-[7rem] overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.max(m.revenueShare, m.revenueShare > 0 ? 3 : 0)}%`,
                              }}
                            />
                          </div>
                        </td>
                        {METRICS.map((metric) => (
                          <td
                            key={metric.key}
                            className={cn(
                              "px-1.5 py-2.5 text-right tabular-nums",
                              m.current[metric.key] === 0 ? "text-muted-foreground" : "font-semibold",
                            )}
                            title={`${metric.label} : ${m.current[metric.key]} (cible ${fmt(m.targets[metric.key])}) · ${share(m.current[metric.key], team[metric.key])} % de l’équipe · ${copy.previous} : ${m.previous[metric.key]}`}
                          >
                            {m.current[metric.key]}
                          </td>
                        ))}
                        <td className="px-1.5 py-2.5 text-right tabular-nums text-muted-foreground">
                          {m.current.actions}
                        </td>
                        <td className="py-2.5 pl-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
                              role="meter"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={m.score}
                              aria-label={`Objectifs de ${m.name}`}
                            >
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  m.score >= 100 ? "bg-emerald-500" : "bg-primary",
                                )}
                                style={{ width: `${Math.max(m.score, m.score > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                            <span className="w-9 text-xs font-semibold tabular-nums">{m.score} %</span>
                            <Delta
                              value={m.score - m.previousScore}
                              unit=" pts"
                              className="hidden xl:inline-flex"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {ranked.length > 1 ? (
                  <tfoot>
                    <tr className="border-t-2 border-border/70 font-semibold">
                      <td className="py-2.5 pr-2" />
                      <td className="py-2.5 pr-2 text-xs uppercase tracking-wider text-muted-foreground">
                        Équipe (cumul)
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">{currency(team.signedAmount)}</td>
                      {METRICS.map((metric) => (
                        <td key={metric.key} className="px-1.5 py-2.5 text-right tabular-nums">
                          {team[metric.key]}
                        </td>
                      ))}
                      <td className="px-1.5 py-2.5 text-right tabular-nums">{team.actions}</td>
                      <td className="py-2.5 pl-2 text-xs tabular-nums">{teamScore} %</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Chiffres {copy.of} en cours ; la part indique le poids de chacun dans le CA signé par
            l’équipe. Survolez un chiffre pour sa part et sa cible. Les clients et le détail des
            affaires restent privés.
          </p>
        </CrmCard>

        <ObjectivesChart self={self} team={ranked} updated={updated} period={data.period} />
      </div>
    </section>
  );
}

/** Progression vers les objectifs de la période : vous (barres) et moyenne de l’équipe (repère). */
function ObjectivesChart({
  self,
  team,
  updated,
  period,
}: {
  self: (TeamPulseManager & { score: number; previousScore: number }) | null;
  team: (TeamPulseManager & { score: number })[];
  updated: string;
  period: TeamPulsePeriod;
}) {
  const [hover, setHover] = useState<Metric | null>(null);
  const copy = PERIOD_COPY[period];

  // Direction (pas de portefeuille) : l’équipe entière, sans repère de moyenne.
  const subject = self
    ? { current: self.current, previous: self.previous, targets: self.targets }
    : {
        current: sumCounts(team.map((m) => m.current)),
        previous: sumCounts(team.map((m) => m.previous)),
        targets: sumTargets(team.map((m) => m.targets)),
      };
  const score = periodScore(subject.current, subject.targets);
  const previousScore = periodScore(subject.previous, subject.targets);

  const teamAverage = (metric: Metric) =>
    team.length === 0
      ? 0
      : Math.round(
          team.reduce((s, m) => s + attainment(m.current[metric], m.targets[metric]), 0) /
            team.length,
        );

  const rows = METRICS.map((m) => ({
    ...m,
    done: subject.current[m.key],
    previous: subject.previous[m.key],
    target: subject.targets[m.key],
    pct: attainment(subject.current[m.key], subject.targets[m.key]),
    avg: self ? teamAverage(m.key) : null,
  }));
  const scaleMax = Math.max(100, ...rows.map((r) => r.pct), ...rows.map((r) => r.avg ?? 0));
  const pos = (pct: number) => `${(Math.min(pct, scaleMax) / scaleMax) * 100}%`;

  return (
    <CrmCard className="h-full lg:col-span-2">
      <div>
        <h3 className="font-display text-base font-semibold">
          {self ? `Mes objectifs ${copy.of}` : `Objectifs de l’équipe ${copy.of}`}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Taux d’atteinte · mis à jour {updated}</p>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="font-sans text-5xl font-semibold leading-none">{score} %</span>
        <div className="pb-1">
          <Delta value={score - previousScore} unit=" pts" />
          <p className="text-[11px] text-muted-foreground">vs {copy.previous}</p>
        </div>
      </div>

      {self ? (
        <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-primary" /> Vous
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-foreground/60" /> Moyenne de l’équipe
          </span>
        </div>
      ) : null}

      <ul className="mt-3 space-y-3">
        {rows.map((r) => {
          const reached = r.target > 0 && r.pct >= 100;
          return (
            <li
              key={r.key}
              className="relative"
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover((h) => (h === r.key ? null : h))}
              onFocus={() => setHover(r.key)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${r.label} : ${r.done} sur ${fmt(r.target)}, ${r.pct} %${r.avg !== null ? `, moyenne équipe ${r.avg} %` : ""}`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  {r.label}
                  {reached ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Atteint
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.done}</span> / {fmt(r.target)}
                  <span className="ml-1.5 text-xs">{r.pct} %</span>
                </span>
              </div>
              <div className="relative h-2.5">
                <div className="absolute inset-0 rounded-full bg-muted" />
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
                    reached ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: r.pct > 0 ? `max(6px, ${pos(r.pct)})` : 0 }}
                />
                {scaleMax > 100 ? (
                  <div className="absolute inset-y-[-2px] w-px bg-border" style={{ left: pos(100) }} />
                ) : null}
                {r.avg !== null ? (
                  <div
                    className="absolute inset-y-[-3px] w-0.5 -translate-x-1/2 rounded-full bg-foreground/60 ring-2 ring-background"
                    style={{ left: pos(r.avg) }}
                  />
                ) : null}
              </div>
              {hover === r.key ? (
                <div className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-60 rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-lg">
                  <div className="font-semibold">{r.label}</div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">{self ? "Vous" : "Équipe"}</span>
                    <span className="tabular-nums">
                      {r.done} / {fmt(r.target)} · {r.pct} %
                    </span>
                  </div>
                  {r.avg !== null ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Moyenne de l’équipe</span>
                      <span className="tabular-nums">{r.avg} %</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {period === "week" ? "S-1" : "M-1"} à durée égale
                    </span>
                    <span className="tabular-nums">{r.previous}</span>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {period === "week"
          ? "Cible de la semaine = objectif du mois × 7 / nombre de jours du mois."
          : "Cibles = objectifs du mois fixés par la direction."}
      </p>
    </CrmCard>
  );
}
