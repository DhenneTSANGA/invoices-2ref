import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, Receipt, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { CrmCard, EntityMark, IconMark, personAccent } from "@/components/prospection/CrmCards";
import { TeamTrend } from "@/components/prospection/TeamTrend";
import { getCrmTeamPulse } from "@/lib/prospection.functions";
import type {
  TeamPulseCounts,
  TeamPulseInvoice,
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

/** Nombre qui défile de 0 à sa valeur au chargement (et d’une valeur à l’autre ensuite). */
function CountUp({
  value,
  format = (n: number) => Math.round(n).toLocaleString("fr-FR"),
  delay = 0,
}: {
  value: number;
  format?: (n: number) => string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    from.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion, delay]);
  return <span ref={ref}>{format(reduceMotion ? value : from.current)}</span>;
}

/** Jauge circulaire d’atteinte des objectifs, qui se remplit au chargement. */
function ScoreRing({
  score,
  size = 64,
  label,
  onDark,
  delay = 0,
}: {
  score: number;
  size?: number;
  label: string;
  onDark?: boolean;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const stroke = 6;
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
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduceMotion ? circ * (1 - pct / 100) : circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: reduceMotion ? 0 : 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
          className={onDark && score > 0 && score < 100 ? "stroke-sky-300" : tone.stroke}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums",
          onDark && "text-white",
        )}
      >
        <CountUp value={score} delay={delay} />
        <span className="ml-0.5 text-xs">%</span>
      </span>
    </div>
  );
}

