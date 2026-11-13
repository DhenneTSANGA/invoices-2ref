import { useEffect, useState } from "react";
import { FancySelect } from "@/components/common/FancySelect";
import {
  LETTER_SUBJECT_ABBREV_OPTIONS,
  normalizeSubjectAbbrev,
} from "@/lib/letter-ref";
import { cn } from "@/lib/utils";

const DEFAULT_CODE = "";
const OTHER_CODE = "__other__";

function choiceFor(abbrev: string): string {
  const code = normalizeSubjectAbbrev(abbrev);
  if (!code || code === "OBJ") return DEFAULT_CODE;
  return LETTER_SUBJECT_ABBREV_OPTIONS.some((o) => o.code === code)
    ? code
    : OTHER_CODE;
}

/**
 * Abrégé objet de la référence courrier : liste (FRM, DA, ODS…),
 * « OBJ » par défaut, ou saisie libre via « Autre ».
 */
export function LetterSubjectAbbrevSelect({
  value,
  onChange,
  selectClassName,
  inputClassName,
}: {
  /** Abrégé saisi (vide = OBJ). */
  value: string;
  onChange: (abbrev: string) => void;
  selectClassName?: string;
  inputClassName?: string;
}) {
  const [choice, setChoice] = useState(() => choiceFor(value));

  // Valeur externe (chargement d'un courrier existant) → resynchroniser le menu.
  useEffect(() => {
    setChoice((prev) => {
      const next = choiceFor(value);
      // Rester sur « Autre » tant que l'utilisateur saisit un abrégé libre.
      if (prev === OTHER_CODE && next === DEFAULT_CODE && !value) return prev;
      return next;
    });
  }, [value]);

  return (
    <>
      <FancySelect
        className={selectClassName}
        value={choice}
        onChange={(e) => {
          const next = e.target.value;
          setChoice(next);
          if (next === OTHER_CODE) {
            onChange(choiceFor(value) === OTHER_CODE ? value : "");
          } else {
            onChange(next);
          }
        }}
      >
        <option value={DEFAULT_CODE}>Par défaut (OBJ)</option>
        {LETTER_SUBJECT_ABBREV_OPTIONS.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label} ({o.code})
          </option>
        ))}
        <option value={OTHER_CODE}>Autre (saisie libre)</option>
      </FancySelect>
      {choice === OTHER_CODE ? (
        <input
          className={cn("mt-2", inputClassName)}
          value={value}
          placeholder="Ex. RDP (OBJ si vide)"
          autoFocus
          onChange={(e) => onChange(normalizeSubjectAbbrev(e.target.value))}
        />
      ) : null}
    </>
  );
}
