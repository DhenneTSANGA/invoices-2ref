import {
  LayoutDashboard, Users, FileText, ReceiptText, Package,
  Files, Archive, Settings, Bell, Search, UserCircle2, FolderOpen, Mail, Shield, Globe, Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/roles";
import { canAccessDashboard, canManageAdminRequests, isMember } from "@/lib/roles";
import type { NavIconMotion } from "./NavIcon";

type NavDef = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconMotion?: NavIconMotion;
  roles?: AppRole[];
};

export const primaryNav: NavDef[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, iconMotion: "bounce", roles: ["admin", "super_admin"] },
  { to: "/home", label: "Accueil", icon: LayoutDashboard, iconMotion: "bounce", roles: ["member"] },
  { to: "/clients", label: "Clients", icon: Users, iconMotion: "pulse" },
  { to: "/services", label: "Catalogue", icon: Package, iconMotion: "bounce" },
  { to: "/documents", label: "Documents", icon: FolderOpen, iconMotion: "tilt" },
  { to: "/quotations", label: "Devis", icon: FileText, iconMotion: "tilt" },
  { to: "/invoices", label: "Factures", icon: ReceiptText, iconMotion: "lift" },
  { to: "/lettre", label: "Courriels", icon: Mail, iconMotion: "wiggle" },
  { to: "/mails", label: "Mails", icon: Inbox, iconMotion: "bounce" },
  { to: "/templates", label: "Modèles", icon: Files, iconMotion: "tilt" },
  { to: "/archive", label: "Archives", icon: Archive, iconMotion: "lift" },
  { to: "/users", label: "Équipe", icon: Shield, iconMotion: "pulse", roles: ["admin", "super_admin"] },
];

export const secondaryNav: NavDef[] = [
  { to: "https://2ref-expertise.vercel.app/", label: "Vitrine 2REF", icon: Globe, iconMotion: "spin" },
  { to: "/", label: "Vitrine 2RC", icon: Globe, iconMotion: "spin" },
  { to: "/search", label: "Recherche", icon: Search, iconMotion: "tilt" },
  { to: "/notifications", label: "Notifications", icon: Bell, iconMotion: "ring" },
  { to: "/profile", label: "Profil", icon: UserCircle2, iconMotion: "pulse" },
  { to: "/settings", label: "Paramètres", icon: Settings, iconMotion: "spin", roles: ["admin", "super_admin"] },
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
