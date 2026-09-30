import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  ACTIVITY_LABELS,
  ACTIVITY_STATUS_LABELS,
  MANAGERS,
  managerName,
  type ActivityKind,
  type ActivityStatus,
} from "@/lib/prospection-demo";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/prospection/activites")({
  head: () => ({ meta: [{ title: "Activités — Prospection" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const companies = useProspectionDemoStore((s) => s.companies);
  const activities = useProspectionDemoStore((s) => s.activities);
  const addActivity = useProspectionDemoStore((s) => s.addActivity);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [kind, setKind] = useState<ActivityKind>("appel");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerId, setOwnerId] = useState(MANAGERS[0].id);
  const [status, setStatus] = useState<ActivityStatus>("terminee");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Activités" subtitle="Appels, e-mails, visites, RDV, relances — journal + prochaine action." />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <ul className="space-y-2">
          {activities.slice(0, 40).map((a) => {
            const co = companies.find((c) => c.id === a.companyId);
            return (
              <li key={a.id} className="glass-panel rounded-2xl px-4 py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{ACTIVITY_LABELS[a.kind]} · {co?.name}</span>
                  <span className="text-muted-foreground">{shortDate(a.at)} {a.time ?? ""}</span>
                </div>
                <p className="mt-1">{a.title} — {a.summary}</p>
                <p className="text-xs text-muted-foreground">{managerName(a.ownerId)} · {ACTIVITY_STATUS_LABELS[a.status]}</p>
              </li>
            );
          })}
        </ul>
        <form
          className="glass-panel space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addActivity({
              companyId,
              at: today,
              kind,
              title: title.trim(),
              summary: summary.trim() || title.trim(),
              ownerId,
              status,
            });
            setTitle("");
            setSummary("");
            toast.success("Activité enregistrée");
          }}
        >
          <h3 className="font-display font-semibold">Saisie rapide</h3>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((k) => (
              <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as ActivityStatus)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {(Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[]).map((s) => (
              <option key={s} value={s}>{ACTIVITY_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Compte rendu" rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="w-full rounded-2xl bg-gradient-primary py-2 text-sm font-medium text-primary-foreground">Enregistrer</button>
        </form>
      </div>
    </div>
  );
}