/** Barre de progression qui s’allonge au chargement. */
function GrowBar({ pct, className, delay = 0 }: { pct: number; className: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const width = `${Math.min(100, pct > 0 ? Math.max(pct, 3) : 0)}%`;
  return (
    <motion.div
      className={cn("h-full rounded-full", className)}
      initial={{ width: reduceMotion ? width : 0 }}
      animate={{ width }}
      transition={{ duration: reduceMotion ? 0 : 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

const PERIOD_COPY: Record<TeamPulsePeriod, { tab: string; of: string; previous: string }> = {
  week: { tab: "Cette semaine", of: "de la semaine", previous: "la semaine dernière à la même heure" },
  month: { tab: "Ce mois", of: "du mois", previous: "le mois dernier à la même date" },
  year: { tab: "Cette année", of: "de l’année", previous: "l’an dernier à la même date" },
};

const PERIOD_SHORT: Record<TeamPulsePeriod, string> = { week: "S-1", month: "M-1", year: "A-1" };

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
      collectedAmount: t.collectedAmount + (c.collectedAmount ?? 0),
      invoicedAmount: t.invoicedAmount + (c.invoicedAmount ?? 0),
    }),
    {
      qualified: 0,
      contacts: 0,
      rdv: 0,
      proposals: 0,
      signatures: 0,
      actions: 0,
      signedAmount: 0,
      collectedAmount: 0,
      invoicedAmount: 0,
    },
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
      const saved = localStorage.getItem(PERIOD_KEY);
      return saved === "month" || saved === "year" ? saved : "week";
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
          { value: "year", label: PERIOD_COPY.year.tab },
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
  const teamOutstanding = data.managers.reduce((s, m) => s + (m.outstanding ?? 0), 0);

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

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-float ring-1 ring-white/5"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-72 rounded-full bg-sky-400/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  CA signé par l’équipe {copy.of}
                </p>
                <p className="mt-1.5 whitespace-nowrap font-sans text-3xl font-semibold tabular-nums sm:text-4xl">
                  <CountUp value={team.signedAmount} format={(n) => currency(Math.round(n))} />
                </p>
                <p className="mt-2 text-sm text-white/75">
                  Encaissé {copy.of} :{" "}
                  <span className="font-semibold tabular-nums text-emerald-300">
                    <CountUp value={team.collectedAmount} format={(n) => currency(Math.round(n))} />
                  </span>
                  {teamOutstanding > 0 ? (
                    <span className="text-white/60"> · reste à encaisser {currency(teamOutstanding)}</span>
                  ) : null}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-4 sm:grid-cols-6 lg:border-l lg:border-white/10 lg:pl-6">
                {[
                  ...[...FUNNEL].reverse().map((f) => ({
                    key: f.key as string,
                    label: METRICS.find((m) => m.key === f.key)?.short ?? f.label,
                    value: team[f.key],
                  })),
                  { key: "actions", label: "Actions", value: team.actions },
                ].map((st, i) => (
                  <div key={st.key} className="min-w-0">
                    <dt className="truncate text-xs text-white/60">{st.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">
                      <CountUp value={st.value} delay={0.05 * i} />
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center gap-3 lg:border-l lg:border-white/10 lg:pl-6">
                <ScoreRing score={teamScore} size={72} label="Objectifs de l’équipe" onDark />
                <span className="text-sm leading-snug text-white/70">
                  Objectifs
                  <br />
                  de l’équipe
                </span>
              </div>
            </div>
          </motion.div>

          {ranked.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
              Aucun manager désigné pour l’instant.
            </p>
          ) : (
            <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {ranked.map((m, i) => (
                <ManagerCard
                  key={m.id}
                  index={i}
                  manager={m}
                  team={team}
                  isSelf={m.id === data.selfId}
                  periodOf={copy.of}
                  previousLabel={copy.previous}
                  periodShort={PERIOD_SHORT[data.period]}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Chiffres {copy.of} en cours, réalisé / cible de chaque étape ; la part indique le poids
            de chacun dans le CA signé par l’équipe. Le détail des affaires de chacun reste privé.
          </p>
        </CrmCard>

        {data.invoices?.length ? (
          <ManagerInvoices invoices={data.invoices} managers={ranked} periodOf={copy.of} />
        ) : null}

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
  index,
  team,
  isSelf,
  periodOf,
  previousLabel,
  periodShort,
}: {
  manager: TeamPulseManager & { score: number; previousScore: number; revenueShare: number };
  index: number;
  team: TeamPulseCounts;
  isSelf: boolean;
  periodOf: string;
  previousLabel: string;
  periodShort: string;
}) {
  const reduceMotion = useReducedMotion();
  const accent = personAccent(m.name);
  // Les cartes arrivent l’une après l’autre ; leurs jauges et barres suivent.
  const delay = 0.12 + index * 0.1;
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-surface/90 shadow-soft transition-shadow hover:shadow-float",
        isSelf ? "border-primary/40 ring-2 ring-primary/15" : "border-border/60",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accent.bar)} aria-hidden />
      <div
        className={cn(
          "pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-70 blur-3xl transition-opacity group-hover:opacity-100",
          accent.glow,
        )}
        aria-hidden
      />

      {/* Identité + atteinte des objectifs */}
      <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-6">
        <EntityMark name={m.name} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight" title={m.name}>
            {m.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {isSelf ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                Vous
              </span>
            ) : null}
            <Delta
              value={m.score - m.previousScore}
              unit={` pts vs ${periodShort}`}
              className="whitespace-nowrap text-sm"
            />
          </div>
        </div>
        <ScoreRing score={m.score} label={`Objectifs de ${m.name}`} delay={delay + 0.15} />
      </div>

      {/* CA signé */}
      <div
        className="relative mx-5 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3.5"
        title={`${m.revenueShare} % du CA signé par l’équipe ${periodOf}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            CA signé
          </span>
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
            <CountUp value={m.revenueShare} delay={delay + 0.1} /> % de l’équipe
          </span>
        </div>
        <div
          className={cn(
            "mt-1 font-sans text-2xl tabular-nums",
            m.current.signedAmount > 0 ? "font-semibold" : "text-muted-foreground",
          )}
        >
          <CountUp
            value={m.current.signedAmount}
            format={(n) => currency(Math.round(n))}
            delay={delay + 0.1}
          />
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-background/80">
          <GrowBar pct={m.revenueShare} className={cn("bg-gradient-to-r", accent.bar)} delay={delay + 0.2} />
        </div>
        {/* Facturé puis encaissé : factures dont il est le manager apporteur (Facturation). */}
        <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-border/50 pt-2.5 text-sm">
          <span className="text-muted-foreground">Facturé</span>
          <span
            className={cn(
              "tabular-nums",
              (m.current.invoicedAmount ?? 0) > 0 ? "font-semibold" : "text-muted-foreground",
            )}
          >
            <CountUp
              value={m.current.invoicedAmount ?? 0}
              format={(n) => currency(Math.round(n))}
              delay={delay + 0.15}
            />
          </span>
        </div>
        <div
          className="mt-1 flex items-baseline justify-between gap-2 text-sm"
          title={`${share(m.current.collectedAmount ?? 0, team.collectedAmount)} % de l’encaissé de l’équipe ${periodOf}`}
        >
          <span className="text-muted-foreground">Encaissé</span>
          <span
            className={cn(
              "tabular-nums",
              (m.current.collectedAmount ?? 0) > 0
                ? "font-semibold text-emerald-700 dark:text-emerald-300"
                : "text-muted-foreground",
            )}
          >
            <CountUp
              value={m.current.collectedAmount ?? 0}
              format={(n) => currency(Math.round(n))}
              delay={delay + 0.15}
            />
          </span>
        </div>
        {(m.outstanding ?? 0) > 0 ? (
          <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span>Reste à encaisser</span>
            <span className="tabular-nums">{currency(m.outstanding)}</span>
          </div>
        ) : null}
      </div>

      {/* Entonnoir : réalisé / cible par étape */}
      <div className="relative px-5 pb-4 pt-4">
        <div className="mb-2.5 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Entonnoir</span>
          <span>Réalisé / cible</span>
        </div>
        <ul className="space-y-3">
          {FUNNEL.map((f, i) => {
            const done = m.current[f.key];
            const target = m.targets[f.key];
            const pct = attainment(done, target);
            const reached = target > 0 && pct >= 100;
            return (
              <li
                key={f.key}
                title={`${f.label} : ${done} sur ${fmt(target)} · ${share(done, team[f.key])} % de l’équipe · ${previousLabel} : ${m.previous[f.key]}`}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={cn(done > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {f.label}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <span className={cn("text-base font-semibold", done > 0 && "text-foreground")}>{done}</span>
                    <span>/ {fmt(target)}</span>
                    {reached ? (
                      <CheckCircle2
                        className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                        aria-label="atteint"
                      />
                    ) : null}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <GrowBar
                    pct={pct}
                    className={reached ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-blue-600 to-sky-400"}
                    delay={delay + 0.25 + i * 0.06}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative mt-auto flex items-center justify-between border-t border-border/50 px-5 py-3.5 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">{m.current.actions}</span> action(s)
          terminée(s)
        </span>
        <span className="tabular-nums">
          {periodShort} : {m.previous.actions}
        </span>
      </div>
    </motion.li>
  );
}

const INVOICE_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Payée", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  sent: { label: "Envoyée", className: "bg-sky-500/15 text-sky-800 dark:text-sky-300" },
  signed: { label: "Signée", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  overdue: { label: "En retard", className: "bg-danger/10 text-danger" },
};

/** Qui a fait rentrer quoi : factures de la période par manager apporteur (Facturation). */
function ManagerInvoices({
  invoices,
  managers,
  periodOf,
}: {
  invoices: TeamPulseInvoice[];
  managers: { id: string; name: string }[];
  periodOf: string;
}) {
  const groups = managers
    .map((m) => ({ manager: m, rows: invoices.filter((f) => f.managerId === m.id) }))
    .filter((g) => g.rows.length > 0);
  const day = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
      new Date(iso.length === 10 ? `${iso}T12:00:00.000Z` : iso),
    );

  return (
    <CrmCard>
      <div className="flex items-start gap-3">
        <IconMark icon={Receipt} tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" />
        <div>
          <h3 className="font-display text-base font-semibold">Factures des managers</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Factures {periodOf} (émises ou encaissées) et celles restant à encaisser, par manager
            apporteur.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-5">
        {groups.map(({ manager, rows }) => {
          const paid = rows.filter((f) => f.status === "paid").reduce((s, f) => s + f.total, 0);
          const due = rows.reduce((s, f) => s + f.due, 0);
          return (
            <section key={manager.id}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <EntityMark name={manager.name} size="sm" />
                  <span className="font-semibold">{manager.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Encaissé{" "}
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {currency(paid)}
                  </span>
                </span>
                {due > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Reste à encaisser <span className="font-semibold tabular-nums text-foreground">{currency(due)}</span>
                  </span>
                ) : null}
              </div>
              <div className="-mx-1 mt-2 overflow-x-auto px-1">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 text-left font-semibold">Facture</th>
                      <th className="px-3 py-2 text-left font-semibold">Client</th>
                      <th className="px-3 py-2 text-left font-semibold">Émise le</th>
                      <th className="px-3 py-2 text-right font-semibold">Montant</th>
                      <th className="py-2 pl-3 text-left font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((f) => {
                      const st = INVOICE_STATUS[f.status] ?? { label: f.status, className: "bg-muted text-muted-foreground" };
                      return (
                        <tr key={f.id} className="border-t border-border/50">
                          <td className="py-2.5 pr-3 font-medium tabular-nums">{f.number}</td>
                          <td className="max-w-[14rem] truncate px-3 py-2.5" title={f.clientName}>
                            {f.clientName}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{day(f.issueDate)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{currency(f.total)}</td>
                          <td className="py-2.5 pl-3">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", st.className)}>
                              {st.label}
                            </span>
                            {f.status === "paid" && f.paidAt ? (
                              <span className="ml-2 text-xs text-muted-foreground">le {day(f.paidAt)}</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </CrmCard>
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
                      {PERIOD_SHORT[period]} à durée égale
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
          : period === "year"
            ? "Cibles = objectifs mensuels cumulés de janvier au mois en cours."
            : "Cibles = objectifs du mois fixés par la direction."}
      </p>
    </CrmCard>
  );
}
