import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  LEAD_STATUS_LABELS,
  MANAGERS,
  SERVICE_LINE_LABELS,
  SERVICE_LINES,
  managerName,
  type LeadStatus,
  type ServiceLine,
} from "@/lib/prospection-demo";
import { LeadBadge, LineBadge } from "@/components/prospection/ProspectionBadges";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/prospection/pistes")({
  head: () => ({ meta: [{ title: "Pistes internes — Prospection" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const leads = useProspectionDemoStore((s) => s.leads);
  const addLead = useProspectionDemoStore((s) => s.addLead);
  const setLeadStatus = useProspectionDemoStore((s) => s.setLeadStatus);
  const convertLead = useProspectionDemoStore((s) => s.convertLead);
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [need, setNeed] = useState("");
  const [comment, setComment] = useState("");
  const [line, setLine] = useState<ServiceLine>("conseil");
  const [ownerId, setOwnerId] = useState(MANAGERS[0].id);

  return (
    <div>
      <PageHeader title="Pistes internes" subtitle="Tout collaborateur : Client → Besoin → Ligne → Envoyer. Conversion à Qualification." />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <ul className="space-y-2">
          {leads.map((l) => (
            <li key={l.id} className="glass-panel rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-display font-semibold">{l.companyName}</div>
                  <p className="text-muted-foreground">{l.need} — {l.comment}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortDate(l.at)} · {l.author} → {managerName(l.ownerId)}
                  </p>
                  <div className="mt-2"><LineBadge line={l.line} /></div>
                </div>
                <LeadBadge status={l.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLeadStatus(l.id, st)}
                    className="rounded-xl border border-border px-2 py-1 text-xs"
                  >
                    {LEAD_STATUS_LABELS[st]}
                  </button>
                ))}
                {l.status !== "convertie" ? (
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-primary px-2 py-1 text-xs text-primary-foreground"
                    onClick={() => {
                      convertLead(l.id);
                      toast.success("Convertie en opportunité (Qualification)");
                      void navigate({ to: "/prospection/pipeline" });
                    }}
                  >
                    Convertir
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <form
          className="glass-panel space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!companyName.trim() || !need.trim()) {
              toast.error("Client et besoin requis");
              return;
            }
            addLead({
              companyName: companyName.trim(),
              line,
              need: need.trim(),
              comment: comment.trim(),
              ownerId,
              author: "Vous",
            });
            setCompanyName("");
            setNeed("");
            setComment("");
            toast.success("Piste envoyée au manager");
          }}
        >
          <h3 className="font-display font-semibold">Signaler (moins d’1 min)</h3>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Client" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={need} onChange={(e) => setNeed(e.target.value)} placeholder="Besoin" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <select value={line} onChange={(e) => setLine(e.target.value as ServiceLine)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {SERVICE_LINES.map((l) => (
              <option key={l} value={l}>{SERVICE_LINE_LABELS[l]}</option>
            ))}
          </select>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {MANAGERS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire" rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="w-full rounded-2xl bg-gradient-primary py-2 text-sm font-medium text-primary-foreground">Envoyer</button>
        </form>
      </div>
    </div>
  );
}
