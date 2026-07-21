import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useClients, useDocuments } from "@/hooks/use-data";
import { FileText, ReceiptText, Users, Plus, LayoutDashboard, Settings, Archive, Package, Mails, Files } from "lucide-react";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: documents = [] } = useDocuments();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (to: string) => { onOpenChange(false); navigate({ to }); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher partout…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Actions rapides">
          <CommandItem onSelect={() => go("/invoices/new")}><Plus className="h-4 w-4" /> Nouvelle facture</CommandItem>
          <CommandItem onSelect={() => go("/quotations/new")}><Plus className="h-4 w-4" /> Nouveau devis</CommandItem>
          <CommandItem onSelect={() => go("/proformas/new")}><Plus className="h-4 w-4" /> Nouvelle pro forma</CommandItem>
          <CommandItem onSelect={() => go("/lettre/new")}><Plus className="h-4 w-4" /> Nouvelle lettre</CommandItem>
          <CommandItem onSelect={() => go("/lettre/publipostage")}><Mails className="h-4 w-4" /> Publipostage</CommandItem>
          <CommandItem onSelect={() => go("/clients/new")}><Plus className="h-4 w-4" /> Nouveau client</CommandItem>
          <CommandItem onSelect={() => go("/templates")}><Plus className="h-4 w-4" /> Modèles de documents</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}><LayoutDashboard className="h-4 w-4" /> Tableau de bord</CommandItem>
          <CommandItem onSelect={() => go("/documents")}><Files className="h-4 w-4" /> Tous les documents</CommandItem>
          <CommandItem onSelect={() => go("/clients")}><Users className="h-4 w-4" /> Clients</CommandItem>
          <CommandItem onSelect={() => go("/services")}><Package className="h-4 w-4" /> Catalogue</CommandItem>
          <CommandItem onSelect={() => go("/archive")}><Archive className="h-4 w-4" /> Archives</CommandItem>
          <CommandItem onSelect={() => go("/settings")}><Settings className="h-4 w-4" /> Paramètres</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Clients">
          {clients.slice(0, 6).map((c) => (
            <CommandItem key={c.id} value={`client ${c.name}`} onSelect={() => go(`/clients/${c.id}`)}>
              <Users className="h-4 w-4" /> {c.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Documents">
          {documents.slice(0, 8).map((d) => {
            const path =
              d.type === "invoice" ? `/invoices/${d.id}` :
              d.type === "quotation" ? `/quotations/${d.id}` :
              d.type === "proforma" ? `/proformas/${d.id}` :
              `/lettre/${d.id}`;
            return (
              <CommandItem key={d.id} value={`doc ${d.number}`} onSelect={() => go(path)}>
                {d.type === "invoice" ? <ReceiptText className="h-4 w-4" /> : <FileText className="h-4 w-4" />} {d.number}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
