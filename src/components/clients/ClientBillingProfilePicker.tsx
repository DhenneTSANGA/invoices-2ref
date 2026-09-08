import {
  CLIENT_BILLING_HINTS,
  CLIENT_BILLING_LABELS,
  CLIENT_BILLING_PROFILES,
} from "@/lib/client-billing";
import type { ClientBillingProfile } from "@/store/types";
import { cn } from "@/lib/utils";

export function ClientBillingProfilePicker({
  value,
  onChange,
}: {
  value: ClientBillingProfile;
  onChange: (v: ClientBillingProfile) => void;
}) {
  return (
    <div className="col-span-full space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Type de client <span className="text-danger">*</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {CLIENT_BILLING_PROFILES.map((profile) => {
          const active = value === profile;
          return (
            <button
              key={profile}
              type="button"
              onClick={() => onChange(profile)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                active
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border/60 bg-surface hover:bg-muted",
              )}
            >
              <div className="text-sm font-semibold">
                {CLIENT_BILLING_LABELS[profile]}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {CLIENT_BILLING_HINTS[profile]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClientBillingBadge({
  profile,
  className,
}: {
  profile: ClientBillingProfile;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        profile === "subscription" && "bg-primary/15 text-primary",
        profile === "one_off" && "bg-muted text-muted-foreground",
        profile === "mixed" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      {CLIENT_BILLING_LABELS[profile]}
    </span>
  );
}
