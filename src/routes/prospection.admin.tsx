import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Columns3, Factory, MapPin, Plus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { AddReferentialDialog } from "@/components/prospection/CrmForms";
import { CrmCard, CrmCardGrid, IconMark } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN } from "@/components/prospection/CrmUi";
import {
  EXPENSE_LABELS,
  SECTORS,
  SERVICE_LINE_LABELS,
  SITE_LABELS,
  STAGE_LABELS,
  type ReferentialKind,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/admin")({
  head: () => ({ meta: [{ title: "Administration — Prospection" }] }),
  component: AdminPage,
});

function AdminPage() {
  const extras = useProspectionDemoStore((s) => s.referentials);
  const [open, setOpen] = useState(false);

  const extraOf = (kind: ReferentialKind) => extras.filter((r) => r.kind === kind).map((r) => r.label);

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Référentiels CRM — ajout en base. L’équipe se gère dans l’onglet Équipe."
        actions={
          <button type="button" onClick={() => setOpen(true)} className={CRM_PRIMARY_BTN}>
            <Plus className="h-4 w-4" />
            Ajouter au référentiel
          </button>
        }
      />
      <CrmCardGrid dense>
        <Block
          title="Lignes de service"
          icon={Briefcase}
          tone="bg-violet-500/15 text-violet-700 dark:text-violet-300"
          items={[...Object.values(SERVICE_LINE_LABELS), ...extraOf("line")]}
        />
        <Block
          title="Étapes pipeline"
          icon={Columns3}
          tone="bg-sky-500/15 text-sky-800 dark:text-sky-300"
          items={[...Object.values(STAGE_LABELS), ...extraOf("stage")]}
        />
        <Block
          title="Implantations"
          icon={MapPin}
          tone="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
          items={[...Object.values(SITE_LABELS), ...extraOf("site")]}
        />
        <Block
          title="Catégories de dépenses"
          icon={Wallet}
          tone="bg-amber-500/15 text-amber-800 dark:text-amber-300"
          items={[...Object.values(EXPENSE_LABELS), ...extraOf("expense")]}
        />
        <Block
          title="Secteurs"
          icon={Factory}
          tone="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
          items={[...SECTORS, ...extraOf("sector")]}
        />
      </CrmCardGrid>
      <p className="mt-4 text-sm text-muted-foreground">
        Prospection réservée aux administrateurs : super-admin → direction CRM,
        admin → admin CRM (pipeline, budget, validations).
      </p>
      <AddReferentialDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Block({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <CrmCard className="h-full">
      <div className="flex items-start gap-3">
        <IconMark icon={icon} tone={tone} />
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{items.length} valeur(s)</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li
            key={i}
            className="inline-flex rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground"
          >
            {i}
          </li>
        ))}
      </ul>
    </CrmCard>
  );
}
