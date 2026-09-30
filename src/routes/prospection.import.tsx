import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import type { Company } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/prospection/import")({
  head: () => ({ meta: [{ title: "Import / export — Prospection" }] }),
  component: ImportPage,
});

function ImportPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const importCompanies = useProspectionDemoStore((s) => s.importCompanies);
  const [preview, setPreview] = useState<string>("");

  function exportCsv() {
    const header = "nom,type,site,manager,ca\n";
    const body = companies
      .map((c) => `${c.name},${c.kind},${c.site},${c.managerId},${c.caSigned}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospection-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  return (
    <div>
      <PageHeader title="Import / export" subtitle="CSV côté navigateur — mapping simple. Excel/PDF native viendra avec PostgreSQL." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Import CSV</h3>
          <p className="text-sm text-muted-foreground">Colonnes : nom, type (prospect|client), site (libreville|port_gentil|franceville)</p>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            rows={8}
            placeholder={"Atlantic New,prospect,libreville"}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              const rows: Company[] = preview
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line, i) => {
                  const [name, kind, site] = line.split(",").map((s) => s.trim());
                  return {
                    id: `co-imp-${Date.now()}-${i}`,
                    name: name || `Import ${i}`,
                    kind: kind === "client" ? "client" : "prospect",
                    sector: "Import",
                    size: "—",
                    site: site === "port_gentil" || site === "franceville" ? site : "libreville",
                    address: "",
                    phone: "",
                    email: "",
                    website: "",
                    managerId: "mgr-awa",
                    servicesBought: [],
                    targetLines: [],
                    source: "nouveau",
                    strategic: false,
                    caSigned: 0,
                    notes: "Import CSV démo",
                  } satisfies Company;
                });
              if (rows.length === 0) {
                toast.error("Aucune ligne");
                return;
              }
              importCompanies(rows);
              toast.success(`${rows.length} ligne(s) importée(s)`);
            }}
          >
            Importer
          </button>
        </section>
        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Export</h3>
          <p className="text-sm text-muted-foreground">
            {companies.length} entreprises · {opportunities.length} opportunités · pipeline {currency(opportunities.reduce((s, o) => s + o.amount, 0))}
          </p>
          <button type="button" onClick={exportCsv} className="rounded-2xl border border-border px-4 py-2 text-sm">
            Télécharger CSV
          </button>
        </section>
      </div>
    </div>
  );
}
