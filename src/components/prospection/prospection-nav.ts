import type { LucideIcon } from "lucide-react";
import type { NavIconMotion } from "@/components/layout/NavIcon";
import type { CrmRole } from "@/lib/prospection-access";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Columns3,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Megaphone,
  Settings,
  Star,
  Target,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

export type CrmNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconMotion?: NavIconMotion;
  roles: CrmRole[];
};

export const CRM_NAV: CrmNavItem[] = [
  { to: "/prospection", label: "Dashboard", icon: LayoutDashboard, iconMotion: "bounce", roles: ["manager", "direction", "chef_service", "collaborateur", "admin"] },
  { to: "/prospection/prospects", label: "Prospects", icon: Users, iconMotion: "pulse", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/clients", label: "Clients", icon: Building2, iconMotion: "tilt", roles: ["manager", "direction", "chef_service", "admin"] },
  { to: "/prospection/opportunites", label: "Opportunités", icon: Target, iconMotion: "bounce", roles: ["manager", "direction", "chef_service", "admin"] },
  { to: "/prospection/pipeline", label: "Pipeline", icon: Columns3, iconMotion: "tilt", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/activites", label: "Activités", icon: ListChecks, iconMotion: "pulse", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/agenda", label: "Agenda", icon: CalendarDays, iconMotion: "lift", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/portefeuille", label: "Portefeuille", icon: Landmark, iconMotion: "lift", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/strategiques", label: "Clients stratégiques", icon: Star, iconMotion: "bounce", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/port-gentil", label: "Port-Gentil", icon: MapPin, iconMotion: "tilt", roles: ["direction", "admin"] },
  { to: "/prospection/pistes", label: "Pistes internes", icon: Megaphone, iconMotion: "wiggle", roles: ["manager", "direction", "chef_service", "collaborateur", "admin"] },
  { to: "/prospection/budget", label: "Dépenses & budget", icon: Wallet, iconMotion: "bounce", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/objectifs", label: "Objectifs", icon: Target, iconMotion: "pulse", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/kpi", label: "Rapports & KPI", icon: BarChart3, iconMotion: "lift", roles: ["direction", "admin", "manager"] },
  { to: "/prospection/bibliotheque", label: "Bibliothèque", icon: BookOpen, iconMotion: "tilt", roles: ["manager", "direction", "chef_service", "collaborateur", "admin"] },
  { to: "/prospection/notifications", label: "Notifications", icon: Bell, iconMotion: "ring", roles: ["manager", "direction", "collaborateur", "admin"] },
  { to: "/prospection/import", label: "Import / export", icon: Upload, iconMotion: "lift", roles: ["manager", "direction", "admin"] },
  { to: "/prospection/admin", label: "Administration", icon: Settings, iconMotion: "spin", roles: ["direction", "admin"] },
];

export function crmNavFor(role: CrmRole) {
  return CRM_NAV.filter((i) => i.roles.includes(role));
}
