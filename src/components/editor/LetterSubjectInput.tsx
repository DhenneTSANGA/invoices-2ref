import { SuggestibleTextInput } from "@/components/editor/SuggestibleTextInput";
import { DEFAULT_LETTER_SUBJECTS } from "@/lib/default-letter-subjects";

export function LetterSubjectInput({
  value,
  onChange,
  placeholder = "Objet du courrier",
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <SuggestibleTextInput
      className={className}
      value={value}
      onChange={onChange}
      options={DEFAULT_LETTER_SUBJECTS}
      placeholder={placeholder}
      searchPlaceholder="Rechercher un objet…"
      groupHeading="Objets fréquents"
      triggerTitle="Choisir un objet"
      inputClassName={inputClassName}
    />
  );
}
