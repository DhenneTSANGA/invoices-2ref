import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import type { Company, CompanyKind, Site } from "@/lib/prospection-demo";
import { currency } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/import")({
  head: () => ({ meta: [{ title: "Import / export — Prospection" }] }),
  component: ImportPage,
});

function parseKind(v: string | undefined): CompanyKind {
  return v?.trim() === "client" ? "client" : "prospect";
}

function parseSite(v: string | undefined): Site {
  const s = v?.trim();
  if (s === "port_gentil" || s === "franceville" || s === "libreville") return s;
  return "libreville";
}

function ImportPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const selfId = session.staff.id;
  const { companies } = useProspectionCompanies();
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const importCompanies = useProspectionDemoStore((s) => s.importCompanies);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function rowsFromText(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const start = lines[0]?.toLowerCase().startsWith("nom") ? 1 : 0;
    const nextErrors: string[] = [];
    const rows: Company[] = [];
    lines.slice(start).forEach((line, i) => {
      const parts = line.split(",").map((s) => s.trim());
      if (!parts[0]) {
        nextErrors.push(`Ligne ${i + 1 + start} : nom manquant`);
        return;
      }
      const managerFromCsv = parts[3]?.trim();
      rows.push({
        id: `co-imp-${Date.now()}-${i}`,
        name: parts[0],
        kind: parseKind(parts[1]),
        sector: "Import",
        size: "—",
        site: parseSite(parts[2]),
        address: "",
        phone: "",
        email: "",
        website: "",
        managerId: managerFromCsv || selfId,
        servicesBought: [],
        targetLines: [],
        source: "nouveau",
        strategic: false,
        caSigned: Number(parts[4]) || 0,
        notes: "Import CSV",
      });
    });
    return { rows, nextErrors };
  }

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

  function runImport(text: string) {
    const { rows, nextErrors } = rowsFromText(text);
    setErrors(nextErrors);
    if (rows.length === 0) {
      toast.error("Aucune ligne valide");
      return;
    }
    void (async () => {
      try {
        await importCompanies(rows);
        toast.success(
          `${rows.length} ligne(s) importée(s)${nextErrors.length ? ` · ${nextErrors.length} erreur(s)` : ""}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import impossible");
      }
    })();
  }

  return (
    <div>
      <PageHeader
        title="Import / export"
        subtitle="CSV navigateur — colonnes nom, type (prospect|client), site."
        actions={
          <>
            <button type="button" onClick={exportCsv} className={CRM_PRIMARY_BTN}>
              Exporter CSV
            </button>
            <label className={CRM_SECONDARY_BTN + " cursor-pointer"}>
              Charger un fichier
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setPreview(text);
                  runImport(text);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Import CSV</h3>
          <p className="text-sm text-muted-foreground">
            Colonnes : nom, type (prospect|client), site (libreville|port_gentil|franceville)
          </p>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            rows={8}
            placeholder={"Atlantic New,prospect,libreville"}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
          />
          <button type="button" className={CRM_PRIMARY_BTN} onClick={() => runImport(preview)}>
            Importer le texte
          </button>
          {errors.length > 0 ? (
            <ul className="text-xs text-danger">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Aperçu export</h3>
          <p className="text-sm text-muted-foreground">
            {companies.length} entreprises · {opportunities.length} opportunités · pipeline{" "}
            {currency(opportunities.reduce((s, o) => s + o.amount, 0))}
          </p>
          <p className="text-xs text-muted-foreground">
            Mapping : col. 1 = nom, col. 2 = type, col. 3 = site. Les lignes sans nom sont rejetées.
          </p>
        </section>
      </div>
    </div>
  );
}
