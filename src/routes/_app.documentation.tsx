import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Copy, Mail, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { staffDocumentationKey, useSession } from "@/hooks/use-data";
import { listStaffDocumentation } from "@/lib/admin.functions";
import { canAccessStaffDocumentation, roleLabel } from "@/lib/roles";
import { CABINET_LABELS } from "@/lib/cabinets";
import { CLIENT_POLE_LABELS, type ClientPole } from "@/lib/client-pole";
import { shortDate } from "@/lib/format";
import type { AppSession } from "@/lib/session.functions";

export const Route = createFileRoute("/_app/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — 2R Hub" },
      {
        name: "description",
        content: "Fiches des comptes collaborateurs créés (sans mot de passe).",
      },
    ],
  }),
  beforeLoad: ({ context }) => {
    const session = (context as { session?: NonNullable<AppSession> }).session;
    if (!session || !canAccessStaffDocumentation(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: DocumentationPage,
});

function DocumentationPage() {
  const { data: session } = useSession();
  const [q, setQ] = useState("");
  const { data: staff = [], isPending } = useQuery({
    queryKey: staffDocumentationKey,
    queryFn: () => listStaffDocumentation(),
    enabled: Boolean(session && canAccessStaffDocumentation(session.staff.role)),
    staleTime: 60_000,
  });

  if (isPending) {
    return (
      <LoadingState
        icon={BookOpen}
        title="Chargement de la documentation"
        description="Récupération des fiches collaborateurs…"
      />
    );
  }

  const term = q.trim().toLowerCase();
  const filtered = term
    ? staff.filter((s) =>
        `${s.firstName} ${s.lastName} ${s.email} ${s.jobTitleLabel} ${s.role} ${s.pole ?? ""}`
          .toLowerCase()
          .includes(term),
      )
    : staff;

  return (
    <div>
      <PageHeader
        title="Documentation"
        subtitle="Fiches des accès créés. Le mot de passe n’est jamais enregistré ici."
      />

      <div className="glass-panel mb-5 rounded-3xl p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un nom, un e-mail, un poste…"
            className="w-full rounded-2xl bg-transparent py-3 pl-11 pr-4 text-sm focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={staff.length === 0 ? "Aucune fiche pour le moment" : "Aucun résultat"}
          description={
            staff.length === 0
              ? "Quand vous créez un collaborateur, sa fiche (nom, e-mail, poste, cabinet) apparaît ici."
              : "Essayez un autre terme de recherche."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <StaffDocCard key={s.id} staff={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function StaffDocCard({
  staff,
}: {
  staff: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    jobTitleLabel: string;
    role: "member" | "admin" | "super_admin";
    cabinet: "conseil" | "expertise_fiscale" | null;
    pole: ClientPole | null;
    createdAt: string;
  };
}) {
  const cabinetLabel = staff.cabinet
    ? CABINET_LABELS[staff.cabinet]
    : "Tous les cabinets";
  const poleLabel = staff.pole ? CLIENT_POLE_LABELS[staff.pole] : "—";
  const summary = [
    `Nom : ${staff.firstName} ${staff.lastName}`,
    `E-mail : ${staff.email}`,
    staff.phone ? `Téléphone : ${staff.phone}` : null,
    `Poste : ${staff.jobTitleLabel}`,
    `Rôle : ${roleLabel(staff.role)}`,
    `Cabinet : ${cabinetLabel}`,
    `Pôle : ${poleLabel}`,
    `Créé le : ${shortDate(staff.createdAt)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <article className="glass-panel flex flex-col rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-snug">
            {staff.firstName} {staff.lastName}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Créé le {shortDate(staff.createdAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {roleLabel(staff.role)}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="E-mail" value={staff.email} />
        {staff.phone ? <Row label="Téléphone" value={staff.phone} /> : null}
        <Row label="Poste" value={staff.jobTitleLabel} />
        <Row label="Cabinet" value={cabinetLabel} />
        <Row label="Pôle" value={poleLabel} />
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <button
          type="button"
          onClick={() => void copy(staff.email, "E-mail")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Mail className="h-3.5 w-3.5" />
          Copier l’e-mail
        </button>
        <button
          type="button"
          onClick={() => void copy(summary, "Fiche")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copier la fiche
        </button>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
