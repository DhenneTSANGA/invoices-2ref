import {
  LayoutDashboard, Users, FileText, ReceiptText, Package,
  Files, Archive, Settings, Bell, Search, UserCircle2, FileSignature, FolderOpen, Mail, Shield, Globe,
} from "lucide-react";
import type { AppRole } from "@/lib/roles";
import { canAccessDashboard, canManageAdminRequests, isMember } from "@/lib/roles";

type NavDef = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[];
};

export const primaryNav: NavDef[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
  { to: "/home", label: "Accueil", icon: LayoutDashboard, roles: ["member"] },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Catalogue", icon: Package },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/quotations", label: "Devis", icon: FileText },
  { to: "/invoices", label: "Factures", icon: ReceiptText },
  { to: "/proformas", label: "Pro forma", icon: FileSignature },
  { to: "/lettre", label: "Lettres", icon: Mail },
  { to: "/templates", label: "Modèles", icon: Files },
  { to: "/archive", label: "Archives", icon: Archive },
  { to: "/users", label: "Équipe", icon: Shield, roles: ["admin", "super_admin"] },
];

export const secondaryNav: NavDef[] = [
  { to: "/", label: "Site public", icon: Globe },
  { to: "/search", label: "Recherche", icon: Search },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profil", icon: UserCircle2 },
  { to: "/settings", label: "Paramètres", icon: Settings, roles: ["admin", "super_admin"] },
];

export type NavItem = NavDef;

export function navForRole(items: NavDef[], role: AppRole): NavDef[] {
  return items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}

export function defaultHomeLabel(role: AppRole) {
  if (canAccessDashboard(role)) return "Tableau de bord";
  if (isMember(role)) return "Accueil";
  return "Accueil";
}

export function canSeeUsersNav(role: AppRole) {
  return canManageAdminRequests(role);
}
