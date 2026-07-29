import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { useServices, useSession, useUpsertService, useDeleteService } from "@/hooks/use-data";
import { canManageCatalog } from "@/lib/roles";
import { currency } from "@/lib/format";
import { serviceInputSchema } from "@/lib/auth-schemas";
import { humanAuthError } from "@/lib/auth-errors";
import type { z } from "zod";
import type { Service } from "@/store/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/services")({
  head: () => ({ meta: [{ title: "Catalogue des services — 2R Hub" }] }),
  component: ServicesPage,
});

type ServiceForm = z.infer<typeof serviceInputSchema>;

const emptyForm: ServiceForm = {
  code: "",
  name: "",
  description: "",
  unit: "prestation",
  unitPrice: 0,
  vatRate: 19.25,
  category: "",
};

function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const { data: session } = useSession();
  const upsert = useUpsertService();
  const remove = useDeleteService();

  const canManage = session ? canManageCatalog(session.staff.role) : false;

  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const filtered = services.filter((s) =>
    `${s.code} ${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase()),
  );

  const categories = [...new Set(services.map((s) => s.category))].sort();

  function openCreate() {
    setForm(emptyForm);
    setEditing(false);
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setForm({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      unit: s.unit,
      unitPrice: s.unitPrice,
      vatRate: s.vatRate,
      category: s.category,
    });
    setEditing(true);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = serviceInputSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    upsert.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(editing ? "Service mis à jour" : "Service créé");
        setDialogOpen(false);
      },
      onError: (err) => {
        toast.error(humanAuthError(err, "Impossible d'enregistrer le service."));
      },
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Service supprimé");
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(humanAuthError(err, "Impossible de supprimer ce service."));
        setDeleteTarget(null);
      },
    });
  }

  if (isLoading) {
    return (
      <LoadingState
        icon={Package}
        title="Chargement du catalogue"
        description="Préparation des prestations disponibles…"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Catalogue de services"
        subtitle={`${services.length} prestations disponibles`}
      />

      <div className="glass-panel mb-4 flex items-center gap-3 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher dans le catalogue…"
            className="w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center text-sm text-muted-foreground">
          {services.length === 0
            ? "Aucun service dans le catalogue. Cliquez sur « Ajouter » pour en créer un."
            : "Aucun résultat pour cette recherche."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -3 }}
              className="glass-panel group relative rounded-3xl p-5 hover:shadow-glow transition-shadow"
            >
              {canManage && (
                <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(s)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-accent text-accent-foreground">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-numeric text-muted-foreground">{s.code}</div>
                  <div className="font-semibold leading-tight">{s.name}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {s.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                  {s.category}
                </span>
                <div className="text-right">
                  <div className="font-numeric font-bold text-gradient-primary">
                    {currency(s.unitPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    par {s.unit} · TVA {s.vatRate}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Formulaire création / édition ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le service" : "Nouveau service"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v })}
                placeholder="EXP-001"
                required
              />
              <Field
                label="Catégorie"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                placeholder="Expertise"
                required
                list="cat-list"
              />
            </div>

            <Field
              label="Nom"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Audit fiscal annuel"
              required
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                placeholder="Description optionnelle…"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Unité"
                value={form.unit}
                onChange={(v) => setForm({ ...form, unit: v })}
                placeholder="prestation"
                required
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Prix unitaire
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.unitPrice || ""}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  TVA %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={form.vatRate}
                  onChange={(e) =>
                    setForm({ ...form, vatRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <datalist id="cat-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={upsert.isPending}
                className="rounded-xl bg-gradient-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {upsert.isPending
                  ? "Enregistrement…"
                  : editing
                    ? "Mettre à jour"
                    : "Créer"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation suppression ── */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le service <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})
              sera définitivement supprimé du catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  list?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        list={list}
        className="w-full rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
