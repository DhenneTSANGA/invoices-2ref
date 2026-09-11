import { useEffect, useMemo, useRef, useState } from "react";
import type { Cabinet } from "@/lib/cabinets";
import {
  abbrevForLetterSubject,
  buildLetterRef,
  isPredefinedLetterSubject,
  LETTER_LANGUAGES,
  LETTER_SERVICES,
  letterCabinetPrefix,
  letterCabinetSuffix,
  letterYearCode,
  normalizeSubjectAbbrev,
  parseLetterRef,
  resolveLetterSubjectAbbrev,
  type LetterLanguage,
  type LetterServiceCode,
} from "@/lib/letter-ref";
import { cn } from "@/lib/utils";

type Props = {
  cabinet: Cabinet;
  issueDate: string;
  subject: string;
  /** Réf actuelle (doc.number). */
  value: string;
  onChange: (number: string) => void;
  /** Compteur provisoire (création) ou figé (édition). */
  seq: number;
  className?: string;
};

export function LetterRefComposer({
  cabinet,
  issueDate,
  subject,
  value,
  onChange,
  seq,
  className,
}: Props) {
  const parsed = useMemo(() => parseLetterRef(value), [value]);
  const predefinedAbbrev = abbrevForLetterSubject(subject);
  const isPredefined = isPredefinedLetterSubject(subject);

  const [language, setLanguage] = useState<LetterLanguage>(
    parsed?.language ?? "CF",
  );
  const [service, setService] = useState<LetterServiceCode>(
    parsed?.service ?? "SA",
  );
  /** Saisie manuelle — ignorée si l'objet vient de la liste prédéfinie. */
  const [manualAbbrev, setManualAbbrev] = useState(
    parsed?.subjectAbbrev ?? "",
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lastEmittedRef = useRef(value);

  // Sync langue / service depuis la réf externe (chargement édition, n° séquence…)
  useEffect(() => {
    const p = parseLetterRef(value);
    if (!p) return;
    setLanguage((prev) => (prev === p.language ? prev : p.language));
    setService((prev) => (prev === p.service ? prev : p.service));
    lastEmittedRef.current = value;
  }, [value]);

  const wasPredefinedRef = useRef(isPredefined);

  // Réinitialiser l'abbré manuel seulement quand on quitte un objet prédéfini
  useEffect(() => {
    if (wasPredefinedRef.current && !isPredefined && !subject.trim()) {
      setManualAbbrev("");
    }
    wasPredefinedRef.current = isPredefined;
  }, [subject, isPredefined]);

  const effectiveAbbrev = resolveLetterSubjectAbbrev(subject, manualAbbrev);

  const composed = useMemo(
    () =>
      buildLetterRef({
        cabinet,
        language,
        seq: Math.max(1, seq),
        issueDate,
        subjectAbbrev: effectiveAbbrev,
        service,
      }),
    [cabinet, language, seq, issueDate, effectiveAbbrev, service],
  );

  useEffect(() => {
    if (composed === value) {
      lastEmittedRef.current = composed;
      return;
    }
    if (composed === lastEmittedRef.current) return;
    lastEmittedRef.current = composed;
    onChangeRef.current(composed);
  }, [composed, value]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Référence
        </div>
        <div className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-foreground break-all">
          {composed}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Langue
          </span>
          <select
            className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LetterLanguage)}
          >
            {LETTER_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Service
          </span>
          <select
            className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={service}
            onChange={(e) => setService(e.target.value as LetterServiceCode)}
          >
            {LETTER_SERVICES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label} ({s.code})
              </option>
            ))}
          </select>
        </label>

        {isPredefined ? (
          <div className="sm:col-span-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Abrégé objet (automatique)
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {predefinedAbbrev}
            </div>
          </div>
        ) : (
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Abrégé objet
            </span>
            <input
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={manualAbbrev}
              placeholder="Ex. RDP (OBJ si vide)"
              onChange={(e) =>
                setManualAbbrev(normalizeSubjectAbbrev(e.target.value))
              }
            />
            {subject.trim() ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Objet libre : saisissez l’abrégé pour la référence.
              </p>
            ) : null}
          </label>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Fixe : {letterCabinetPrefix(cabinet)} · n°{" "}
        {String(seq).padStart(3, "0")} · {letterYearCode(issueDate)} ·{" "}
        {letterCabinetSuffix(cabinet)}
      </p>
    </div>
  );
}
