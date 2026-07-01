import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, FileText, ReceiptText, Users, Package } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "Recherche globale — FacturIA" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const clients = useAppStore((s) => s.clients);
  const docs = useAppStore((s) => s.documents);
  const services = useAppStore((s) => s.services);

  const term = q.toLowerCase();
  const cm = clients.filter((c) => `${c.name} ${c.email} ${c.ice}`.toLowerCase().includes(term));
  const dm = docs.filter((d) => `${d.number}`.toLowerCase().includes(term));
  const sm = services.filter((s) => `${s.code} ${s.name} ${s.category}`.toLowerCase().includes(term));

  return (
    <div>
      <PageHeader title="Recherche globale" subtitle="Trouvez n'importe quoi en un instant." />
      <div className="glass-panel mb-6 rounded-3xl p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher clients, documents, services…" className="w-full rounded-2xl bg-transparent pl-12 pr-4 py-4 text-base focus:outline-none" />
        </div>
      </div>

      {q.length < 1 ? (
        <p className="text-center text-sm text-muted-foreground">Commencez à taper pour explorer votre base.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Section title="Clients" icon={Users} count={cm.length}>
            {cm.slice(0, 8).map((c) => <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="block rounded-xl px-3 py-2 hover:bg-muted"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.email}</div></Link>)}
          </Section>
          <Section title="Documents" icon={FileText} count={dm.length}>
            {dm.slice(0, 8).map((d) => <Link key={d.id} to={d.type === "invoice" ? "/invoices/$id" : "/quotations/$id"} params={{ id: d.id }} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted">{d.type === "invoice" ? <ReceiptText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}<span className="font-medium font-numeric">{d.number}</span></Link>)}
          </Section>
          <Section title="Services" icon={Package} count={sm.length}>
            {sm.slice(0, 8).map((s) => <div key={s.id} className="rounded-xl px-3 py-2"><div className="text-xs font-numeric text-muted-foreground">{s.code}</div><div className="text-sm font-medium">{s.name}</div></div>)}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: typeof Search; count: number; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {title} <span className="ml-auto rounded-full bg-muted px-2 text-xs">{count}</span></div>
      <div className="space-y-0.5">{count === 0 ? <p className="px-3 py-2 text-xs italic text-muted-foreground">Aucun résultat</p> : children}</div>
    </div>
  );
}
