import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Columns3, Factory, MapPin, Plus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  type ReferentialExtra,
  type ReferentialKind,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/admin")({
  head: () => ({ meta: [{ title: "Administration — Prospection" }] }),
  component: AdminPage,
});

function AdminPage() {
  const extras = useProspectionDemoStore((s) => s.referentials);
  const deleteReferential = useProspectionDemoStore((s) => s.deleteReferential);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReferentialExtra | null>(null);

  const extrasOf = (kind: ReferentialKind) => extras.filter((r) => r.kind === kind);

  const removeExtra = (id: string, label: string) => {
    if (!confirm(`Retirer « ${label} » du référentiel ?`)) return;
    void deleteReferential(id).then(
      () => toast.success("Valeur retirée"),
      (err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"),
    );
  };

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
          builtins={[...Object.values(SERVICE_LINE_LABELS)]}
          extras={extrasOf("line")}
          onRemove={removeExtra}
          onEdit={setEditing}
        />
        <Block
          title="Étapes pipeline"
          icon={Columns3}
          tone="bg-sky-500/15 text-sky-800 dark:text-sky-300"
          builtins={[...Object.values(STAGE_LABELS)]}
          extras={extrasOf("stage")}
          onRemove={removeExtra}
          onEdit={setEditing}
        />
        <Block
          title="Implantations"
          icon={MapPin}
          tone="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
          builtins={[...Object.values(SITE_LABELS)]}
          extras={extrasOf("site")}
          onRemove={removeExtra}
          onEdit={setEditing}
        />
        <Block
          title="Catégories de dépenses"
          icon={Wallet}
          tone="bg-amber-500/15 text-amber-800 dark:text-amber-300"
          builtins={[...Object.values(EXPENSE_LABELS)]}
          extras={extrasOf("expense")}
          onRemove={removeExtra}
          onEdit={setEditing}
        />
        <Block
          title="Secteurs"
          icon={Factory}
          tone="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
          builtins={[...SECTORS]}
          extras={extrasOf("sector")}
          onRemove={removeExtra}
          onEdit={setEditing}
        />
      </CrmCardGrid>
      <p className="mt-4 text-sm text-muted-foreground">
        Prospection réservée aux administrateurs : super-admin → direction CRM,
        admin → admin CRM (pipeline, budget, validations).
      </p>
      <AddReferentialDialog open={open} onOpenChange={setOpen} />
      <AddReferentialDialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}

function Block({
  title,
  builtins,
  extras,
  icon,
  tone,
  onRemove,
  onEdit,
}: {
  title: string;
  builtins: string[];
  extras: ReferentialExtra[];
  icon: LucideIcon;
  tone: string;
  onRemove: (id: string, label: string) => void;
  onEdit: (row: ReferentialExtra) => void;
}) {
  const total = builtins.length + extras.length;
  return (
    <CrmCard className="h-full">
      <div className="flex items-start gap-3">
        <IconMark icon={icon} tone={tone} />
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{total} valeur(s)</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {builtins.map((i) => (
          <li
            key={i}
            className="inline-flex rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground"
          >
            {i}
          </li>
        ))}
        {extras.map((e) => (
          <li
            key={e.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
          >
            <button
              type="button"
              className="hover:underline"
              onClick={() => onEdit(e)}
              title="Modifier"
            >
              {e.label}
            </button>
            <button
              type="button"
              className="rounded-full px-1 text-[10px] text-muted-foreground hover:bg-danger/15 hover:text-danger"
              onClick={() => onRemove(e.id, e.label)}
              aria-label={`Retirer ${e.label}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </CrmCard>
  );
}
