"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
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

const STAGE_DOT: Record<PipelineStage, string> = {
  qualification: "bg-sky-500",
  premier_contact: "bg-indigo-500",
  rendez_vous: "bg-amber-500",
  proposition: "bg-violet-500",
  negotiation: "bg-fuchsia-500",
  decision: "bg-orange-500",
  gagne: "bg-emerald-500",
  perdu: "bg-danger",
  reporte: "bg-muted-foreground",
};

const PIPELINE_STAGES: PipelineStage[] = [
  "qualification",
  "premier_contact",
  "rendez_vous",
  "proposition",
  "negotiation",
  "decision",
];
const OUTCOME_STAGES: PipelineStage[] = ["gagne", "perdu", "reporte"];

/** Étape suivante logique dans le pipeline (hors issue gagnée/perdue/reportée). */
export function nextPipelineStage(current: PipelineStage): PipelineStage | null {
  const i = PIPELINE_STAGES.indexOf(current);
  if (i < 0 || i >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[i + 1] ?? null;
}

export function StageSelect({
  value,
  onChange,
}: {
  value: PipelineStage;
  onChange: (stage: PipelineStage) => void;
}) {
  const suggested = nextPipelineStage(value);

  return (
    <div
      className="shrink-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <SelectPrimitive.Root value={value} onValueChange={(next) => onChange(next as PipelineStage)}>
        <SelectPrimitive.Trigger
          aria-label={`Étape actuelle : ${STAGE_LABELS[value]}. Valider pour avancer ou clôturer.`}
          title="Étape actuelle — validez pour avancer, ou clôturez"
          className={cn(
            "group inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:ring-2 data-[state=open]:ring-primary/30",
            STAGE_CLASS[value],
          )}
        >
          <span>{STAGE_LABELS[value]}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={8}
            align="end"
            className="z-[80] min-w-[280px] overflow-hidden rounded-2xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Valider et avancer vers…
            </div>
            <SelectPrimitive.Viewport className="flex flex-col gap-0.5">
              {PIPELINE_STAGES.map((st) => (
                <StageOption
                  key={st}
                  stage={st}
                  current={value}
                  suggested={suggested === st}
                />
              ))}
              <SelectPrimitive.Separator className="mx-1 my-1.5 h-px bg-border/70" />
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Clôturer
              </div>
              {OUTCOME_STAGES.map((st) => (
                <StageOption key={st} stage={st} current={value} />
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

function StageOption({
  stage,
  current,
  suggested,
}: {
  stage: PipelineStage;
  current: PipelineStage;
  suggested?: boolean;
}) {
  const isCurrent = stage === current;
  return (
    <SelectPrimitive.Item
      value={stage}
      disabled={isCurrent}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted/80 data-[disabled]:cursor-default data-[disabled]:opacity-100",
        suggested && "bg-primary/8 ring-1 ring-inset ring-primary/25",
        isCurrent && "bg-muted/40",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_DOT[stage])} />
      <SelectPrimitive.ItemText className="flex-1 font-medium">
        {STAGE_LABELS[stage]}
      </SelectPrimitive.ItemText>
      {isCurrent ? (
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          À valider
        </span>
      ) : suggested ? (
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-primary">
          Suivante
        </span>
      ) : (
        <SelectPrimitive.ItemIndicator className="ml-auto text-primary">
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      )}
    </SelectPrimitive.Item>
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
