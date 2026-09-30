import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Library, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClientPoleBadge } from "@/components/clients/ClientPolePicker";
import { TaxStatusBadge } from "@/components/dossier/DossierBadges";
import { useDossierDemoStore } from "@/store/useDossierDemoStore";
import {
  TAX_KIND_LABELS,
  TAX_STATUS_LABELS,
  type TaxFileStatus,
} from "@/lib/dossier-demo";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { memberCanSeePole } from "@/lib/staff-pole";
import { useSession } from "@/hooks/use-data";

export const Route = createFileRoute("/_app/dossiers/$id")({
  head: () => ({ meta: [{ title: "Dossier fiscal — 2R Hub" }] }),
  component: DossierDetailPage,
});

const STATUSES = Object.keys(TAX_STATUS_LABELS) as TaxFileStatus[];

function DossierDetailPage() {
  const { id } = Route.useParams();
  const { data: session } = useSession();
  const files = useDossierDemoStore((s) => s.files);
  const assets = useDossierDemoStore((s) => s.assets);
  const missions = useDossierDemoStore((s) => s.missions);
  const setFileStatus = useDossierDemoStore((s) => s.setFileStatus);
  const toggleDeadline = useDossierDemoStore((s) => s.toggleDeadline);

  const file = files.find((f) => f.id === id);
  if (!file || !memberCanSeePole(session?.staff, file.pole)) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center">
        Dossier introuvable.
        <div className="mt-4">
          <Link to="/dossiers" className="text-sm text-primary hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const relatedAssets = assets.filter(
    (a) => a.clientName === file.clientName,
  );
  const relatedMissions = missions.filter(
    (m) => m.clientName === file.clientName,
  );
  const done = file.deadlines.filter((d) => d.done).length;

  return (
    <div>
      <Link
        to="/dossiers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les dossiers
      </Link>
      <PageHeader
        title={file.clientName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{file.title}</span>
            <ClientPoleBadge pole={file.pole} />
            <TaxStatusBadge status={file.status} />
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Échéances</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {done}/{file.deadlines.length} réalisées — démo uniquement
            </p>
            <ul className="mt-4 space-y-2">
              {file.deadlines.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => toggleDeadline(file.id, d.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                      d.done
                        ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                        : "border-border/60 bg-surface hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border",
                        d.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border",
                      )}
                    >
                      {d.done ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="flex-1 font-medium">{d.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {shortDate(d.dueOn)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Notes</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {file.notes}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Type {TAX_KIND_LABELS[file.kind]} · exercice {file.year} · pilote{" "}
              {file.manager}
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Statut (démo)</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFileStatus(file.id, st)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-medium",
                    file.status === st
                      ? "bg-gradient-primary text-primary-foreground"
                      : "border border-border bg-surface hover:bg-muted",
                  )}
                >
                  {TAX_STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <Library className="h-4 w-4" /> Pièces GED
            </h3>
            {relatedAssets.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Aucune pièce.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {relatedAssets.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span className={a.missing ? "text-danger" : ""}>
                      {a.name}
                    </span>
                    {a.missing ? (
                      <span className="text-[10px] font-semibold uppercase text-danger">
                        manquant
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/ged"
              search={{ q: file.clientName }}
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ouvrir la GED
            </Link>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <CalendarClock className="h-4 w-4" /> Missions
            </h3>
            {relatedMissions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Aucune mission.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {relatedMissions.map((m) => (
                  <li key={m.id}>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.owner}</div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/missions"
              search={{ q: file.clientName }}
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Voir le planning
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
