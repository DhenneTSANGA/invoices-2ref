import { cn } from "@/lib/utils";
import {
  TAX_STATUS_LABELS,
  MISSION_STATUS_LABELS,
  type MissionStatus,
  type TaxFileStatus,
} from "@/lib/dossier-demo";

const taxCls: Record<TaxFileStatus, string> = {
  a_preparer: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  en_cours: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  depose: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  valide: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  en_retard: "bg-red-600 text-white ring-1 ring-red-700",
};

const missionCls: Record<MissionStatus, string> = {
  planifiee: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  en_cours: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  terminee: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  en_pause: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export function TaxStatusBadge({
  status,
  className,
}: {
  status: TaxFileStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        taxCls[status],
        className,
      )}
    >
      {TAX_STATUS_LABELS[status]}
    </span>
  );
}

export function MissionStatusBadge({
  status,
  className,
}: {
  status: MissionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        missionCls[status],
        className,
      )}
    >
      {MISSION_STATUS_LABELS[status]}
    </span>
  );
}
