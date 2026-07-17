import { StaffAvatar } from "@/components/common/StaffAvatar";
import type { StaffMember } from "@/store/types";

export function DocumentCreatorCard({ creator }: { creator?: StaffMember }) {
  if (!creator) return null;

  return (
    <div className="glass-panel rounded-3xl p-5">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Créé par
      </h4>
      <div className="mt-3 flex items-center gap-3">
        <StaffAvatar person={creator} size="lg" />
        <div className="min-w-0">
          <div className="font-display font-semibold truncate">
            {creator.firstName} {creator.lastName}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {creator.jobTitle}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {creator.email}
          </div>
          {creator.phone ? (
            <div className="text-xs text-muted-foreground">{creator.phone}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
