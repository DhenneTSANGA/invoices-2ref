import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CRM_PRIMARY_BTN, CRM_SECONDARY_BTN } from "@/components/prospection/CrmUi";
import {
  SERVICE_LINE_LABELS,
  SITE_LABELS,
  managerName,
  type Company,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-model";
import { downloadXlsx, parsePastedTable, readSpreadsheet } from "@/lib/crm-export";
import { useProspectionStore } from "@/store/useProspectionStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";

export const Route = createFileRoute("/prospection/import")({
  head: () => ({ meta: [{ title: "Import / export — Prospection" }] }),
  component: ImportPage,
});

/** Colonnes reconnues (en-têtes insensibles à la casse et aux accents). */
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["nom", "raison sociale", "entreprise", "societe", "client"],
  kind: ["type", "statut"],
  sector: ["secteur", "activite"],
  size: ["taille", "effectif"],
  site: ["implantation", "site", "ville"],
  manager: ["manager", "manager referent", "referent", "responsable"],
  services: ["services achetes", "services", "lignes achetees"],
  targets: ["lignes visees", "besoins", "lignes ciblees"],
  phone: ["telephone", "tel"],
  email: ["email", "e-mail", "courriel"],
  ca: ["ca", "ca signe", "honoraires"],
};

const TEMPLATE_HEADERS = [
  "Nom",
  "Type",
  "Secteur",
  "Taille",
  "Implantation",
  "Manager",
  "Services achetés",
  "Lignes visées",
  "Téléphone",
  "E-mail",
  "CA signé",
];

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();
}

function parseSite(v: string): Site | null {
  const n = norm(v);
  if (!n) return "libreville";
  if (n.includes("port")) return "port_gentil";
  if (n.includes("france")) return "franceville";
  if (n.includes("libre")) return "libreville";
  return null;
}

const LINE_BY_LABEL = new Map<string, ServiceLine>(
  (Object.entries(SERVICE_LINE_LABELS) as [ServiceLine, string][]).flatMap(([key, label]) => [
    [norm(key), key],
    [norm(label), key],
  ]),
);

function parseLines(v: string): { lines: ServiceLine[]; unknown: string[] } {
  const lines: ServiceLine[] = [];
  const unknown: string[] = [];
  for (const part of v.split(/[;,/|]/).map((p) => p.trim()).filter(Boolean)) {
    const hit = LINE_BY_LABEL.get(norm(part));
    if (hit) {
      if (!lines.includes(hit)) lines.push(hit);
    } else unknown.push(part);
  }
  return { lines, unknown };
}

type ParseResult = { rows: Company[]; errors: string[]; duplicates: string[] };

