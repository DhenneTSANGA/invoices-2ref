import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Settings,
  Star,
  StickyNote,
  Target,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACTIVITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  COMPANY_SIZES,
  EXPENSE_APPROVAL_THRESHOLD,
  EXPENSE_LABELS,
  LIBRARY_CATEGORIES,
  LIBRARY_DOMAIN_LABELS,
  LIBRARY_DOMAINS,
  MANAGERS,
  OBJECTIVE_LABELS,
  SECTORS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  SITE_LABELS,
  SOURCE_LABELS,
  STAGE_ACTIVITY_KIND,
  STAGE_LABELS,
  STAGE_NEXT_PLACEHOLDER,
  STAGE_PROBABILITY,
  addBusinessDays,
  isoDate,
  type AccountPlan,
  type ActivityKind,
  type ActivityStatus,
  type Company,
  type CompanyKind,
  type ExpenseCategory,
  type Opportunity,
  type OpportunitySource,
  type PipelineStage,
  type LibraryDomain,
  type ReferentialKind,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";
import { cn } from "@/lib/utils";
import { CRM_FIELD, CrmDialog, CrmFormActions, CrmLabeledField, CrmSelect } from "./CrmUi";

function FormSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function CompanyDialog({
  open,
  onOpenChange,
  kind,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CompanyKind;
  editing?: Company | null;
}) {
  const upsertCompany = useProspectionDemoStore((s) => s.upsertCompany);
  const addContact = useProspectionDemoStore((s) => s.addContact);
  const extraSectors = useProspectionDemoStore((s) => s.referentials)
    .filter((r) => r.kind === "sector")
    .map((r) => r.label);
  const sectorOptions = [...SECTORS, ...extraSectors.filter((label) => !SECTORS.includes(label))];
  const isProspect = kind === "prospect";
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState("");
  const [site, setSite] = useState<Site | "">("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState<OpportunitySource | "">("");
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [managerId, setManagerId] = useState("");
  const [notes, setNotes] = useState("");
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDecisionMaker, setContactDecisionMaker] = useState(false);
  const [contactInfluence, setContactInfluence] = useState<"" | "faible" | "moyen" | "fort">("");
  const [strategic, setStrategic] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setSector(editing.sector);
      setSize(editing.size);
      setSite(editing.site);
      setAddress(editing.address);
      setPhone(editing.phone);
      setEmail(editing.email);
      setWebsite(editing.website);
      setSource(editing.source);
      setLines(
        editing.kind === "prospect"
          ? editing.targetLines
          : editing.servicesBought.length
            ? editing.servicesBought
            : editing.targetLines,
      );
      setManagerId(editing.managerId);
      setNotes(editing.notes);
      setStrategic(editing.strategic);
      setContactFirst("");
      setContactLast("");
      setContactRole("");
      setContactPhone("");
      setContactEmail("");
      setContactDecisionMaker(false);
      setContactInfluence("");
    } else {
      setName("");
      setSector("");
      setSize("");
      setSite("");
      setAddress("");
      setPhone("");
      setEmail("");
      setWebsite("");
      setSource("");
      setLines([]);
      setManagerId("");
      setNotes("");
      setStrategic(false);
      setContactFirst("");
      setContactLast("");
      setContactRole("");
      setContactPhone("");
      setContactEmail("");
      setContactDecisionMaker(false);
      setContactInfluence("");
    }
  }, [open, editing, isProspect]);

  const toggleLine = (line: ServiceLine) => {
    setLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line],
    );
  };

  const sources = isProspect
    ? (["nouveau", "piste_interne", "client_formation"] as OpportunitySource[])
    : (["client_existant", "client_formation", "piste_interne"] as OpportunitySource[]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Building2}
      wide
      className="sm:max-w-3xl"
      title={
        editing
          ? `Modifier ${editing.name}`
          : isProspect
            ? "Nouveau prospect"
            : "Nouveau client"
      }
      description={
        editing?.fromFacturation
          ? "Client Facturation : seuls les enrichissements CRM sont enregistrés ici (pas la fiche factu)."
          : editing
            ? "Mettez à jour l’identité, le suivi commercial et les notes de la fiche."
            : "Trois blocs : l’entreprise, le suivi commercial, puis le contact décideur si vous l’avez déjà."
      }
    >
      <form
        className="bg-muted/40"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            toast.error("Indiquez la raison sociale");
            return;
          }
          if (!sector || !size || !site || !source || !managerId) {
            toast.error("Secteur, taille, implantation, source et manager sont requis");
            return;
          }
          if (lines.length === 0) {
            toast.error("Choisissez au moins une ligne de service");
            return;
          }
          const hasContact = !editing && (contactFirst.trim() || contactLast.trim());
          if (hasContact && !contactInfluence) {
            toast.error("Indiquez le niveau d’influence du contact");
            return;
          }
          const id = editing?.id ?? `co-new-${Date.now()}`;
          const fromFacturation = Boolean(editing?.fromFacturation);
          void (async () => {
            try {
              const saved = await upsertCompany({
                id,
                name: name.trim(),
                kind: fromFacturation ? "client" : kind === "client" ? "prospect" : kind,
                sector,
                size,
                site,
                address: address.trim(),
                phone,
                email,
                website,
                managerId,
                servicesBought: isProspect || (!fromFacturation && kind === "client")
                  ? (editing?.servicesBought ?? [])
                  : lines,
                targetLines:
                  isProspect || (!fromFacturation && kind === "client")
                    ? lines
                    : (editing?.targetLines ?? []),
                source,
                strategic: isProspect ? false : strategic,
                caSigned: editing?.caSigned ?? 0,
                notes,
                plan: editing?.plan,
                fromFacturation,
                cabinet: editing?.cabinet,
              });
              if (hasContact && contactInfluence) {
                await addContact({
                  companyId: saved.id,
                  firstName: contactFirst.trim() || "—",
                  lastName: contactLast.trim() || "—",
                  role: contactRole.trim(),
                  phone: contactPhone.trim(),
                  email: contactEmail.trim(),
                  decisionMaker: contactDecisionMaker,
                  influence: contactInfluence,
                });
              }
              toast.success(
                editing?.fromFacturation
                  ? "Enrichissement CRM enregistré"
                  : editing
                    ? "Fiche mise à jour"
                    : isProspect || kind === "client"
                      ? "Prospect créé (les clients Facturation se synchronisent automatiquement)"
                      : "Fiche créée",
              );
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <FormSection
          icon={Building2}
          title="Entreprise"
          hint="Identité et coordonnées. La raison sociale, le secteur, la taille et l’implantation sont obligatoires."
        >
          <CrmLabeledField label="Raison sociale" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Banque de l’Habitat du Gabon"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CrmLabeledField label="Secteur" required>
              <CrmSelect
                value={sector}
                onChange={setSector}
                placeholder="Choisir le secteur"
                options={sectorOptions}
              />
            </CrmLabeledField>
            <CrmLabeledField label="Taille" required>
              <CrmSelect
                value={size}
                onChange={setSize}
                placeholder="Choisir la taille"
                options={COMPANY_SIZES}
              />
            </CrmLabeledField>
            <CrmLabeledField label="Implantation" required>
              <CrmSelect
                value={site}
                onChange={(value) => setSite(value as Site)}
                placeholder="Choisir le site"
                options={Object.entries(SITE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </CrmLabeledField>
            <CrmLabeledField label="Adresse">
              <span className="relative block">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, ville"
                  className={cn(CRM_FIELD, "pl-9")}
                />
              </span>
            </CrmLabeledField>
            <CrmLabeledField label="Téléphone">
              <span className="relative block">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+241 …"
                  className={cn(CRM_FIELD, "pl-9")}
                />
              </span>
            </CrmLabeledField>
            <CrmLabeledField label="E-mail">
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@entreprise.ga"
                  className={cn(CRM_FIELD, "pl-9")}
                />
              </span>
            </CrmLabeledField>
            <CrmLabeledField label="Site web" className="sm:col-span-2">
              <span className="relative block">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  className={cn(CRM_FIELD, "pl-9")}
                />
              </span>
            </CrmLabeledField>
          </div>
        </FormSection>
        <FormSection
          icon={Briefcase}
          title="Suivi commercial"
          hint="Qui porte le compte, d’où vient la relation, et quelles lignes sont visées."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CrmLabeledField label="Source" required>
              <CrmSelect
                value={source}
                onChange={(value) => setSource(value as OpportunitySource)}
                placeholder="Choisir la source"
                options={sources.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
              />
            </CrmLabeledField>
            <CrmLabeledField label="Manager référent" required>
              <CrmSelect
                value={managerId}
                onChange={setManagerId}
                placeholder="Choisir le manager"
                options={MANAGERS.map((m) => ({ value: m.id, label: m.name }))}
              />
            </CrmLabeledField>
          </div>
          {!isProspect ? (
            <button
              type="button"
              onClick={() => setStrategic((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                strategic
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border/70 bg-muted/30 hover:border-amber-500/30 hover:bg-amber-500/5",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  strategic ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <Star className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Client stratégique</span>
                <span className="block text-xs text-muted-foreground">À suivre de près, même sans affaire ouverte.</span>
              </span>
            </button>
          ) : null}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isProspect ? "Lignes ciblées" : "Services achetés"}
              <span className="ml-1 text-danger">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SERVICE_LINES.map((line) => {
                const on = lines.includes(line);
                return (
                  <button
                    key={line}
                    type="button"
                    onClick={() => toggleLine(line)}
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition",
                      on
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/15"
                        : "border-border/70 bg-muted/30 text-foreground hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    {SERVICE_LINE_LABELS[line]}
                  </button>
                );
              })}
            </div>
          </div>
          <CrmLabeledField label="Notes">
            <span className="relative block">
              <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Contexte, historique, points d’attention"
                className={cn(CRM_FIELD, "min-h-[88px] resize-y pl-9")}
              />
            </span>
          </CrmLabeledField>
        </FormSection>
        {!editing ? (
          <FormSection
            icon={UserRound}
            title="Contact décideur"
            hint="Optionnel. Si vous saisissez un nom, précisez aussi son niveau d’influence."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CrmLabeledField label="Prénom">
                <input
                  value={contactFirst}
                  onChange={(e) => setContactFirst(e.target.value)}
                  placeholder="Prénom"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Nom">
                <input
                  value={contactLast}
                  onChange={(e) => setContactLast(e.target.value)}
                  placeholder="Nom"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Fonction" className="sm:col-span-2">
                <input
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="DAF, DG, DRH…"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Téléphone">
                <span className="relative block">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+241 …"
                    className={cn(CRM_FIELD, "pl-9")}
                  />
                </span>
              </CrmLabeledField>
              <CrmLabeledField label="E-mail">
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="prenom@entreprise.ga"
                    className={cn(CRM_FIELD, "pl-9")}
                  />
                </span>
              </CrmLabeledField>
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Influence
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["faible", "Faible"],
                      ["moyen", "Moyen"],
                      ["fort", "Fort"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setContactInfluence(value)}
                      className={cn(
                        "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
                        contactInfluence === value
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/15"
                          : "border-border/70 bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setContactDecisionMaker((v) => !v)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                contactDecisionMaker
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/70 bg-muted/30 hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  contactDecisionMaker ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                )}
              >
                {contactDecisionMaker ? <span className="text-[11px] font-bold">✓</span> : null}
              </span>
              <span>
                <span className="block text-sm font-semibold">C’est le décideur</span>
                <span className="block text-xs text-muted-foreground">La personne qui signe ou arbitre la mission.</span>
              </span>
            </button>
          </FormSection>
        ) : null}
        </div>
        <div className="sticky bottom-0 z-10 border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur sm:px-5">
          <CrmFormActions
            className="border-0 p-0 pt-0"
            onCancel={() => onOpenChange(false)}
            submitLabel={editing ? "Enregistrer" : isProspect ? "Créer le prospect" : "Créer le client"}
          />
        </div>
      </form>
    </CrmDialog>
  );
}

export function NewLeadDialog({
  open,
  onOpenChange,
  defaultCompanyName = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyName?: string;
}) {
  const { companies } = useProspectionCompanies();
  const addLead = useProspectionDemoStore((s) => s.addLead);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [need, setNeed] = useState("");
  const [comment, setComment] = useState("");
  const [line, setLine] = useState<ServiceLine | "">("");
  const [ownerId, setOwnerId] = useState("");

  const matchedCompany = companies.find(
    (c) => c.name.toLowerCase() === companyName.trim().toLowerCase(),
  );
  const assignedManager = matchedCompany
    ? MANAGERS.find((m) => m.id === matchedCompany.managerId)
    : undefined;

  useEffect(() => {
    if (!open) return;
    setCompanyName(defaultCompanyName);
    setNeed("");
    setComment("");
    setLine("");
    const match = companies.find(
      (c) => c.name.toLowerCase() === defaultCompanyName.trim().toLowerCase(),
    );
    setOwnerId(match?.managerId ?? "");
  }, [open, defaultCompanyName, companies]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Megaphone}
      title="Signaler une piste"
      description="Attribution automatique au manager référent si l’entreprise est déjà en portefeuille."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!companyName.trim() || !need.trim() || !line) {
            toast.error("Client, besoin et ligne de service sont requis");
            return;
          }
          const resolvedOwner = matchedCompany?.managerId || ownerId;
          if (!resolvedOwner) {
            toast.error("Choisissez un manager — aucun référent trouvé pour cette entreprise");
            return;
          }
          void (async () => {
            try {
              await addLead({
                companyName: companyName.trim(),
                companyId: matchedCompany?.id,
                line,
                need: need.trim(),
                comment: comment.trim(),
                ownerId: resolvedOwner,
                author: "Vous",
              });
              toast.success(
                assignedManager
                  ? `Piste envoyée à ${assignedManager.name} (manager référent)`
                  : "Piste envoyée au manager",
              );
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Entreprise">
          <input
            list="crm-company-names"
            value={companyName}
            onChange={(e) => {
              const v = e.target.value;
              setCompanyName(v);
              const match = companies.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
              setOwnerId(match?.managerId ?? "");
            }}
            placeholder="Nom du client ou prospect"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <datalist id="crm-company-names">
          {companies.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <CrmLabeledField label="Besoin">
          <input
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="Besoin exprimé"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Ligne visée">
          <CrmSelect
            value={line}
            onChange={(value) => setLine(value as ServiceLine)}
            placeholder="Ligne de service"
            options={SERVICE_LINES.map((l) => ({ value: l, label: SERVICE_LINE_LABELS[l] }))}
          />
        </CrmLabeledField>
        {assignedManager ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
            Attribué au manager référent : <strong>{assignedManager.name}</strong>
          </p>
        ) : (
          <CrmLabeledField label="Manager">
            <CrmSelect
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Choisir un manager"
              options={MANAGERS.map((m) => ({ value: m.id, label: m.name }))}
            />
          </CrmLabeledField>
        )}
        <CrmLabeledField label="Commentaire">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Précision (optionnel)"
            rows={3}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Envoyer" />
      </form>
    </CrmDialog>
  );
}

export function NewExpenseDialog({
  open,
  onOpenChange,
  defaultCompanyId = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
}) {
  const { companies } = useProspectionCompanies();
  const activities = useProspectionDemoStore((s) => s.activities);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const addExpense = useProspectionDemoStore((s) => s.addExpense);
  const [managerId, setManagerId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [at, setAt] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [activityId, setActivityId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [receipt, setReceipt] = useState(false);

  const linkedActivities = companyId
    ? activities.filter((a) => a.companyId === companyId)
    : activities;
  const linkedOpps = companyId
    ? opportunities.filter((o) => o.companyId === companyId)
    : opportunities;

  useEffect(() => {
    if (!open) return;
    setManagerId("");
    setCategory("");
    setLabel("");
    setAmount("");
    setAt("");
    setCompanyId(defaultCompanyId);
    setActivityId("");
    setOpportunityId("");
    setReceipt(false);
  }, [open, defaultCompanyId]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Wallet}
      title="Nouvelle dépense"
      description={`Rattachée à une action. Justificatif photo obligatoire. Au-delà de ${EXPENSE_APPROVAL_THRESHOLD.toLocaleString("fr-FR")} FCFA, validation Direction.`}
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(amount.replace(/\s/g, "").replace(",", "."));
          if (!managerId || !category || !label.trim() || !Number.isFinite(n) || n <= 0) {
            toast.error("Manager, catégorie, libellé et montant sont requis");
            return;
          }
          if (!at) {
            toast.error("Indiquez la date de la dépense");
            return;
          }
          if (!activityId) {
            toast.error("Rattachez la dépense à une action commerciale");
            return;
          }
          if (!receipt) {
            toast.error("Justificatif photo obligatoire");
            return;
          }
          void (async () => {
            try {
              await addExpense({
                managerId,
                category,
                label: label.trim(),
                amount: Math.round(n),
                at,
                receipt,
                companyId: companyId || undefined,
                activityId,
                opportunityId: opportunityId || undefined,
              });
              toast.success(
                n > EXPENSE_APPROVAL_THRESHOLD
                  ? "Soumise à validation Direction"
                  : "Dépense enregistrée",
              );
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Manager">
          <CrmSelect
            value={managerId}
            onChange={setManagerId}
            placeholder="Qui a engagé la dépense"
            options={MANAGERS.map((m) => ({ value: m.id, label: m.name }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Catégorie">
          <CrmSelect
            value={category}
            onChange={(value) => setCategory(value as ExpenseCategory)}
            placeholder="Catégorie"
            options={(Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).map((c) => ({
              value: c,
              label: EXPENSE_LABELS[c],
            }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Libellé">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. déjeuner client, salon, taxi"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Montant (FCFA)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Date">
            <input type="date" value={at} onChange={(e) => setAt(e.target.value)} className={CRM_FIELD} />
          </CrmLabeledField>
        </div>
        <CrmLabeledField label="Prospect / client (si possible)">
          <CrmSelect
            value={companyId}
            onChange={(value) => {
              setCompanyId(value);
              setActivityId("");
              setOpportunityId("");
            }}
            placeholder="Aucun rattachement entreprise"
            emptyLabel="Aucun rattachement entreprise"
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Action commerciale">
          <CrmSelect
            value={activityId}
            onChange={(id) => {
              setActivityId(id);
              const act = activities.find((a) => a.id === id);
              if (act) {
                if (!companyId) setCompanyId(act.companyId);
                if (act.opportunityId) setOpportunityId(act.opportunityId);
              }
            }}
            placeholder="Rattacher à une action"
            options={linkedActivities.map((a) => ({
              value: a.id,
              label: `${ACTIVITY_LABELS[a.kind]} · ${a.title}`,
            }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Opportunité (optionnel)">
          <CrmSelect
            value={opportunityId}
            onChange={setOpportunityId}
            placeholder="Pas d’opportunité liée"
            emptyLabel="Pas d’opportunité liée"
            options={linkedOpps.map((o) => ({ value: o.id, label: o.title }))}
          />
        </CrmLabeledField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} />
          Justificatif photo joint (obligatoire)
        </label>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Enregistrer" />
      </form>
    </CrmDialog>
  );
}

export function NewActivityDialog({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultKind,
  defaultOpportunityId,
  completeActivityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultKind?: ActivityKind;
  defaultOpportunityId?: string;
  /** Complète une activité déjà planifiée (compte rendu) au lieu d’en créer une autre. */
  completeActivityId?: string;
}) {
  const { companies } = useProspectionCompanies();
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const activities = useProspectionDemoStore((s) => s.activities);
  const addActivity = useProspectionDemoStore((s) => s.addActivity);
  const updateActivity = useProspectionDemoStore((s) => s.updateActivity);
  const updateOpportunity = useProspectionDemoStore((s) => s.updateOpportunity);
  const completing = activities.find((a) => a.id === completeActivityId);
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [opportunityId, setOpportunityId] = useState(defaultOpportunityId ?? "");
  const [kind, setKind] = useState<ActivityKind | "">(defaultKind ?? "");
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionOn, setNextActionOn] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [at, setAt] = useState(isoDate());
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!open) return;
    if (completing) {
      setCompanyId(completing.companyId);
      setOpportunityId(completing.opportunityId ?? "");
      setKind(completing.kind);
      setSummary(completing.summary);
      setNextAction(completing.nextAction ?? "");
      setNextActionOn(completing.nextActionOn ?? "");
      setOwnerId(completing.ownerId);
      setStatus("terminee");
      setAt(completing.at);
      setTime(completing.time ?? "");
      return;
    }
    const planned = defaultKind === "rdv" || defaultKind === "evenement";
    setCompanyId(defaultCompanyId ?? "");
    setOpportunityId(defaultOpportunityId ?? "");
    setKind(defaultKind ?? "");
    setSummary("");
    setNextAction("");
    setNextActionOn("");
    setOwnerId("");
    setStatus(planned ? "planifiee" : "");
    setAt(isoDate());
    setTime("");
  }, [open, defaultCompanyId, defaultKind, defaultOpportunityId, completing]);

  const linkedOps = opportunities.filter((o) => o.companyId === companyId);
  const isRdv = kind === "rdv";
  const done = status === "terminee";

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={CalendarDays}
      title={completing ? "Compte rendu" : isRdv ? "Nouveau rendez-vous" : "Nouvelle activité"}
      description="Cahier : saisie en moins d’une minute — type, compte rendu, prochaine étape. Après un RDV, le CR sous 48 h."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!companyId || !kind || !status || !ownerId) {
            toast.error("Entreprise, type, statut et responsable sont requis");
            return;
          }
          if (done && !summary.trim()) {
            toast.error("Le compte rendu est requis pour une action terminée");
            return;
          }
          if (isRdv && done && (!nextAction.trim() || !nextActionOn)) {
            toast.error("Après un RDV, indiquez la prochaine action et sa date");
            return;
          }
          const company = companies.find((c) => c.id === companyId);
          const title = `${ACTIVITY_LABELS[kind]}${company ? ` — ${company.name}` : ""}`;
          void (async () => {
            try {
              if (completing) {
                await updateActivity(completing.id, {
                  summary: summary.trim(),
                  status: "terminee",
                  nextAction: nextAction.trim() || undefined,
                  nextActionOn: nextActionOn || undefined,
                  time: time || undefined,
                });
                if (completing.opportunityId && nextAction.trim()) {
                  await updateOpportunity(completing.opportunityId, {
                    nextAction: nextAction.trim(),
                    ...(nextActionOn ? { nextActionOn } : {}),
                  });
                }
                toast.success("Compte rendu enregistré");
                onOpenChange(false);
                return;
              }
              await addActivity({
                companyId,
                opportunityId: opportunityId || undefined,
                at,
                time: time || undefined,
                kind,
                title,
                summary: summary.trim() || title,
                nextAction: nextAction.trim() || undefined,
                nextActionOn: nextActionOn || undefined,
                ownerId,
                status,
              });
              toast.success("Activité enregistrée");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Entreprise">
          <CrmSelect
            value={companyId}
            onChange={(value) => {
              setCompanyId(value);
              setOpportunityId("");
            }}
            placeholder="Client ou prospect"
            options={companies.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.kind === "client" ? "client" : "prospect"})`,
            }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Opportunité (optionnel)">
          <CrmSelect
            value={opportunityId}
            onChange={setOpportunityId}
            placeholder="Sans affaire liée"
            emptyLabel="Sans affaire liée"
            options={linkedOps.map((o) => ({ value: o.id, label: o.title }))}
          />
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Type">
            <CrmSelect
              value={kind}
              onChange={(value) => {
                const next = value as ActivityKind;
                setKind(next);
                if (!status) {
                  setStatus(next === "rdv" || next === "evenement" ? "planifiee" : "terminee");
                }
              }}
              placeholder="Appel, e-mail, visite…"
              options={(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => ({
                value: k,
                label: ACTIVITY_LABELS[k],
              }))}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Statut">
            <CrmSelect
              value={status}
              onChange={(value) => setStatus(value as ActivityStatus)}
              placeholder="Planifiée ou terminée"
              options={(Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[]).map((s) => ({
                value: s,
                label: ACTIVITY_STATUS_LABELS[s],
              }))}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Date">
            <input type="date" value={at} onChange={(e) => setAt(e.target.value)} className={CRM_FIELD} />
          </CrmLabeledField>
          <CrmLabeledField label="Heure (optionnel)">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={CRM_FIELD} />
          </CrmLabeledField>
        </div>
        <CrmLabeledField label="Responsable">
          <CrmSelect
            value={ownerId}
            onChange={setOwnerId}
            placeholder="Manager"
            options={MANAGERS.map((m) => ({ value: m.id, label: m.name }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label={done ? "Compte rendu" : "Notes / ordre du jour"}>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={
              isRdv
                ? "Ce qui a été dit, besoins détectés…"
                : "Résultat de l’échange (cahier : CR sous 48 h après RDV)"
            }
            rows={3}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Prochaine action" className="sm:col-span-1">
            <input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ex. Envoyer la proposition"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Pour le">
            <input
              type="date"
              value={nextActionOn}
              onChange={(e) => setNextActionOn(e.target.value)}
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        </div>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Enregistrer" />
      </form>
    </CrmDialog>
  );
}

export function NewOpportunityDialog({
  open,
  onOpenChange,
  editing,
  defaultCompanyId,
  defaultLine,
  defaultSource,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultLine?: ServiceLine;
  defaultSource?: OpportunitySource;
  editing?: Opportunity | null;
}) {
  const { companies } = useProspectionCompanies();
  const addOpportunity = useProspectionDemoStore((s) => s.addOpportunity);
  const updateOpportunity = useProspectionDemoStore((s) => s.updateOpportunity);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [line, setLine] = useState<ServiceLine | "">("");
  const [source, setSource] = useState<OpportunitySource | "">("");
  const [amount, setAmount] = useState("");
  const [decisionOn, setDecisionOn] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionOn, setNextActionOn] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCompanyId(editing.companyId);
      setTitle(editing.title);
      setLine(editing.line);
      setSource(editing.source);
      setAmount(String(editing.amount));
      setDecisionOn(editing.decisionOn);
      setNextAction(editing.nextAction);
      setNextActionOn(editing.nextActionOn);
      setOwnerId(editing.ownerId);
      setNotes(editing.notes);
    } else {
      setCompanyId(defaultCompanyId ?? "");
      setTitle("");
      setLine(defaultLine ?? "");
      setSource(defaultSource ?? (defaultLine ? "client_existant" : ""));
      setAmount("");
      setDecisionOn(isoDate(45));
      setNextAction(STAGE_NEXT_PLACEHOLDER.qualification);
      setNextActionOn(isoDate(2));
      const co = companies.find((c) => c.id === defaultCompanyId);
      setOwnerId(co?.managerId ?? "");
      setNotes("");
    }
  }, [open, editing, defaultCompanyId, defaultLine, defaultSource, companies]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Target}
      wide
      title={editing ? "Modifier l’opportunité" : "Nouvelle opportunité"}
      description="Créée en Qualification. La prochaine action prépare l’étape suivante (Premier contact)."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!companyId || !title.trim() || !line || !source || !ownerId) {
            toast.error("Entreprise, intitulé, ligne, source et responsable sont requis");
            return;
          }
          if (!decisionOn) {
            toast.error("Indiquez la date de décision prévue");
            return;
          }
          if (!nextAction.trim() || !nextActionOn) {
            toast.error("Prochaine action et date sont obligatoires");
            return;
          }
          const n = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
          const payload = {
            companyId,
            title: title.trim(),
            line,
            source,
            stage: (editing?.stage ?? "qualification") as PipelineStage,
            amount: Math.round(n),
            probability: editing?.probability ?? STAGE_PROBABILITY.qualification ?? 20,
            decisionOn,
            nextAction: nextAction.trim(),
            nextActionOn,
            ownerId,
            notes: notes.trim(),
          };
          void (async () => {
            try {
              if (editing) {
                await updateOpportunity(editing.id, payload);
                toast.success("Opportunité mise à jour");
              } else {
                await addOpportunity(payload);
                toast.success("Opportunité créée à Qualification");
              }
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Entreprise">
          <CrmSelect
            value={companyId}
            onChange={(id) => {
              setCompanyId(id);
              const co = companies.find((c) => c.id === id);
              if (co && !editing) setOwnerId(co.managerId);
            }}
            placeholder="Client ou prospect"
            options={companies.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.kind === "client" ? "client" : "prospect"})`,
            }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Intitulé">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Intitulé de l’affaire"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Ligne de service">
            <CrmSelect
              value={line}
              onChange={(value) => setLine(value as ServiceLine)}
              placeholder="Ligne visée"
              options={SERVICE_LINES.map((l) => ({ value: l, label: SERVICE_LINE_LABELS[l] }))}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Source">
            <CrmSelect
              value={source}
              onChange={(value) => setSource(value as OpportunitySource)}
              placeholder="Origine"
              options={(Object.keys(SOURCE_LABELS) as OpportunitySource[]).map((s) => ({
                value: s,
                label: SOURCE_LABELS[s],
              }))}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Montant (FCFA)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant estimé"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Date de décision prévue">
            <input
              type="date"
              value={decisionOn}
              onChange={(e) => setDecisionOn(e.target.value)}
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Responsable">
            <CrmSelect
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Manager"
              options={MANAGERS.map((m) => ({ value: m.id, label: m.name }))}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Date prochaine action">
            <input
              type="date"
              value={nextActionOn}
              onChange={(e) => setNextActionOn(e.target.value)}
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        </div>
        <CrmLabeledField label="Prochaine action (vers l’étape suivante)">
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder={STAGE_NEXT_PLACEHOLDER.qualification}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexte (optionnel)"
            rows={2}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={editing ? "Enregistrer" : "Créer l’opportunité"}
        />
      </form>
    </CrmDialog>
  );
}

export function NewContactDialog({
  open,
  onOpenChange,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}) {
  const addContact = useProspectionDemoStore((s) => s.addContact);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [decisionMaker, setDecisionMaker] = useState(false);
  const [influence, setInfluence] = useState<"" | "faible" | "moyen" | "fort">("");

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setRole("");
      setPhone("");
      setEmail("");
      setDecisionMaker(false);
      setInfluence("");
    }
  }, [open]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={UserRound}
      title="Nouveau contact"
      description="Décideur, influenceur ou relais interne."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!firstName.trim() && !lastName.trim()) {
            toast.error("Nom requis");
            return;
          }
          if (!influence) {
            toast.error("Indiquez le niveau d’influence");
            return;
          }
          void (async () => {
            try {
              await addContact({
                companyId,
                firstName: firstName.trim() || "—",
                lastName: lastName.trim() || "—",
                role: role.trim(),
                phone: phone.trim(),
                email: email.trim(),
                decisionMaker,
                influence,
              });
              toast.success("Contact ajouté");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Prénom">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="Nom">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        </div>
        <CrmLabeledField label="Fonction">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Fonction"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Téléphone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Téléphone"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <CrmLabeledField label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={decisionMaker}
            onChange={(e) => setDecisionMaker(e.target.checked)}
          />
          Décideur
        </label>
        <CrmLabeledField label="Influence">
          <CrmSelect
            value={influence}
            onChange={(value) => setInfluence(value as "faible" | "moyen" | "fort")}
            placeholder="Faible, moyen ou fort"
            options={[
              { value: "faible", label: "Faible" },
              { value: "moyen", label: "Moyen" },
              { value: "fort", label: "Fort" },
            ]}
          />
        </CrmLabeledField>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Ajouter" />
      </form>
    </CrmDialog>
  );
}

export function AccountPlanDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}) {
  const setAccountPlan = useProspectionDemoStore((s) => s.setAccountPlan);
  const [plan, setPlan] = useState<AccountPlan>({
    stakes: "",
    objectives: "",
    decisionMakers: "",
    influencers: "",
    detectedNeeds: "",
    risks: "",
    feePotential: 0,
    nextMoves: "",
    strategy: "",
  });

  useEffect(() => {
    if (open && company) {
      setPlan(
        company.plan ?? {
          stakes: "",
          objectives: "",
          decisionMakers: "",
          influencers: "",
          detectedNeeds: "",
          risks: "",
          feePotential: 0,
          nextMoves: "",
          strategy: "",
        },
      );
    }
  }, [open, company]);

  if (!company) return null;

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Building2}
      wide
      title="Plan de compte"
      description={company.name}
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            try {
              await setAccountPlan(company.id, plan);
              toast.success("Plan de compte enregistré");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        {(
          [
            ["stakes", "Enjeux"],
            ["objectives", "Objectifs"],
            ["decisionMakers", "Décideurs"],
            ["influencers", "Influenceurs"],
            ["detectedNeeds", "Besoins détectés"],
            ["risks", "Risques"],
            ["nextMoves", "Prochaines actions"],
            ["strategy", "Stratégie"],
          ] as const
        ).map(([key, label]) => (
          <CrmLabeledField key={key} label={label}>
            <textarea
              value={plan[key]}
              onChange={(e) => setPlan((p) => ({ ...p, [key]: e.target.value }))}
              rows={2}
              placeholder={label}
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        ))}
        <CrmLabeledField label="Potentiel honoraires (FCFA)">
          <input
            value={plan.feePotential || ""}
            onChange={(e) =>
              setPlan((p) => ({ ...p, feePotential: Number(e.target.value.replace(/\s/g, "")) || 0 }))
            }
            placeholder="Potentiel honoraires"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Enregistrer" />
      </form>
    </CrmDialog>
  );
}

export function EditObjectivesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const objectives = useProspectionDemoStore((s) => s.objectives);
  const setObjectiveTarget = useProspectionDemoStore((s) => s.setObjectiveTarget);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDraft(Object.fromEntries(objectives.map((o) => [o.id, String(o.target)])));
    }
  }, [open, objectives]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Target}
      wide
      title="Modifier les cibles 8 semaines"
      description="Le réalisé reste calculé automatiquement."
    >
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            try {
              for (const o of objectives) {
                const n = Number(draft[o.id]);
                if (Number.isFinite(n) && n >= 0) await setObjectiveTarget(o.id, Math.round(n));
              }
              toast.success("Cibles mises à jour");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        {MANAGERS.map((m) => (
          <section key={m.id} className="space-y-2">
            <h3 className="text-sm font-semibold">{m.name}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {objectives
                .filter((o) => o.managerId === m.id)
                .map((o) => (
                  <label key={o.id} className="space-y-1 text-sm">
                    <span>{OBJECTIVE_LABELS[o.metric]}</span>
                    <input
                      value={draft[o.id] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                      className={CRM_FIELD}
                    />
                  </label>
                ))}
            </div>
          </section>
        ))}
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Enregistrer les cibles" />
      </form>
    </CrmDialog>
  );
}

export function NewLibraryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addLibraryItem = useProspectionDemoStore((s) => s.addLibraryItem);
  const [line, setLine] = useState<LibraryDomain | "">("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setLine("");
      setCategory("");
      setTitle("");
      setBody("");
    }
  }, [open]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={BookOpen}
      title="Ajouter une ressource"
      description="Lexique, cibles, argumentaires, questions, offres, e-mails, WhatsApp — par pôle."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!line || !category || !title.trim() || !body.trim()) {
            toast.error("Pôle, catégorie, titre et contenu sont requis");
            return;
          }
          void (async () => {
            try {
              await addLibraryItem({ line, category, title: title.trim(), body: body.trim() });
              toast.success("Ressource ajoutée");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Pôle">
          <CrmSelect
            value={line}
            onChange={(value) => setLine(value as LibraryDomain)}
            placeholder="Pôle"
            options={LIBRARY_DOMAINS.map((l) => ({ value: l, label: LIBRARY_DOMAIN_LABELS[l] }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Catégorie">
          <CrmSelect
            value={category}
            onChange={setCategory}
            placeholder="Type de ressource"
            options={LIBRARY_CATEGORIES}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Titre">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Contenu">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Texte à copier-coller"
            rows={5}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Ajouter" />
      </form>
    </CrmDialog>
  );
}

export function AddReferentialDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addReferential = useProspectionDemoStore((s) => s.addReferential);
  const [kind, setKind] = useState<ReferentialKind | "">("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (open) {
      setKind("");
      setLabel("");
    }
  }, [open]);

  const kindLabel: Record<ReferentialKind, string> = {
    line: "Ligne de service",
    stage: "Étape pipeline",
    site: "Implantation",
    expense: "Catégorie de dépense",
    sector: "Secteur",
  };

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Settings}
      title="Ajouter au référentiel"
      description="Valeur persistée pour l’espace Prospection."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kind || !label.trim()) {
            toast.error("Type et libellé requis");
            return;
          }
          void (async () => {
            try {
              await addReferential(kind, label.trim());
              toast.success("Ajouté au référentiel");
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        <CrmLabeledField label="Référentiel">
          <CrmSelect
            value={kind}
            onChange={(value) => setKind(value as ReferentialKind)}
            placeholder="Type de valeur"
            options={(Object.keys(kindLabel) as ReferentialKind[]).map((k) => ({
              value: k,
              label: kindLabel[k],
            }))}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Libellé">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nouvelle valeur"
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions onCancel={() => onOpenChange(false)} submitLabel="Ajouter" />
      </form>
    </CrmDialog>
  );
}

export function StageChangeDialog({
  open,
  onOpenChange,
  opportunityId,
  nextStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string | null;
  nextStage: PipelineStage | null;
}) {
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const { companies } = useProspectionCompanies();
  const advanceStage = useProspectionDemoStore((s) => s.advanceStage);
  const lastId = useRef(opportunityId);
  const lastStage = useRef(nextStage);
  if (opportunityId) lastId.current = opportunityId;
  if (nextStage) lastStage.current = nextStage;
  const activeId = opportunityId ?? lastId.current;
  const destination = nextStage ?? lastStage.current;
  const opportunity = opportunities.find((o) => o.id === activeId) ?? null;
  const company = opportunity ? companies.find((c) => c.id === opportunity.companyId) : null;
  const currentStage = opportunity?.stage ?? null;

  const [kind, setKind] = useState<ActivityKind>("appel");
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionOn, setNextActionOn] = useState(isoDate(2));
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    if (!open || !destination || !currentStage) return;
    setKind(STAGE_ACTIVITY_KIND[currentStage]);
    setSummary("");
    setNextAction(STAGE_NEXT_PLACEHOLDER[destination]);
    setLostReason("");
    if (destination === "reporte") setNextActionOn(isoDate(90));
    else if (destination === "proposition") setNextActionOn(addBusinessDays(isoDate(), 5));
    else if (destination === "rendez_vous") setNextActionOn(isoDate(2));
    else setNextActionOn(isoDate(2));
  }, [open, destination, currentStage]);

  const isOutcome = destination === "perdu" || destination === "reporte" || destination === "gagne";
  /** Qualification = étape d’entrée par défaut après conversion : pas de commentaire forcé. */
  const isEntryQualification = currentStage === "qualification";
  /** À partir de Premier contact : on note ce qui s’est passé à l’étape courante. */
  const commentRequired =
    !isEntryQualification && ((!isOutcome && currentStage !== null) || destination === "gagne");
  const fromLabel = currentStage ? STAGE_LABELS[currentStage] : null;
  const toLabel = destination ? STAGE_LABELS[destination] : null;

  const title =
    destination === "perdu"
      ? "Clôturer — Perdue"
      : destination === "reporte"
        ? "Clôturer — Reportée"
        : destination === "gagne"
          ? "Valider et gagner l’affaire"
          : isEntryQualification && toLabel
            ? `Passer en ${toLabel}`
            : fromLabel
              ? `Valider « ${fromLabel} »`
              : "Valider l’étape";

  const description =
    destination === "perdu"
      ? "Motif obligatoire. L’affaire reste en historique."
      : destination === "reporte"
        ? "Clôture temporaire : programmez la relance (3 mois par défaut)."
        : destination === "gagne"
          ? "Confirmez le gain avec un court commentaire, puis la suite (kick-off…)."
          : isEntryQualification && toLabel
            ? `La Qualification est l’étape d’entrée. Programmez la suite en « ${toLabel} » — le détail se notera ensuite.`
            : currentStage === "rendez_vous"
              ? "Compte rendu du rendez-vous obligatoire, puis passage à l’étape suivante."
              : currentStage === "proposition"
                ? "Tracez l’envoi de la proposition, puis la relance prévue."
                : fromLabel && toLabel
                  ? `Notez ce qui s’est passé en « ${fromLabel} », puis l’affaire passera en « ${toLabel} ».`
                  : "Notez ce qui s’est passé, puis avancez.";

  const commentLabel =
    currentStage === "rendez_vous"
      ? "Compte rendu du rendez-vous"
      : currentStage === "proposition"
        ? "Détail de l’envoi (proposition)"
        : fromLabel
          ? `Ce qui s’est passé — ${fromLabel}`
          : "Ce qui s’est passé";

  const commentPlaceholder =
    currentStage === "rendez_vous"
      ? "Compte rendu du rendez-vous (points clés, décisions…)"
      : currentStage === "proposition"
        ? "Proposition envoyée (version, destinataire…)"
        : currentStage === "premier_contact"
          ? "Contact établi, échanges, disponibilités…"
          : "Ce qui a été fait à cette étape";

  return (
    <CrmDialog open={open} onOpenChange={onOpenChange} icon={Target} title={title} description={description}>
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!opportunity || !destination || !currentStage) return;
          if (destination === "perdu" && !lostReason.trim()) {
            toast.error("Motif de perte obligatoire");
            return;
          }
          if (commentRequired && !summary.trim()) {
            toast.error(
              currentStage === "rendez_vous"
                ? "Compte rendu obligatoire après le rendez-vous"
                : currentStage === "proposition"
                  ? "Indiquez que la proposition a été envoyée"
                  : "Indiquez ce qui s’est passé à cette étape",
            );
            return;
          }
          if (destination !== "perdu" && (!nextAction.trim() || !nextActionOn)) {
            toast.error("Prochaine action et date obligatoires");
            return;
          }
          const label = STAGE_LABELS[destination];
          const activitySummary =
            destination === "perdu"
              ? lostReason.trim()
              : summary.trim() ||
                (isEntryQualification
                  ? `Entrée pipeline → ${label}`
                  : `Validation ${fromLabel ?? "étape"} → ${label}`);
          void (async () => {
            try {
              await advanceStage(opportunity.id, destination, {
                kind,
                title: isEntryQualification
                  ? `Passage ${fromLabel} → ${label} — ${opportunity.title}`
                  : `Validation ${fromLabel ?? "étape"} → ${label} — ${opportunity.title}`,
                summary: activitySummary,
                nextAction: destination === "perdu" ? "Conserver en historique" : nextAction.trim(),
                nextActionOn: destination === "perdu" ? isoDate() : nextActionOn,
                lostReason: destination === "perdu" ? lostReason.trim() : undefined,
                reviveOn: destination === "reporte" ? nextActionOn : undefined,
              });
              toast.success(
                destination === "perdu"
                  ? "Affaire clôturée (perdue)"
                  : destination === "reporte"
                    ? "Affaire reportée · relance notée"
                    : isEntryQualification
                      ? `Passée en ${label}`
                      : `${fromLabel} validée · ${label}`,
              );
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
            }
          })();
        }}
      >
        {company ? (
          <p className="text-sm text-muted-foreground">
            {company.name} · {opportunity?.title}
          </p>
        ) : null}
        {fromLabel && toLabel ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2.5 text-sm">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200">
              {fromLabel}
            </span>
            <span className="text-muted-foreground" aria-hidden>
              →
            </span>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              {toLabel}
            </span>
            <span className="w-full text-[11px] text-muted-foreground sm:ml-auto sm:w-auto">
              Étape validée → suivante
            </span>
          </div>
        ) : null}

        {destination === "perdu" ? (
          <CrmLabeledField label="Motif de perte" required>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              placeholder="Prix, concurrent, timing…"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        ) : (
          <>
            {!isEntryQualification ? (
              <>
                <CrmLabeledField label="Type d’action réalisée">
                  <CrmSelect
                    value={kind}
                    onChange={(value) => setKind(value as ActivityKind)}
                    placeholder="Type d’action"
                    options={(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => ({
                      value: k,
                      label: ACTIVITY_LABELS[k],
                    }))}
                  />
                </CrmLabeledField>
                <CrmLabeledField label={commentLabel} required={commentRequired}>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    placeholder={commentPlaceholder}
                    className={CRM_FIELD}
                  />
                </CrmLabeledField>
              </>
            ) : null}
            <CrmLabeledField
              label={toLabel ? `Prochaine action (en « ${toLabel} »)` : "Prochaine action"}
              required
            >
              <input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder={destination ? STAGE_NEXT_PLACEHOLDER[destination] : "Prochaine action"}
                className={CRM_FIELD}
              />
            </CrmLabeledField>
            <CrmLabeledField label="Date de cette action" required>
              <input
                type="date"
                value={nextActionOn}
                onChange={(e) => setNextActionOn(e.target.value)}
                className={CRM_FIELD}
              />
            </CrmLabeledField>
          </>
        )}

        <CrmFormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={
            destination === "perdu"
              ? "Confirmer la perte"
              : destination === "reporte"
                ? "Programmer la relance"
                : destination === "gagne"
                  ? "Confirmer le gain"
                  : isEntryQualification && toLabel
                    ? `Passer en ${toLabel}`
                    : fromLabel
                      ? `Valider et passer en ${toLabel}`
                      : "Valider et avancer"
          }
        />
      </form>
    </CrmDialog>
  );
}

export { STAGE_LABELS };
