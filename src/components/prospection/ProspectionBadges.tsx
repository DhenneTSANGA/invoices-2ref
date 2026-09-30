import { cn } from "@/lib/utils";
import {
  ACTIVITY_LABELS,
  LEAD_STATUS_LABELS,
  SERVICE_LINE_LABELS,
  SOURCE_LABELS,
  STAGE_LABELS,
  type ActivityKind,
  type LeadStatus,
  type OpportunitySource,
  type PipelineStage,
  type ServiceLine,
} from "@/lib/prospection-demo";

const STAGE_CLASS: Record<PipelineStage, string> = {
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

export function LineBadge({ line }: { line: ServiceLine }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      {SERVICE_LINE_LABELS[line]}
    </span>
  );
}

export function SourceBadge({ source }: { source: OpportunitySource }) {
  return <span className="text-sm text-muted-foreground">{SOURCE_LABELS[source]}</span>;
}

export function LeadBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function ActivityKindLabel({ kind }: { kind: ActivityKind }) {
  return <span>{ACTIVITY_LABELS[kind]}</span>;
}
