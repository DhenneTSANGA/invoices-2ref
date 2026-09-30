import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import {
  EXPENSE_LABELS,
  SERVICE_LINE_LABELS,
  SITE_LABELS,
  STAGE_LABELS,
} from "@/lib/prospection-demo";

export const Route = createFileRoute("/prospection/admin")({
  head: () => ({ meta: [{ title: "Administration — Prospection" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div>
      <PageHeader title="Administration" subtitle="Référentiels configurables — listes de la démo, prêtes à brancher en base." />
      <div className="grid gap-4 md:grid-cols-2">
        <Block title="Lignes de service" items={Object.values(SERVICE_LINE_LABELS)} />
        <Block title="Étapes pipeline" items={Object.values(STAGE_LABELS)} />
        <Block title="Implantations" items={Object.values(SITE_LABELS)} />
        <Block title="Catégories de dépenses" items={Object.values(EXPENSE_LABELS)} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Rôles CRM : manager, direction, chef de service, collaborateur, administrateur. Mapping actuel 2R Hub : super-admin → direction, admin → manager, membre → collaborateur.
      </p>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="glass-panel rounded-3xl p-5">
      <h3 className="font-display font-semibold">{title}</h3>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
}
