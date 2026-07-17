import { cn } from "@/lib/utils";
import { staffInitials } from "@/lib/auth";

export type StaffAvatarPerson = {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  jobTitle?: string;
};

export function StaffAvatar({
  person,
  size = "md",
  className,
  title,
}: {
  person: StaffAvatarPerson;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const dims =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  const label =
    title ??
    `${person.firstName} ${person.lastName}${person.jobTitle ? ` — ${person.jobTitle}` : ""}`;

  if (person.avatarUrl) {
    return (
      <img
        src={person.avatarUrl}
        alt={label}
        title={label}
        referrerPolicy="no-referrer"
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-background",
          dims,
          className,
        )}
      />
    );
  }

  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-primary font-semibold text-primary-foreground ring-2 ring-background",
        dims,
        className,
      )}
    >
      {staffInitials(person.firstName, person.lastName)}
    </span>
  );
}
