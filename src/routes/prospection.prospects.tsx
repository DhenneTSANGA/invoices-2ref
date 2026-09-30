import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Building2, MapPin, Plus, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { LineBadge } from "@/components/prospection/ProspectionBadges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { currency, shortDate } from "@/lib/format";
import {
  MANAGERS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  SOURCE_LABELS,
  managerName,
  type OpportunitySource,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-demo";
import { cn } from "@/lib/utils";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";

export const Route = createFileRoute("/prospection/prospects")({
  head: () => ({ meta: [{ title: "Prospects — Prospection" }] }),
  component: ProspectsPage,
});

const SECTORS = [
  "Banque",
  "Énergie",
  "Santé",
  "Industrie",
  "Éducation",
  "Logistique",
  "Tourisme",
  "Assurance",
  "Agro",
  "Services",
  "Autre",
];

const SIZES = ["1–10 salariés", "11–50 salariés", "51–200 salariés", "200+ salariés"];

const SOURCE_OPTIONS: OpportunitySource[] = ["nouveau", "piste_interne", "client_formation"];

const FIELD =
  "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function ProspectsPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const contacts = useProspectionDemoStore((s) => s.contacts);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const upsertCompany = useProspectionDemoStore((s) => s.upsertCompany);
  const addContact = useProspectionDemoStore((s) => s.addContact);

  const [q, setQ] = useState("");
  const [siteFilter, setSiteFilter] = useState<"all" | Site>("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState<"all" | ServiceLine>("all");
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (c.kind !== "prospect") return false;
      if (siteFilter !== "all" && c.site !== siteFilter) return false;
      if (managerFilter !== "all" && c.managerId !== managerFilter) return false;
      if (lineFilter !== "all" && !c.targetLines.includes(lineFilter)) return false;
      if (!query) return true;
      const hay = `${c.name} ${c.sector} ${c.email} ${managerName(c.managerId)}`.toLowerCase();
      return hay.includes(query);
    });
  }, [companies, q, siteFilter, managerFilter, lineFilter]);

  const rows = useMemo(
    () =>
      list.map((c) => {
        const people = contacts.filter((ct) => ct.companyId === c.id);
        const primary =
          people.find((ct) => ct.decisionMaker) ?? people[0] ?? null;
        const ops = opportunities.filter((o) => o.companyId === c.id);
        const amount = ops.reduce((s, o) => s + o.amount, 0);
        const next = [...ops]
          .filter((o) => o.nextAction)
          .sort((a, b) => a.nextActionOn.localeCompare(b.nextActionOn))[0];
        const last = [...activities]
          .filter((a) => a.companyId === c.id)
          .sort((a, b) => b.at.localeCompare(a.at))[0];
        return { company: c, primary, amount, next, last };
      }),
    [list, contacts, opportunities, activities],
  );

  return (
    <div>
      <PageHeader
        title="Prospects"
        subtitle={`${companies.filter((c) => c.kind === "prospect").length} entreprises en cours de qualification`}
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Nouveau prospect
          </button>
        }
      />

      <div className="glass-panel mb-4 space-y-3 rounded-2xl p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une entreprise, un secteur, un manager…"
              className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value as "all" | Site)}
              className="rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
            >
              <option value="all">Tous les sites</option>
              {Object.entries(SITE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm"
            >
              <option value="all">Tous les managers</option>
              {MANAGERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={lineFilter === "all"} onClick={() => setLineFilter("all")}>
            Toutes les lignes
          </FilterChip>
          {SERVICE_LINES.map((line) => (
            <FilterChip
              key={line}
              active={lineFilter === line}
              onClick={() => setLineFilter(line)}
            >
              {SERVICE_LINE_LABELS[line]}
            </FilterChip>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun prospect"
          description="Ajustez la recherche ou créez une nouvelle entreprise."
          action={
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              + Nouveau prospect
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map(({ company: c, primary, amount, next, last }, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-panel rounded-3xl p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground shadow-glow">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/prospection/prospects/$id"
                      params={{ id: c.id }}
                      className="font-display font-semibold leading-tight hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {SITE_LABELS[c.site]}
                      <span>·</span>
                      {managerName(c.managerId)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.targetLines.map((l) => (
                        <LineBadge key={l} line={l} />
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold tabular-nums">
                    {amount ? currency(amount) : "—"}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Contact</div>
                    <div className="mt-0.5 font-medium">
                      {primary ? `${primary.firstName} ${primary.lastName}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Prochaine action</div>
                    <div className="mt-0.5 font-medium">
                      {next ? next.nextAction : "À planifier"}
                    </div>
                  </div>
                </div>
                {last ? (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Dernière activité le {shortDate(last.at)}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-border/60 md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Entreprise</th>
                  <th className="px-4 py-3.5 font-semibold">Contact</th>
                  <th className="hidden px-4 py-3.5 font-semibold xl:table-cell">Manager</th>
                  <th className="px-4 py-3.5 font-semibold">Potentiel</th>
                  <th className="hidden px-4 py-3.5 font-semibold lg:table-cell">Prochaine action</th>
                  <th className="hidden px-4 py-3.5 font-semibold xl:table-cell">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ company: c, primary, amount, next, last }) => (
                  <tr
                    key={c.id}
                    className="border-t border-border/40 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary/90 font-display text-xs font-bold text-primary-foreground">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to="/prospection/prospects/$id"
                            params={{ id: c.id }}
                            className="font-semibold hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {c.targetLines.map((l) => (
                              <LineBadge key={l} line={l} />
                            ))}
                            <span className="text-xs text-muted-foreground">{SITE_LABELS[c.site]}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {primary ? (
                        <div>
                          <div className="font-medium">
                            {primary.firstName} {primary.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{primary.role || "—"}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 xl:table-cell">{managerName(c.managerId)}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">
                      {amount ? currency(amount) : "—"}
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      {next ? (
                        <div>
                          <div className="font-medium">{next.nextAction}</div>
                          <div className="text-xs text-muted-foreground">{shortDate(next.nextActionOn)}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">À planifier</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground xl:table-cell">
                      {last ? shortDate(last.at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <NewProspectDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(payload) => {
          const id = `co-new-${Date.now()}`;
          upsertCompany({
            id,
            name: payload.name,
            kind: "prospect",
            sector: payload.sector,
            size: payload.size,
            site: payload.site,
            address: payload.address || SITE_LABELS[payload.site],
            phone: payload.phone,
            email: payload.email,
            website: payload.website,
            managerId: payload.managerId,
            servicesBought: [],
            targetLines: payload.lines,
            source: payload.source,
            strategic: false,
            caSigned: 0,
            notes: payload.notes,
          });
          if (payload.contactFirst.trim() || payload.contactLast.trim()) {
            addContact({
              companyId: id,
              firstName: payload.contactFirst.trim() || "—",
              lastName: payload.contactLast.trim() || "—",
              role: payload.contactRole.trim(),
              phone: payload.contactPhone.trim(),
              email: payload.contactEmail.trim(),
              decisionMaker: true,
              influence: "fort",
            });
          }
          toast.success("Prospect créé");
          setOpen(false);
        }}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type ProspectForm = {
  name: string;
  sector: string;
  size: string;
  site: Site;
  address: string;
  phone: string;
  email: string;
  website: string;
  source: OpportunitySource;
  lines: ServiceLine[];
  managerId: string;
  notes: string;
  contactFirst: string;
  contactLast: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
};

const emptyForm = (): ProspectForm => ({
  name: "",
  sector: "Services",
  size: SIZES[1],
  site: "libreville",
  address: "",
  phone: "",
  email: "",
  website: "",
  source: "nouveau",
  lines: ["conseil"],
  managerId: MANAGERS[0].id,
  notes: "",
  contactFirst: "",
  contactLast: "",
  contactRole: "",
  contactPhone: "",
  contactEmail: "",
});

function NewProspectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: ProspectForm) => void;
}) {
  const [form, setForm] = useState<ProspectForm>(emptyForm);

  const set = <K extends keyof ProspectForm>(key: K, value: ProspectForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleLine = (line: ServiceLine) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.includes(line) ? f.lines.filter((l) => l !== line) : [...f.lines, line],
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setForm(emptyForm());
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border/60 p-0 sm:max-w-2xl sm:rounded-3xl [&>button]:text-primary-foreground [&>button]:opacity-90 [&>button]:hover:opacity-100">
        <div className="relative overflow-hidden bg-gradient-primary px-6 py-6 text-primary-foreground">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Building2 className="h-5 w-5" />
            </span>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-display text-xl text-primary-foreground">
                Nouveau prospect
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                Fiche entreprise et contact principal. Vous pourrez compléter le reste ensuite.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form
          className="space-y-6 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Indiquez la raison sociale");
              return;
            }
            if (form.lines.length === 0) {
              toast.error("Choisissez au moins une ligne de service");
              return;
            }
            onCreate({ ...form, name: form.name.trim() });
            setForm(emptyForm());
          }}
        >
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Entreprise
            </h3>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                Raison sociale <span className="text-danger">*</span>
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex. Société ABC"
                className={FIELD}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Secteur</span>
                <select
                  value={form.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  className={FIELD}
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Taille</span>
                <select
                  value={form.size}
                  onChange={(e) => set("size", e.target.value)}
                  className={FIELD}
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Implantation</span>
                <select
                  value={form.site}
                  onChange={(e) => set("site", e.target.value as Site)}
                  className={FIELD}
                >
                  {Object.entries(SITE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Adresse</span>
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Quartier, ville"
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Téléphone</span>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+241 …"
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">E-mail</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contact@entreprise.ga"
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Site web</span>
                <input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://"
                  className={FIELD}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Commercial
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Origine</span>
                <select
                  value={form.source}
                  onChange={(e) => set("source", e.target.value as OpportunitySource)}
                  className={FIELD}
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Manager référent</span>
                <select
                  value={form.managerId}
                  onChange={(e) => set("managerId", e.target.value)}
                  className={FIELD}
                >
                  {MANAGERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                Lignes de service ciblées <span className="text-danger">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {SERVICE_LINES.map((line) => {
                  const on = form.lines.includes(line);
                  return (
                    <button
                      key={line}
                      type="button"
                      onClick={() => toggleLine(line)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold",
                        on
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {SERVICE_LINE_LABELS[line]}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder="Besoins identifiés, contexte…"
                className={cn(FIELD, "min-h-[72px] resize-y")}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Contact principal (optionnel)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Prénom</span>
                <input
                  value={form.contactFirst}
                  onChange={(e) => set("contactFirst", e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Nom</span>
                <input
                  value={form.contactLast}
                  onChange={(e) => set("contactLast", e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Fonction</span>
                <input
                  value={form.contactRole}
                  onChange={(e) => set("contactRole", e.target.value)}
                  placeholder="DG, DAF, DRH…"
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Téléphone</span>
                <input
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">E-mail</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  className={FIELD}
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" />
              Créer le prospect
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
