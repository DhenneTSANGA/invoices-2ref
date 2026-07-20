import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useServices } from "@/hooks/use-data";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "Catalogue des services — 2REF-AUTO" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const [q, setQ] = useState("");
  const filtered = services.filter((s) =>
    `${s.code} ${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Chargement du catalogue…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Catalogue de services"
        subtitle={`${services.length} prestations disponibles`}
      />

      <div className="glass-panel mb-4 flex items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher dans le catalogue…"
            className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Aucun service. Lancez <code className="text-xs">pnpm db:seed</code> pour
          peupler le catalogue.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -3 }}
              className="glass-panel rounded-3xl p-5 hover:shadow-glow transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-numeric text-muted-foreground">{s.code}</div>
                  <div className="font-semibold leading-tight">{s.name}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {s.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                  {s.category}
                </span>
                <div className="text-right">
                  <div className="font-numeric font-bold text-gradient-primary">
                    {currency(s.unitPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    par {s.unit} · TVA {s.vatRate}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
