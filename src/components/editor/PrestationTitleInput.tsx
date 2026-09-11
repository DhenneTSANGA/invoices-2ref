import { SuggestibleTextInput } from "@/components/editor/SuggestibleTextInput";
import { DEFAULT_PRESTATION_TITLES } from "@/lib/default-prestation-titles";

export function PrestationTitleInput({
  value,
  onChange,
  placeholder = "Titre général (ex. Audit fiscal)",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <SuggestibleTextInput
      className={className}
      value={value}
      onChange={onChange}
      options={DEFAULT_PRESTATION_TITLES}
      placeholder={placeholder}
      searchPlaceholder="Rechercher une prestation…"
      groupHeading="Prestations fréquentes"
      triggerTitle="Choisir une prestation"
      inputClassName="font-semibold"
    />
  );
}
