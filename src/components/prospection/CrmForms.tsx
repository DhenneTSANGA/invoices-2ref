import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Megaphone,
  Settings,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACTIVITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  COMPANY_SIZES,
  EXPENSE_APPROVAL_THRESHOLD,
  EXPENSE_LABELS,
  LIBRARY_CATEGORIES,
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
  type ReferentialKind,
  type ServiceLine,
  type Site,
} from "@/lib/prospection-demo";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { cn } from "@/lib/utils";
import { CRM_FIELD, CrmDialog, CrmFormActions, CrmLabeledField } from "./CrmUi";

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
      title={
        editing
          ? `Modifier ${editing.name}`
          : isProspect
            ? "Nouveau prospect"
            : "Nouveau client"
      }
      description={
        editing
          ? "Mise à jour de la fiche (démo, non persistée en base)."
          : "Cahier : raison sociale, secteur, taille, implantation, source, ligne visée, contact décideur."
      }
    >
      <form
        className="space-y-6 p-5 sm:p-6"
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
          upsertCompany({
            id,
            name: name.trim(),
            kind,
            sector,
            size,
            site,
            address: address.trim(),
            phone,
            email,
            website,
            managerId,
            servicesBought: isProspect ? (editing?.servicesBought ?? []) : lines,
            targetLines: isProspect ? lines : (editing?.targetLines ?? []),
            source,
            strategic: isProspect ? false : strategic,
            caSigned: editing?.caSigned ?? 0,
            notes,
            plan: editing?.plan,
          });
          if (hasContact) {
            addContact({
              companyId: id,
              firstName: contactFirst.trim() || "—",
              lastName: contactLast.trim() || "—",
              role: contactRole.trim(),
              phone: contactPhone.trim(),
              email: contactEmail.trim(),
              decisionMaker: contactDecisionMaker,
              influence: contactInfluence,
            });
          }
          toast.success(editing ? "Fiche mise à jour" : isProspect ? "Prospect créé" : "Client créé");
          onOpenChange(false);
        }}
      >
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Entreprise
          </h3>
          <CrmLabeledField label="Raison sociale">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raison sociale"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CrmLabeledField label="Secteur">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className={cn(CRM_FIELD, !sector && "text-muted-foreground")}
              >
                <option value="" disabled>
                  Choisir le secteur
                </option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </CrmLabeledField>
            <CrmLabeledField label="Taille">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={cn(CRM_FIELD, !size && "text-muted-foreground")}
              >
                <option value="" disabled>
                  Choisir la taille
                </option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </CrmLabeledField>
            <CrmLabeledField label="Implantation">
              <select
                value={site}
                onChange={(e) => setSite(e.target.value as Site)}
                className={cn(CRM_FIELD, !site && "text-muted-foreground")}
              >
                <option value="" disabled>
                  Libreville ou Port-Gentil
                </option>
                {Object.entries(SITE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </CrmLabeledField>
            <CrmLabeledField label="Adresse">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresse"
                className={CRM_FIELD}
              />
            </CrmLabeledField>
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
            <CrmLabeledField label="Site web" className="sm:col-span-2">
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className={CRM_FIELD}
              />
            </CrmLabeledField>
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Commercial
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CrmLabeledField label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as OpportunitySource)}
                className={cn(CRM_FIELD, !source && "text-muted-foreground")}
              >
                <option value="" disabled>
                  Source (dont client formation)
                </option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </CrmLabeledField>
            <CrmLabeledField label="Manager référent">
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className={cn(CRM_FIELD, !managerId && "text-muted-foreground")}
              >
                <option value="" disabled>
                  Choisir le manager
                </option>
                {MANAGERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </CrmLabeledField>
          </div>
          {!isProspect ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={strategic} onChange={(e) => setStrategic(e.target.checked)} />
              Client stratégique
            </label>
          ) : null}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isProspect ? "Lignes ciblées" : "Services achetés"}
            </span>
            <div className="flex flex-wrap gap-2">
              {SERVICE_LINES.map((line) => {
                const on = lines.includes(line);
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
          <CrmLabeledField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contexte, historique, points d’attention"
              className={cn(CRM_FIELD, "min-h-[72px] resize-y")}
            />
          </CrmLabeledField>
        </section>
        {!editing ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
              Contact décideur (optionnel)
            </h3>
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
                  placeholder="Fonction"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Téléphone">
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Téléphone"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="E-mail">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="E-mail"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Influence">
                <select
                  value={contactInfluence}
                  onChange={(e) => setContactInfluence(e.target.value as "faible" | "moyen" | "fort")}
                  className={cn(CRM_FIELD, !contactInfluence && "text-muted-foreground")}
                >
                  <option value="" disabled>
                    Faible, moyen ou fort
                  </option>
                  <option value="faible">Faible</option>
                  <option value="moyen">Moyen</option>
                  <option value="fort">Fort</option>
                </select>
              </CrmLabeledField>
              <label className="flex items-center gap-2 text-sm self-end pb-2">
                <input
                  type="checkbox"
                  checked={contactDecisionMaker}
                  onChange={(e) => setContactDecisionMaker(e.target.checked)}
                />
                Décideur
              </label>
            </div>
          </section>
        ) : null}
        <CrmFormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={editing ? "Enregistrer" : isProspect ? "Créer le prospect" : "Créer le client"}
        />
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
  const companies = useProspectionDemoStore((s) => s.companies);
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
          addLead({
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
          <select
            value={line}
            onChange={(e) => setLine(e.target.value as ServiceLine)}
            className={cn(CRM_FIELD, !line && "text-muted-foreground")}
          >
            <option value="" disabled>
              Ligne de service
            </option>
            {SERVICE_LINES.map((l) => (
              <option key={l} value={l}>
                {SERVICE_LINE_LABELS[l]}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        {assignedManager ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
            Attribué au manager référent : <strong>{assignedManager.name}</strong>
          </p>
        ) : (
          <CrmLabeledField label="Manager">
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={cn(CRM_FIELD, !ownerId && "text-muted-foreground")}
            >
              <option value="" disabled>
                Choisir un manager
              </option>
              {MANAGERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
  const companies = useProspectionDemoStore((s) => s.companies);
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
          addExpense({
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
        }}
      >
        <CrmLabeledField label="Manager">
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className={cn(CRM_FIELD, !managerId && "text-muted-foreground")}
          >
            <option value="" disabled>
              Qui a engagé la dépense
            </option>
            {MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <CrmLabeledField label="Catégorie">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className={cn(CRM_FIELD, !category && "text-muted-foreground")}
          >
            <option value="" disabled>
              Catégorie
            </option>
            {(Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {EXPENSE_LABELS[c]}
              </option>
            ))}
          </select>
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
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setActivityId("");
              setOpportunityId("");
            }}
            className={cn(CRM_FIELD, !companyId && "text-muted-foreground")}
          >
            <option value="">Aucun rattachement entreprise</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <CrmLabeledField label="Action commerciale">
          <select
            value={activityId}
            onChange={(e) => {
              const id = e.target.value;
              setActivityId(id);
              const act = activities.find((a) => a.id === id);
              if (act) {
                if (!companyId) setCompanyId(act.companyId);
                if (act.opportunityId) setOpportunityId(act.opportunityId);
              }
            }}
            className={cn(CRM_FIELD, !activityId && "text-muted-foreground")}
          >
            <option value="" disabled>
              Rattacher à une action
            </option>
            {linkedActivities.map((a) => (
              <option key={a.id} value={a.id}>
                {ACTIVITY_LABELS[a.kind]} · {a.title}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <CrmLabeledField label="Opportunité (optionnel)">
          <select
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            className={cn(CRM_FIELD, !opportunityId && "text-muted-foreground")}
          >
            <option value="">Pas d’opportunité liée</option>
            {linkedOpps.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultKind?: ActivityKind;
  defaultOpportunityId?: string;
}) {
  const companies = useProspectionDemoStore((s) => s.companies);
  const opportunities = useProspectionDemoStore((s) => s.opportunities);
  const addActivity = useProspectionDemoStore((s) => s.addActivity);
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
  }, [open, defaultCompanyId, defaultKind, defaultOpportunityId]);

  const linkedOps = opportunities.filter((o) => o.companyId === companyId);
  const isRdv = kind === "rdv";
  const done = status === "terminee";

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={CalendarDays}
      title={isRdv ? "Nouveau rendez-vous" : "Nouvelle activité"}
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
          addActivity({
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
        }}
      >
        <CrmLabeledField label="Entreprise">
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setOpportunityId("");
            }}
            className={cn(CRM_FIELD, !companyId && "text-muted-foreground")}
          >
            <option value="" disabled>
              Client ou prospect
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.kind === "client" ? "client" : "prospect"})
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <CrmLabeledField label="Opportunité (optionnel)">
          <select
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            className={cn(CRM_FIELD, !opportunityId && "text-muted-foreground")}
          >
            <option value="">Sans affaire liée</option>
            {linkedOps.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Type">
            <select
              value={kind}
              onChange={(e) => {
                const next = e.target.value as ActivityKind;
                setKind(next);
                if (!status) {
                  setStatus(next === "rdv" || next === "evenement" ? "planifiee" : "terminee");
                }
              }}
              className={cn(CRM_FIELD, !kind && "text-muted-foreground")}
            >
              <option value="" disabled>
                Appel, e-mail, visite…
              </option>
              {(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
          </CrmLabeledField>
          <CrmLabeledField label="Statut">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus)}
              className={cn(CRM_FIELD, !status && "text-muted-foreground")}
            >
              <option value="" disabled>
                Planifiée ou terminée
              </option>
              {(Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ACTIVITY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </CrmLabeledField>
          <CrmLabeledField label="Date">
            <input type="date" value={at} onChange={(e) => setAt(e.target.value)} className={CRM_FIELD} />
          </CrmLabeledField>
          <CrmLabeledField label="Heure (optionnel)">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={CRM_FIELD} />
          </CrmLabeledField>
        </div>
        <CrmLabeledField label="Responsable">
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className={cn(CRM_FIELD, !ownerId && "text-muted-foreground")}
          >
            <option value="" disabled>
              Manager
            </option>
            {MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  defaultLine?: ServiceLine;
  editing?: Opportunity | null;
}) {
  const companies = useProspectionDemoStore((s) => s.companies);
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
      setSource(defaultLine ? "client_existant" : "");
      setAmount("");
      setDecisionOn("");
      setNextAction("");
      setNextActionOn("");
      const co = companies.find((c) => c.id === defaultCompanyId);
      setOwnerId(co?.managerId ?? "");
      setNotes("");
    }
  }, [open, editing, defaultCompanyId, defaultLine, companies]);

  return (
    <CrmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Target}
      wide
      title={editing ? "Modifier l’opportunité" : "Nouvelle opportunité"}
      description="Créée en Qualification. Canvas : entreprise, ligne, montant, date de décision, prochaine action."
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
          if (editing) {
            updateOpportunity(editing.id, payload);
            toast.success("Opportunité mise à jour");
          } else {
            addOpportunity(payload);
            toast.success("Opportunité créée à Qualification");
          }
          onOpenChange(false);
        }}
      >
        <CrmLabeledField label="Entreprise">
          <select
            value={companyId}
            onChange={(e) => {
              const id = e.target.value;
              setCompanyId(id);
              const co = companies.find((c) => c.id === id);
              if (co && !editing) setOwnerId(co.managerId);
            }}
            className={cn(CRM_FIELD, !companyId && "text-muted-foreground")}
          >
            <option value="" disabled>
              Client ou prospect
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.kind === "client" ? "client" : "prospect"})
              </option>
            ))}
          </select>
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
            <select
              value={line}
              onChange={(e) => setLine(e.target.value as ServiceLine)}
              className={cn(CRM_FIELD, !line && "text-muted-foreground")}
            >
              <option value="" disabled>
                Ligne visée
              </option>
              {SERVICE_LINES.map((l) => (
                <option key={l} value={l}>
                  {SERVICE_LINE_LABELS[l]}
                </option>
              ))}
            </select>
          </CrmLabeledField>
          <CrmLabeledField label="Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as OpportunitySource)}
              className={cn(CRM_FIELD, !source && "text-muted-foreground")}
            >
              <option value="" disabled>
                Origine
              </option>
              {(Object.keys(SOURCE_LABELS) as OpportunitySource[]).map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
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
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={cn(CRM_FIELD, !ownerId && "text-muted-foreground")}
            >
              <option value="" disabled>
                Manager
              </option>
              {MANAGERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
        <CrmLabeledField label="Prochaine action">
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Ex. appeler le DAF, envoyer un argumentaire"
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
          addContact({
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
          <select
            value={influence}
            onChange={(e) => setInfluence(e.target.value as "faible" | "moyen" | "fort")}
            className={cn(CRM_FIELD, !influence && "text-muted-foreground")}
          >
            <option value="" disabled>
              Faible, moyen ou fort
            </option>
            <option value="faible">Faible</option>
            <option value="moyen">Moyen</option>
            <option value="fort">Fort</option>
          </select>
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
          setAccountPlan(company.id, plan);
          toast.success("Plan de compte enregistré");
          onOpenChange(false);
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
          for (const o of objectives) {
            const n = Number(draft[o.id]);
            if (Number.isFinite(n) && n >= 0) setObjectiveTarget(o.id, Math.round(n));
          }
          toast.success("Cibles mises à jour");
          onOpenChange(false);
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
  const [line, setLine] = useState<ServiceLine | "">("");
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
      description="Cibles, argumentaires, questions de découverte, offres types, e-mails, WhatsApp."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!line || !category || !title.trim() || !body.trim()) {
            toast.error("Ligne, catégorie, titre et contenu sont requis");
            return;
          }
          addLibraryItem({ line, category, title: title.trim(), body: body.trim() });
          toast.success("Ressource ajoutée");
          onOpenChange(false);
        }}
      >
        <CrmLabeledField label="Ligne de service">
          <select
            value={line}
            onChange={(e) => setLine(e.target.value as ServiceLine)}
            className={cn(CRM_FIELD, !line && "text-muted-foreground")}
          >
            <option value="" disabled>
              Ligne
            </option>
            {SERVICE_LINES.map((l) => (
              <option key={l} value={l}>
                {SERVICE_LINE_LABELS[l]}
              </option>
            ))}
          </select>
        </CrmLabeledField>
        <CrmLabeledField label="Catégorie">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(CRM_FIELD, !category && "text-muted-foreground")}
          >
            <option value="" disabled>
              Type de ressource
            </option>
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
      description="Démo uniquement — pas d’écriture en base."
    >
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kind || !label.trim()) {
            toast.error("Type et libellé requis");
            return;
          }
          addReferential(kind, label.trim());
          toast.success("Ajouté au référentiel démo");
          onOpenChange(false);
        }}
      >
        <CrmLabeledField label="Référentiel">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReferentialKind)}
            className={cn(CRM_FIELD, !kind && "text-muted-foreground")}
          >
            <option value="" disabled>
              Type de valeur
            </option>
            {(Object.keys(kindLabel) as ReferentialKind[]).map((k) => (
              <option key={k} value={k}>
                {kindLabel[k]}
              </option>
            ))}
          </select>
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
  const companies = useProspectionDemoStore((s) => s.companies);
  const advanceStage = useProspectionDemoStore((s) => s.advanceStage);
  const lastId = useRef(opportunityId);
  const lastStage = useRef(nextStage);
  if (opportunityId) lastId.current = opportunityId;
  if (nextStage) lastStage.current = nextStage;
  const activeId = opportunityId ?? lastId.current;
  const activeStage = nextStage ?? lastStage.current;
  const opportunity = opportunities.find((o) => o.id === activeId) ?? null;
  const company = opportunity ? companies.find((c) => c.id === opportunity.companyId) : null;

  const [kind, setKind] = useState<ActivityKind>("appel");
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionOn, setNextActionOn] = useState(isoDate(2));
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    if (!open || !nextStage) return;
    setKind(STAGE_ACTIVITY_KIND[nextStage]);
    setSummary("");
    setNextAction("");
    setLostReason("");
    if (nextStage === "reporte") setNextActionOn(isoDate(90));
    else if (nextStage === "proposition") setNextActionOn(addBusinessDays(isoDate(), 5));
    else if (nextStage === "rendez_vous") setNextActionOn(isoDate(2));
    else setNextActionOn(isoDate(2));
  }, [open, nextStage]);

  const crRequired = activeStage === "rendez_vous" || activeStage === "proposition";
  const title = activeStage ? `Passer en ${STAGE_LABELS[activeStage]}` : "Changer d’étape";
  const description =
    activeStage === "rendez_vous"
      ? "Compte rendu obligatoire sous 48 h, puis prochaine action."
      : activeStage === "proposition"
        ? "Tracer l’envoi. Relance sous 5 jours ouvrés après un RDV concluant."
        : activeStage === "perdu"
          ? "Motif obligatoire. L’affaire reste en historique."
          : activeStage === "reporte"
            ? "Relance à 3 mois par défaut. Jamais de suppression."
            : "Enregistrer l’activité de cette étape et la prochaine action.";

  return (
    <CrmDialog open={open} onOpenChange={onOpenChange} icon={Target} title={title} description={description}>
      <form
        className="space-y-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!opportunity || !nextStage) return;
          if (nextStage === "perdu" && !lostReason.trim()) {
            toast.error("Motif de perte obligatoire");
            return;
          }
          if (crRequired && !summary.trim()) {
            toast.error(
              nextStage === "rendez_vous"
                ? "Compte rendu obligatoire après le rendez-vous"
                : "Indiquez que la proposition a été envoyée",
            );
            return;
          }
          if (!nextAction.trim() || !nextActionOn) {
            toast.error("Prochaine action et date obligatoires");
            return;
          }
          const label = STAGE_LABELS[nextStage];
          advanceStage(opportunity.id, nextStage, {
            kind,
            title: `${label} — ${opportunity.title}`,
            summary:
              summary.trim() ||
              (nextStage === "perdu"
                ? lostReason.trim()
                : `${label} pour ${company?.name ?? opportunity.title}`),
            nextAction: nextAction.trim(),
            nextActionOn,
            lostReason: nextStage === "perdu" ? lostReason.trim() : undefined,
            reviveOn: nextStage === "reporte" ? nextActionOn : undefined,
          });
          toast.success(`${label} · prochaine action notée`);
          onOpenChange(false);
        }}
      >
        {company ? (
          <p className="text-sm text-muted-foreground">
            {company.name} · {opportunity?.title}
          </p>
        ) : null}
        {activeStage === "perdu" ? (
          <CrmLabeledField label="Motif de perte">
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              placeholder="Prix, concurrent, timing…"
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <CrmLabeledField label="Type d’action">
            <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className={CRM_FIELD}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
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
        <CrmLabeledField label={crRequired ? "Compte rendu" : "Ce qui s’est passé"}>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder={
              activeStage === "rendez_vous"
                ? "Compte rendu du rendez-vous"
                : activeStage === "proposition"
                  ? "Proposition envoyée (version, destinataire…)"
                  : "Notes de l’étape"
            }
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmLabeledField label="Prochaine action">
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder={activeStage ? STAGE_NEXT_PLACEHOLDER[activeStage] : "Prochaine action"}
            className={CRM_FIELD}
          />
        </CrmLabeledField>
        <CrmFormActions
          onCancel={() => onOpenChange(false)}
          submitLabel={
            activeStage === "perdu"
              ? "Confirmer la perte"
              : activeStage === "reporte"
                ? "Programmer la relance"
                : "Enregistrer et avancer"
          }
        />
      </form>
    </CrmDialog>
  );
}

export { STAGE_LABELS };