function ImportPage() {
  const { session } = useRouteContext({ from: "/prospection" });
  const selfId = session.staff.id;
  const { companies } = useProspectionCompanies();
  const managers = useProspectionStore((s) => s.managers);
  const opportunities = useProspectionStore((s) => s.opportunities);
  const importCompanies = useProspectionStore((s) => s.importCompanies);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);

  function resolveManager(value: string): string | null {
    const n = norm(value);
    if (!n) return selfId;
    const hit = managers.find((m) => m.id === value.trim() || norm(m.name) === n);
    return hit?.id ?? null;
  }

  function parse(table: string[][]): ParseResult {
    const errors: string[] = [];
    const duplicates: string[] = [];
    if (table.length === 0) return { rows: [], errors: ["Fichier vide"], duplicates };

    const header = table[0].map(norm);
    const hasHeader = header.some((h) => COLUMN_ALIASES.name.includes(h));
    const index: Record<string, number> = {};
    if (hasHeader) {
      for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
        const i = header.findIndex((h) => aliases.includes(h));
        if (i >= 0) index[key] = i;
      }
    } else {
      // Sans en-tête : ordre du modèle.
      Object.keys(COLUMN_ALIASES).forEach((key, i) => (index[key] = i));
    }

    const known = new Set(companies.map((c) => norm(c.name)));
    const rows: Company[] = [];
    table.slice(hasHeader ? 1 : 0).forEach((cells, i) => {
      const lineNo = i + (hasHeader ? 2 : 1);
      const get = (key: string) => (index[key] !== undefined ? (cells[index[key]] ?? "") : "");
      const name = get("name").trim();
      if (!name) {
        errors.push(`Ligne ${lineNo} : nom manquant`);
        return;
      }
      if (known.has(norm(name))) {
        duplicates.push(name);
        return;
      }
      const site = parseSite(get("site"));
      if (!site) {
        errors.push(`Ligne ${lineNo} (${name}) : implantation « ${get("site")} » inconnue`);
        return;
      }
      const managerId = resolveManager(get("manager"));
      if (!managerId) {
        errors.push(`Ligne ${lineNo} (${name}) : manager « ${get("manager")} » introuvable`);
        return;
      }
      const services = parseLines(get("services"));
      const targets = parseLines(get("targets"));
      const unknownLines = [...services.unknown, ...targets.unknown];
      if (unknownLines.length > 0) {
        errors.push(`Ligne ${lineNo} (${name}) : ligne(s) inconnue(s) ${unknownLines.join(", ")}`);
        return;
      }
      known.add(norm(name));
      const kind = norm(get("kind")).startsWith("client") ? "client" : "prospect";
      rows.push({
        id: `import-${lineNo}`,
        name,
        kind,
        sector: get("sector").trim(),
        size: get("size").trim(),
        site,
        address: "",
        phone: get("phone").trim(),
        email: get("email").trim(),
        website: "",
        managerId,
        servicesBought: services.lines,
        targetLines: targets.lines,
        source: kind === "client" ? "client_existant" : "nouveau",
        strategic: false,
        caSigned: Number(get("ca").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0,
        notes: "Import fichier",
      });
    });
    return { rows, errors, duplicates };
  }

  async function runImport(rows: Company[]) {
    setBusy(true);
    try {
      await importCompanies(rows);
      toast.success(`${rows.length} entreprise(s) importée(s)`);
      setResult(null);
      setPasted("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import impossible");
    } finally {
      setBusy(false);
    }
  }

  const lineLabels = (lines: ServiceLine[]) => lines.map((l) => SERVICE_LINE_LABELS[l]).join(", ");

  const exportXlsx = () =>
    downloadXlsx("prospection-export.xlsx", [
      {
        name: "Entreprises",
        columns: [
          { header: "Nom", key: "name", width: 32 },
          { header: "Type", key: "kind", width: 10 },
          { header: "Secteur", key: "sector", width: 20 },
          { header: "Taille", key: "size", width: 16 },
          { header: "Implantation", key: "site", width: 14 },
          { header: "Manager", key: "manager", width: 22 },
          { header: "Services achetés", key: "services", width: 32 },
          { header: "Lignes visées", key: "targets", width: 32 },
          { header: "Téléphone", key: "phone", width: 16 },
          { header: "E-mail", key: "email", width: 26 },
          { header: "CA signé", key: "ca", width: 14 },
        ],
        rows: companies.map((c) => ({
          name: c.name,
          kind: c.kind,
          sector: c.sector,
          size: c.size,
          site: SITE_LABELS[c.site],
          manager: c.managerId ? managerName(c.managerId) : "",
          services: lineLabels(c.servicesBought),
          targets: lineLabels(c.targetLines),
          phone: c.phone,
          email: c.email,
          ca: c.caSigned,
        })),
      },
      {
        name: "Opportunités",
        columns: [
          { header: "Entreprise", key: "company", width: 32 },
          { header: "Titre", key: "title", width: 32 },
          { header: "Ligne", key: "line", width: 18 },
          { header: "Étape", key: "stage", width: 16 },
          { header: "Montant", key: "amount", width: 14 },
          { header: "Probabilité %", key: "probability", width: 14 },
          { header: "Manager", key: "manager", width: 22 },
          { header: "Prochaine action", key: "next", width: 32 },
          { header: "Échéance", key: "nextOn", width: 12 },
        ],
        rows: opportunities.map((o) => ({
          company: companies.find((c) => c.id === o.companyId)?.name ?? "",
          title: o.title,
          line: SERVICE_LINE_LABELS[o.line],
          stage: o.stage,
          amount: o.amount,
          probability: o.probability,
          manager: managerName(o.ownerId),
          next: o.nextAction,
          nextOn: o.nextActionOn,
        })),
      },
    ])
      .then(() => toast.success("Export Excel téléchargé"))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Export impossible"));

  const downloadTemplate = () =>
    downloadXlsx("modele-import-prospection.xlsx", [
      {
        name: "Import",
        columns: TEMPLATE_HEADERS.map((h) => ({ header: h, key: h, width: 20 })),
        rows: [
          {
            Nom: "Exemple SA",
            Type: "client",
            Secteur: "Banque",
            Taille: "51–200 salariés",
            Implantation: "Port-Gentil",
            Manager: managers[0]?.name ?? "",
            "Services achetés": "Formation, Comptabilité",
            "Lignes visées": "Fiscalité",
            Téléphone: "",
            "E-mail": "",
            "CA signé": 0,
          },
        ],
      },
    ]).catch((err) => toast.error(err instanceof Error ? err.message : "Téléchargement impossible"));

  return (
    <div>
      <PageHeader
        title="Import / export"
        subtitle="Fichier clients et prospects (Excel ou CSV), avec les services achetés. Export complet en Excel."
        actions={
          <>
            <button type="button" onClick={exportXlsx} className={CRM_PRIMARY_BTN}>
              <FileSpreadsheet className="h-4 w-4" />
              Exporter en Excel
            </button>
            <label className={CRM_SECONDARY_BTN + " cursor-pointer"}>
              <Upload className="h-4 w-4" />
              Charger un fichier
              <input
                type="file"
                accept=".xlsx,.csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setResult(parse(await readSpreadsheet(file)));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Lecture du fichier impossible");
                  }
                }}
              />
            </label>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Importer</h3>
          <p className="text-sm text-muted-foreground">
            Colonnes reconnues : {TEMPLATE_HEADERS.join(", ")}. Le manager se renseigne par son
            nom ; les services et lignes par leur libellé, séparés par des virgules. Les
            entreprises déjà connues sont ignorées.
          </p>
          <button type="button" onClick={downloadTemplate} className={CRM_SECONDARY_BTN}>
            Télécharger le modèle Excel
          </button>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder="Ou collez ici des lignes copiées depuis Excel (avec la ligne d’en-tête)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            className={CRM_SECONDARY_BTN}
            onClick={() => setResult(parse(parsePastedTable(pasted)))}
            disabled={!pasted.trim()}
          >
            Analyser le texte collé
          </button>
        </section>

        <section className="glass-panel space-y-3 rounded-3xl p-5">
          <h3 className="font-display font-semibold">Vérification avant import</h3>
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Chargez un fichier ou collez des lignes : le contrôle s’affiche ici avant tout
              enregistrement.
            </p>
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                <li>
                  <strong>{result.rows.length}</strong> entreprise(s) prête(s) à importer
                </li>
                <li className="text-muted-foreground">
                  {result.duplicates.length} déjà connue(s), ignorée(s)
                  {result.duplicates.length > 0
                    ? ` : ${result.duplicates.slice(0, 5).join(", ")}${result.duplicates.length > 5 ? "…" : ""}`
                    : ""}
                </li>
                <li className={result.errors.length > 0 ? "text-danger" : "text-muted-foreground"}>
                  {result.errors.length} ligne(s) en erreur
                </li>
              </ul>
              {result.errors.length > 0 ? (
                <ul className="max-h-40 overflow-y-auto rounded-xl bg-danger/5 p-2 text-xs text-danger">
                  {result.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                className={CRM_PRIMARY_BTN}
                disabled={busy || result.rows.length === 0}
                onClick={() => void runImport(result.rows)}
              >
                {busy ? "Import…" : `Importer ${result.rows.length} entreprise(s)`}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
