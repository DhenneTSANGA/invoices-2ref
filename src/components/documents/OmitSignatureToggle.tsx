import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/** Retire tampon / encadré d’attente — laisse une zone vide pour paraphe. */
export function OmitSignatureToggle({ checked, onCheckedChange, className }: Props) {
  return (
    <label
      className={cn("flex cursor-pointer items-center gap-2 text-xs font-medium", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      Retirer la signature
    </label>
  );
}
