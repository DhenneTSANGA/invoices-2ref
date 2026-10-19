"use client";

import { cn } from "@/lib/utils";
import {
  ACTIVITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  LIBRARY_DOMAIN_LABELS,
  SERVICE_LINE_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  type ActivityKind,
  type ActivityStatus,
  type LeadStatus,
  type LibraryDomain,
  type OpportunitySource,
  type PipelineStage,
  type ServiceLine,
} from "@/lib/prospection-model";

const STAGE_CLASS: Record<PipelineStage, string> = {
  identification: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  qualification: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  premier_contact: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  rendez_vous: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  proposition: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  negotiation: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  decision: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  gagne: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  perdu: "bg-danger/10 text-danger",
  reporte: "bg-muted text-muted-foreground",
};

export function StageBadge({ stage }: { stage: PipelineStage }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_CLASS[stage])}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

const LINE_CLASS: Record<ServiceLine, string> = {
  rh: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  comptabilite: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  conseil: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  fiscalite: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  formation: "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
};

export function LineBadge({ line }: { line: ServiceLine }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", LINE_CLASS[line])}>
      {SERVICE_LINE_LABELS[line]}
    </span>
  );
}

const LIBRARY_DOMAIN_CLASS: Record<LibraryDomain, string> = {
  comptabilite: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  fiscalite: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  audit: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
  juridique: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
  rh: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  formation: "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
  conseil: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
};

export function LibraryDomainBadge({ line }: { line: LibraryDomain }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", LIBRARY_DOMAIN_CLASS[line])}>
      {LIBRARY_DOMAIN_LABELS[line]}
    </span>
  );
}

export function SourceBadge({ source }: { source: OpportunitySource }) {
  return <span className="text-sm text-muted-foreground">{SOURCE_LABELS[source]}</span>;
}

const LEAD_CLASS: Record<LeadStatus, string> = {
  nouvelle: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  en_cours: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  qualifiee: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  convertie: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejetee: "bg-danger/10 text-danger",
  reportee: "bg-muted text-muted-foreground",
};

export function LeadBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", LEAD_CLASS[status])}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

const ACTIVITY_STATUS_CLASS: Record<ActivityStatus, string> = {
  a_faire: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  planifiee: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  en_cours: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  terminee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  annulee: "bg-muted text-muted-foreground",
  en_retard: "bg-danger/10 text-danger",
};

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", ACTIVITY_STATUS_CLASS[status])}>
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}

export function ActivityKindLabel({ kind }: { kind: ActivityKind }) {
  return <span>{ACTIVITY_LABELS[kind]}</span>;
}
