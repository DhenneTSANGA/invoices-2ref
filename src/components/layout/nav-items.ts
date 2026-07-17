import {
  LayoutDashboard, Users, FileText, ReceiptText, Package,
  Files, Archive, Settings, Bell, Search, UserCircle2, FileSignature,
} from "lucide-react";

export const primaryNav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Catalogue", icon: Package },
  { to: "/quotations", label: "Devis", icon: FileText },
  { to: "/invoices", label: "Factures", icon: ReceiptText },
  { to: "/proformas", label: "Pro forma", icon: FileSignature },
  { to: "/templates", label: "Modèles", icon: Files },
  { to: "/archive", label: "Archives", icon: Archive },
] as const;

export const secondaryNav = [
  { to: "/search", label: "Recherche", icon: Search },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profil", icon: UserCircle2 },
  { to: "/settings", label: "Paramètres", icon: Settings },
] as const;

export type NavItem = (typeof primaryNav)[number] | (typeof secondaryNav)[number];
