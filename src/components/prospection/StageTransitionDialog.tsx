import { useEffect, useRef, useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { toast } from "sonner";
import {
  PIPELINE_STAGES,
  STAGE_ACTIVITY_KIND,
  STAGE_ADVANCE_LABEL,
  STAGE_LABELS,
  STAGE_NEXT_PLACEHOLDER,
  addBusinessDays,
  isoDate,
  type PipelineStage,
} from "@/lib/prospection-model";
import { useProspectionStore } from "@/store/useProspectionStore";
import { useProspectionCompanies } from "@/hooks/use-prospection-companies";
import { CRM_FIELD, CrmDialog, CrmFormActions, CrmLabeledField, CrmSelect } from "./CrmUi";

/**
 * Passage d’étape d’une opportunité, pour tous les cas : avancer (bouton unique de la
 * carte), sauter des étapes, revenir en arrière, clôturer (gagnée / perdue / reportée)
 * ou rouvrir une affaire perdue ou reportée. Les champs demandés dépendent des
 * étapes franchies : qualification (besoin, décideur, budget), compte rendu de RDV…
 */

export type StageTransition = { opportunityId: string; target: PipelineStage | "reopen" };

type Mode = "advance" | "skip" | "back" | "win" | "lost" | "postponed" | "reopen";

/** Ce que le manager note en validant chaque étape. */
const STAGE_NOTE: Partial<Record<PipelineStage, { label: string; placeholder: string }>> = {
  qualification: {
    label: "Contact établi",
    placeholder: "Avec qui, par quel canal, ce qui a été convenu…",
  },
  premier_contact: {
    label: "RDV obtenu",
    placeholder: "Interlocuteur, lieu, objet du rendez-vous…",
  },
  rendez_vous: {
    label: "Compte rendu du rendez-vous",
    placeholder: "Points clés, besoins exprimés, décisions, suite attendue…",
  },
  proposition: {
    label: "Proposition envoyée",
    placeholder: "Version, destinataire, montant proposé…",
  },
  negotiation: {
    label: "Accord trouvé",
    placeholder: "Honoraires retenus, conditions, interlocuteur…",
  },
  decision: {
    label: "Décision du client",
    placeholder: "Qui a validé, conditions, date de démarrage…",
  },
};

function stageIndex(stage: PipelineStage) {
  return stage === "gagne" ? PIPELINE_STAGES.length : PIPELINE_STAGES.indexOf(stage);
}

function modeFor(current: PipelineStage, target: PipelineStage | "reopen"): Mode {
  if (target === "reopen") return "reopen";
  if (target === "perdu") return "lost";
  if (target === "reporte") return "postponed";
  const from = stageIndex(current);
  const to = stageIndex(target);
  if (to < from) return "back";
  if (target === "gagne" && current !== "decision") return "win";
  return to === from + 1 ? "advance" : "skip";
}

function defaultNextDate(target: PipelineStage) {
  if (target === "proposition") return addBusinessDays(isoDate(), 5);
  if (target === "reporte" || target === "perdu") return isoDate(90);
  return isoDate(2);
}

export function StageTransitionDialog({
  transition,
  onClose,
}: {
  transition: StageTransition | null;
  onClose: () => void;
}) {
  const opportunities = useProspectionStore((s) => s.opportunities);
  const advanceStage = useProspectionStore((s) => s.advanceStage);
  const { companies } = useProspectionCompanies();

  // Garde le contenu pendant l’animation de fermeture.
  const last = useRef(transition);
  if (transition) last.current = transition;
  const active = transition ?? last.current;
  const opportunity = opportunities.find((o) => o.id === active?.opportunityId) ?? null;
  const company = opportunity ? companies.find((c) => c.id === opportunity.companyId) : null;
  const current = opportunity?.stage ?? null;
  const mode = current && active ? modeFor(current, active.target) : null;

  const [reopenStage, setReopenStage] = useState<PipelineStage>("qualification");
  const target: PipelineStage | null =
    !active ? null : active.target === "reopen" ? reopenStage : active.target;

  const [need, setNeed] = useState("");
  const [decider, setDecider] = useState("");
  const [budget, setBudget] = useState("");
  const [rdvReport, setRdvReport] = useState("");
  const [proposalNote, setProposalNote] = useState("");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionOn, setNextActionOn] = useState(isoDate(2));
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const open = Boolean(transition);
  useEffect(() => {
    if (!open || !active || !current) return;
    const t = active.target === "reopen" ? "qualification" : active.target;
    setReopenStage("qualification");
    setNeed("");
    setDecider("");
    setBudget("");
    setRdvReport("");
    setProposalNote("");
    setNote("");
    setNextAction(STAGE_NEXT_PLACEHOLDER[t]);
    setNextActionOn(defaultNextDate(t));
    savingRef.current = false;
    setSaving(false);
  }, [open, active, current]);

  if (!opportunity || !current || !mode || !target) {
    return (
      <CrmDialog open={open} onOpenChange={(v) => !v && onClose()} icon={Target} title="Étape">
        <div className="p-6 text-sm text-muted-foreground">Opportunité introuvable.</div>
      </CrmDialog>
    );
  }

  // Étapes franchies en avançant (de l’étape courante jusqu’à la cible, exclue).
  const crossed =
    mode === "advance" || mode === "skip" || mode === "win"
      ? PIPELINE_STAGES.slice(stageIndex(current), stageIndex(target))
      : [];
  const needsQualification = crossed.includes("identification");
  const needsRdvReport = crossed.includes("rendez_vous");
  const needsProposal = crossed.includes("proposition");
  const singleNote = mode === "advance" ? STAGE_NOTE[current] : undefined;
  // Note libre : retour arrière, réouverture, gain, report, ou saut sans bloc dédié.
  const generalNote =
    mode === "back" ||
    mode === "reopen" ||
    mode === "win" ||
    mode === "postponed" ||
    (mode === "skip" && !needsQualification && !needsRdvReport && !needsProposal);
  const noteRequired = mode !== "postponed";

  const from = STAGE_LABELS[current];
  const to = STAGE_LABELS[target];
  const title =
    mode === "advance"
      ? (STAGE_ADVANCE_LABEL[current] ?? `Valider ${from}`)
      : mode === "skip"
        ? `Passer directement en ${to}`
        : mode === "back"
          ? `Revenir en ${to}`
          : mode === "win"
            ? "Affaire gagnée"
            : mode === "lost"
              ? "Clôturer — affaire perdue"
              : mode === "postponed"
                ? "Reporter l’affaire"
                : "Rouvrir l’affaire";
  const description =
    mode === "advance"
      ? `L’affaire passera de « ${from} » à « ${to} ».`
      : mode === "skip"
        ? "Les étapes intermédiaires seront considérées comme faites : notez l’essentiel."
        : mode === "back"
          ? "Retour en arrière : indiquez pourquoi, il restera dans l’historique."
          : mode === "win"
            ? "Le montant sera ajouté au CA signé du client. Une affaire gagnée est définitive."
            : mode === "lost"
              ? "L’affaire reste en historique et sera proposée à la relance à la date choisie."
              : mode === "postponed"
                ? "Clôture temporaire : l’affaire vous sera rappelée à la date de relance."
                : "L’affaire reprend dans le pipeline à l’étape choisie.";

  const submit = async () => {
    const fail = (msg: string) => {
      toast.error(msg);
      return false;
    };
    if (needsQualification && (!need.trim() || !decider.trim() || !budget.trim())) {
      return fail("Besoin, décideur et budget sont obligatoires pour qualifier l’affaire");
    }
    if (needsRdvReport && !rdvReport.trim()) return fail("Compte rendu du rendez-vous obligatoire");
    if (needsProposal && !proposalNote.trim()) return fail("Indiquez ce qui a été envoyé");
    if (singleNote && !needsRdvReport && !needsProposal && !needsQualification && !note.trim()) {
      return fail(`Renseignez « ${singleNote.label} »`);
    }
    if (generalNote && noteRequired && !note.trim()) {
      return fail("Un commentaire est obligatoire");
    }
    if (mode === "lost" && !note.trim()) return fail("Motif de perte obligatoire");
    if (!nextAction.trim() || !nextActionOn) {
      return fail(
        mode === "lost" || mode === "postponed"
          ? "Date de relance obligatoire"
          : "Prochaine action et date obligatoires",
      );
    }

    const parts = [
      needsQualification
        ? `Besoin : ${need.trim()}\nDécideur : ${decider.trim()}\nBudget : ${budget.trim()}`
        : "",
      needsRdvReport ? `Compte rendu du RDV : ${rdvReport.trim()}` : "",
      needsProposal ? `Proposition envoyée : ${proposalNote.trim()}` : "",
      note.trim() ? (singleNote ? `${singleNote.label} : ${note.trim()}` : note.trim()) : "",
    ].filter(Boolean);
    const summary =
      parts.join("\n\n") ||
      (mode === "postponed" ? "Affaire reportée" : `${from} → ${to}`);

    const kind = needsRdvReport ? "rdv" : STAGE_ACTIVITY_KIND[current];
    const closing = mode === "lost" || mode === "postponed";

    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await advanceStage(opportunity.id, target, {
        kind,
        title: `${title} — ${opportunity.title}`,
        summary,
        nextAction: nextAction.trim(),
        nextActionOn,
        lostReason: mode === "lost" ? note.trim() : undefined,
        reviveOn: closing ? nextActionOn : undefined,
      });
      toast.success(
        mode === "lost"
          ? "Affaire clôturée (perdue) · relance notée"
          : mode === "postponed"
            ? "Affaire reportée · relance notée"
            : mode === "win"
              ? "Affaire gagnée 🎉"
              : mode === "reopen"
                ? `Affaire rouverte en ${to}`
                : `Affaire passée en ${to}`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const textarea = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    rows = 3,
  ) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={CRM_FIELD}
    />
  );

  return (
    <CrmDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      icon={Target}
      title={title}
      description={description}
    >
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
          <p className="truncate text-sm font-medium">
            {company?.name ?? "Entreprise"} · <span className="text-muted-foreground">{opportunity.title}</span>
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="rounded-full bg-background px-2.5 py-1 font-semibold text-muted-foreground shadow-sm">
              {from}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground shadow-sm">
              {to}
            </span>
          </div>
        </div>

        {mode === "reopen" ? (
          <CrmLabeledField label="Reprendre à l’étape" required>
            <CrmSelect
              value={reopenStage}
              onChange={(v) => {
                const st = v as PipelineStage;
                setReopenStage(st);
                setNextAction(STAGE_NEXT_PLACEHOLDER[st]);
                setNextActionOn(defaultNextDate(st));
              }}
              options={PIPELINE_STAGES.map((st) => ({ value: st, label: STAGE_LABELS[st] }))}
            />
          </CrmLabeledField>
        ) : null}

        {needsQualification ? (
          <div className="space-y-3 rounded-2xl border border-border/60 p-4">
            <p className="text-sm font-semibold">Qualification</p>
            <CrmLabeledField label="Besoin du client" required>
              <input
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                placeholder="Ex. externaliser la paie, mise en conformité fiscale…"
                className={CRM_FIELD}
              />
            </CrmLabeledField>
            <div className="grid gap-3 sm:grid-cols-2">
              <CrmLabeledField label="Décideur" required>
                <input
                  value={decider}
                  onChange={(e) => setDecider(e.target.value)}
                  placeholder="Nom et fonction"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
              <CrmLabeledField label="Budget" required>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Montant ou fourchette, « à définir »…"
                  className={CRM_FIELD}
                />
              </CrmLabeledField>
            </div>
          </div>
        ) : null}

        {needsRdvReport ? (
          <CrmLabeledField label="Compte rendu du rendez-vous" required>
            {textarea(rdvReport, setRdvReport, STAGE_NOTE.rendez_vous!.placeholder)}
          </CrmLabeledField>
        ) : null}

        {needsProposal ? (
          <CrmLabeledField label="Proposition envoyée" required>
            {textarea(proposalNote, setProposalNote, STAGE_NOTE.proposition!.placeholder, 2)}
          </CrmLabeledField>
        ) : null}

        {singleNote && !needsQualification && !needsRdvReport && !needsProposal ? (
          <CrmLabeledField label={singleNote.label} required>
            {textarea(note, setNote, singleNote.placeholder)}
          </CrmLabeledField>
        ) : null}

        {generalNote || mode === "lost" ? (
          <CrmLabeledField
            label={
              mode === "lost"
                ? "Motif de perte"
                : mode === "back"
                  ? `Pourquoi revenir en ${to} ?`
                  : mode === "reopen"
                    ? "Pourquoi rouvrir ?"
                    : mode === "postponed"
                      ? "Raison du report"
                      : mode === "win"
                        ? "Commentaire sur le gain"
                        : "Ce qui s’est passé"
            }
            required={noteRequired}
          >
            {textarea(
              note,
              setNote,
              mode === "lost"
                ? "Prix, concurrent, timing, pas de besoin…"
                : mode === "postponed"
                  ? "Budget gelé, décision repoussée…"
                  : "Quelques mots pour l’historique",
            )}
          </CrmLabeledField>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          {mode === "lost" || mode === "postponed" ? (
            <CrmLabeledField label="Action de relance" required>
              <input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className={CRM_FIELD}
              />
            </CrmLabeledField>
          ) : (
            <CrmLabeledField label={`Prochaine action (en ${to})`} required>
              <input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder={STAGE_NEXT_PLACEHOLDER[target]}
                className={CRM_FIELD}
              />
            </CrmLabeledField>
          )}
          <CrmLabeledField
            label={
              mode === "lost" || mode === "postponed"
                ? "Date de relance"
                : target === "rendez_vous"
                  ? "Date du rendez-vous"
                  : "Pour le"
            }
            required
          >
            <input
              type="date"
              value={nextActionOn}
              onChange={(e) => setNextActionOn(e.target.value)}
              className={CRM_FIELD}
            />
          </CrmLabeledField>
        </div>

        <CrmFormActions
          onCancel={onClose}
          pending={saving}
          submitLabel={
            mode === "lost"
              ? "Clôturer en perdue"
              : mode === "postponed"
                ? "Reporter"
                : mode === "win"
                  ? "Confirmer le gain"
                  : mode === "reopen"
                    ? "Rouvrir"
                    : mode === "back"
                      ? `Revenir en ${to}`
                      : `Passer en ${to}`
          }
        />
      </form>
    </CrmDialog>
  );
}
