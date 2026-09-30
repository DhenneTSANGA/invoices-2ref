import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { HELP_LIBRARY, SERVICE_LINE_LABELS } from "@/lib/prospection-demo";
import { LineBadge } from "@/components/prospection/ProspectionBadges";

export const Route = createFileRoute("/prospection/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — Prospection" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <div>
      <PageHeader title="Bibliothèque commerciale" subtitle="Argumentaires, questions, offres, e-mails, WhatsApp — par ligne de service." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HELP_LIBRARY.map((item) => (
          <article key={`${item.line}-${item.category}-${item.title}`} className="glass-panel rounded-3xl p-5">
            <LineBadge line={item.line} />
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
            <h3 className="mt-1 font-display font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">{SERVICE_LINE_LABELS[item.line]} · v1 · démo</p>
          </article>
        ))}
      </div>
    </div>
  );
}
