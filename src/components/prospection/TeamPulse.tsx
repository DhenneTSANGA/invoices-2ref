import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CrmCard, EntityMark, IconMark, personAccent } from "@/components/prospection/CrmCards";
import { TeamTrend } from "@/components/prospection/TeamTrend";
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
 * Émulation entre managers : une carte par manager (gauche) et progression vers
 * les objectifs (droite), sur la semaine ou le mois en cours. Compteurs et CA signé
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

/** Étapes de l’entonnoir commercial, du premier repérage à la signature. */
const FUNNEL: { key: Metric; label: string }[] = [
  { key: "qualified", label: "Prospects qualifiés" },
  { key: "contacts", label: "Premiers contacts" },
  { key: "rdv", label: "RDV réalisés" },
  { key: "proposals", label: "Offres envoyées" },
  { key: "signatures", label: "Missions signées" },
];

/** Couleur de l’atteinte des objectifs : à lancer, en retard, en route, atteint. */
function scoreTone(score: number) {
  if (score >= 100)
    return { stroke: "stroke-emerald-500", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" };
  if (score >= 50) return { stroke: "stroke-primary", bar: "bg-primary", text: "text-primary" };
  if (score > 0)
    return { stroke: "stroke-amber-500", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" };
  return { stroke: "stroke-muted-foreground/30", bar: "bg-muted-foreground/30", text: "text-muted-foreground" };
}

/** Jauge circulaire d’atteinte des objectifs. */
function ScoreRing({
  score,
  size = 52,
  label,
  onDark,
}: {
  score: number;
  size?: number;
  label: string;
  onDark?: boolean;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const tone = scoreTone(score);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-white/15" : "stroke-muted"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", onDark && score > 0 && score < 100 ? "stroke-sky-300" : tone.stroke)}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums",
          onDark && "text-white",
        )}
      >
        {score} %
      </span>
    </div>
  );
}

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
  // Pas de classement : les managers gardent l’ordre alphabétique du serveur.
  const ranked = data.managers.map((m) => ({
    ...m,
    score: periodScore(m.current, m.targets),
    previousScore: periodScore(m.previous, m.targets),
    revenueShare: share(m.current.signedAmount, team.signedAmount),
  }));
  const self = ranked.find((m) => m.id === data.selfId) ?? null;
  const updated = sinceLabel(data.generatedAt, now);
  const teamScore = periodScore(team, sumTargets(data.managers.map((m) => m.targets)));

  return (
    <section className="mb-5">
      {toolbar}
      <div className="grid gap-4">
        {/* Cartes de l’équipe pleine largeur (une par manager, côte à côte), puis
            « Mes objectifs » pour un manager, ou l’évolution semaine par semaine pour la direction. */}
        <CrmCard>
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

          <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-float ring-1 ring-white/5">
            <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  CA signé par l’équipe {copy.of}
                </p>
                <p className="mt-1 font-sans text-3xl font-semibold tabular-nums">
                  {currency(team.signedAmount)}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-6 md:border-l md:border-white/10 md:pl-5">
                {[...FUNNEL].reverse().map((f) => (
                  <div key={f.key} className="min-w-0">
                    <dt className="truncate text-[10px] uppercase tracking-wider text-white/55">
                      {METRICS.find((m) => m.key === f.key)?.short}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">{team[f.key]}</dd>
                  </div>
                ))}
                <div className="min-w-0">
                  <dt className="truncate text-[10px] uppercase tracking-wider text-white/55">Actions</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">{team.actions}</dd>
                </div>
              </dl>
              <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-5">
                <ScoreRing score={teamScore} size={56} label="Objectifs de l’équipe" onDark />
                <span className="text-[11px] leading-tight text-white/60">
                  Objectifs
                  <br />
                  de l’équipe
                </span>
              </div>
            </div>
          </div>

          {ranked.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
              Aucun manager désigné pour l’instant.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ranked.map((m) => (
                <ManagerCard
                  key={m.id}
                  manager={m}
                  team={team}
                  isSelf={m.id === data.selfId}
                  periodOf={copy.of}
                  previousLabel={copy.previous}
                  periodShort={data.period === "week" ? "S-1" : "M-1"}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Chiffres {copy.of} en cours, réalisé / cible de chaque étape ; la part indique le poids
            de chacun dans le CA signé par l’équipe. Les clients et le détail des affaires restent
            privés.
          </p>
        </CrmCard>

        {self ? (
          <ObjectivesChart self={self} team={ranked} updated={updated} period={data.period} />
        ) : null}
      </div>
      {!self ? <TeamTrend /> : null}
    </section>
  );
}

/** Carte d’un manager : CA signé et sa part, entonnoir réalisé / cible, atteinte des objectifs. */
function ManagerCard({
  manager: m,
  team,
  isSelf,
  periodOf,
  previousLabel,
  periodShort,
}: {
  manager: TeamPulseManager & { score: number; previousScore: number; revenueShare: number };
  team: TeamPulseCounts;
  isSelf: boolean;
  periodOf: string;
  previousLabel: string;
  periodShort: string;
}) {
  const accent = personAccent(m.name);
  return (
    <li
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-surface/80 shadow-soft",
        isSelf ? "border-primary/40 ring-2 ring-primary/15" : "border-border/60",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", accent.bar)} aria-hidden />

      {/* Identité + atteinte des objectifs */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <EntityMark name={m.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold" title={m.name}>
            {m.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isSelf ? (
              <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Vous
              </span>
            ) : null}
            Objectifs
            <Delta value={m.score - m.previousScore} unit={` pts vs ${periodShort}`} className="whitespace-nowrap text-[11px]" />
          </div>
        </div>
        <ScoreRing score={m.score} label={`Objectifs de ${m.name}`} />
      </div>

      {/* CA signé */}
      <div
        className="mx-4 rounded-xl bg-muted/45 px-3 py-2.5"
        title={`${m.revenueShare} % du CA signé par l’équipe ${periodOf}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            CA signé
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Part équipe
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-lg tabular-nums",
              m.current.signedAmount > 0 ? "font-semibold" : "text-muted-foreground",
            )}
          >
            {currency(m.current.signedAmount)}
          </span>
          <span className="text-sm font-semibold tabular-nums">{m.revenueShare} %</span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background/70">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r", accent.bar)}
            style={{ width: `${Math.max(m.revenueShare, m.revenueShare > 0 ? 3 : 0)}%` }}
          />
        </div>
      </div>

      {/* Entonnoir : réalisé / cible par étape */}
      <div className="px-4 pb-3 pt-3">
        <div className="mb-1.5 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Entonnoir</span>
          <span>Réalisé / cible</span>
        </div>
        <ul className="space-y-1.5">
          {FUNNEL.map((f) => {
            const done = m.current[f.key];
            const target = m.targets[f.key];
            const pct = attainment(done, target);
            const reached = target > 0 && pct >= 100;
            return (
              <li
                key={f.key}
                title={`${f.label} : ${done} sur ${fmt(target)} · ${share(done, team[f.key])} % de l’équipe · ${previousLabel} : ${m.previous[f.key]}`}
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className={cn(done > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {f.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className={cn("font-semibold", done > 0 ? "text-foreground" : "")}>{done}</span>
                    {" / "}
                    {fmt(target)}
                    {reached ? (
                      <CheckCircle2
                        className="ml-1 inline h-3 w-3 -translate-y-px text-emerald-600 dark:text-emerald-400"
                        aria-label="atteint"
                      />
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      reached ? "bg-emerald-500" : "bg-primary/80",
                    )}
                    style={{ width: `${Math.min(100, pct > 0 ? Math.max(pct, 4) : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">{m.current.actions}</span> action(s)
          terminée(s)
        </span>
        <span className="tabular-nums">
          {periodShort} : {m.previous.actions}
        </span>
      </div>
    </li>
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
    <CrmCard>
      <div>
        <h3 className="font-display text-base font-semibold">
          {self ? `Mes objectifs ${copy.of}` : `Objectifs de l’équipe ${copy.of}`}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Taux d’atteinte · mis à jour {updated}</p>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="whitespace-nowrap font-sans text-5xl font-semibold leading-none">{score} %</span>
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

      <ul className="mt-3 grid gap-3 lg:grid-cols-2 lg:gap-x-10">
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
