import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { SITE_LABELS, managerName } from "@/lib/prospection-demo";
import { LineBadge, StageBadge } from "@/components/prospection/ProspectionBadges";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/prospection/prospects/$id")({
  component: ProspectDetailPage,
});

function ProspectDetailPage() {
  const { id } = Route.useParams();
  const companies = useProspectionDemoStore((s) => s.companies);
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const company = companies.find((c) => c.id === id);

  if (!company) {
    return (
      <p>
        Introuvable. <Link to="/prospection/prospects">Retour</Link>
      </p>
    );
  }

  return (
    <div>
      <Link to="/prospection/prospects" className="mb-4 inline-block text-sm text-primary hover:underline">
        Tous les prospects
      </Link>
      <PageHeader
        title={company.name}
        subtitle={`${SITE_LABELS[company.site]} · ${managerName(company.managerId)}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Contacts</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {contacts
              .filter((c) => c.companyId === id)
              .map((c) => (
                <li key={c.id}>
                  {c.firstName} {c.lastName} — {c.role}
                  {c.decisionMaker ? " · décideur" : ""}
                </li>
              ))}
          </ul>
        </section>
        <section className="glass-panel rounded-3xl p-5">
          <h3 className="font-display font-semibold">Opportunités</h3>
          <ul className="mt-3 space-y-2">
            {opportunities
              .filter((o) => o.companyId === id)
              .map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{o.title}</span>
                  <StageBadge stage={o.stage} />
                </li>
              ))}
          </ul>
        </section>
      </div>
      <section className="glass-panel mt-4 rounded-3xl p-5">
        <h3 className="font-display font-semibold">Journal</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {activities
            .filter((a) => a.companyId === id)
            .slice(0, 12)
            .map((a) => (
              <li key={a.id}>
                {shortDate(a.at)} — {a.title} · {a.summary}
              </li>
            ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1">
          {company.targetLines.map((l) => (
            <LineBadge key={l} line={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
