import type { LucideIcon } from "lucide-react";
import type { NavIconMotion } from "@/components/layout/NavIcon";
import type { CrmRole } from "@/lib/prospection-access";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
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

export type CrmNavGroupId =
  | "today"
  | "captation"
  | "pipeline"
  | "actions"
  | "portefeuille"
  | "pilotage"
  | "settings";

export type CrmNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconMotion?: NavIconMotion;
  roles: CrmRole[];
  group: CrmNavGroupId;
};

/** Ordre du cycle commercial (cahier : captation → pipeline → actions → portefeuille). */
export const CRM_NAV_GROUPS: { id: CrmNavGroupId; label: string }[] = [
  { id: "today", label: "Aujourd’hui" },
  { id: "captation", label: "1. Captation" },
  { id: "pipeline", label: "2. Pipeline" },
  { id: "actions", label: "3. Actions" },
  { id: "portefeuille", label: "4. Portefeuille" },
  { id: "pilotage", label: "5. Pilotage" },
  { id: "settings", label: "Réglages" },
];

export const CRM_NAV: CrmNavItem[] = [
  {
    to: "/prospection",
    label: "Dashboard",
    icon: LayoutDashboard,
    iconMotion: "bounce",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "today",
  },
  {
    to: "/prospection/pistes",
    label: "Pistes internes",
    icon: Megaphone,
    iconMotion: "wiggle",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "captation",
  },
  {
    to: "/prospection/prospects",
    label: "Prospects",
    icon: Users,
    iconMotion: "pulse",
    roles: ["manager", "direction", "admin"],
    group: "captation",
  },
  {
    to: "/prospection/opportunites",
    label: "Opportunités",
    icon: Target,
    iconMotion: "bounce",
    roles: ["manager", "direction", "chef_service", "admin"],
    group: "pipeline",
  },
  {
    to: "/prospection/activites",
    label: "Activités",
    icon: ListChecks,
    iconMotion: "pulse",
    roles: ["manager", "direction", "admin"],
    group: "actions",
  },
  {
    to: "/prospection/agenda",
    label: "Agenda",
    icon: CalendarDays,
    iconMotion: "lift",
    roles: ["manager", "direction", "admin"],
    group: "actions",
  },
  {
    to: "/prospection/bibliotheque",
    label: "Bibliothèque",
    icon: BookOpen,
    iconMotion: "tilt",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "actions",
  },
  {
    to: "/prospection/clients",
    label: "Clients",
    icon: Building2,
    iconMotion: "tilt",
    roles: ["manager", "direction", "chef_service", "admin"],
    group: "portefeuille",
  },
  {
    to: "/prospection/portefeuille",
    label: "Portefeuille",
    icon: Landmark,
    iconMotion: "lift",
    roles: ["manager", "direction", "admin"],
    group: "portefeuille",
  },
  {
    to: "/prospection/strategiques",
    label: "Clients stratégiques",
    icon: Star,
    iconMotion: "bounce",
    roles: ["manager", "direction", "admin"],
    group: "portefeuille",
  },
  {
    to: "/prospection/port-gentil",
    label: "Port-Gentil",
    icon: MapPin,
    iconMotion: "tilt",
    roles: ["direction", "admin"],
    group: "portefeuille",
  },
  {
    to: "/prospection/objectifs",
    label: "Objectifs",
    icon: Target,
    iconMotion: "pulse",
    roles: ["manager", "direction", "admin"],
    group: "pilotage",
  },
  {
    to: "/prospection/budget",
    label: "Dépenses & budget",
    icon: Wallet,
    iconMotion: "bounce",
    roles: ["manager", "direction", "admin"],
    group: "pilotage",
  },
  {
    to: "/prospection/kpi",
    label: "Rapports & KPI",
    icon: BarChart3,
    iconMotion: "lift",
    roles: ["direction", "admin", "manager"],
    group: "pilotage",
  },
  {
    to: "/prospection/notifications",
    label: "Notifications",
    icon: Bell,
    iconMotion: "ring",
    roles: ["manager", "direction", "collaborateur", "admin"],
    group: "pilotage",
  },
  {
    to: "/prospection/import",
    label: "Import / export",
    icon: Upload,
    iconMotion: "lift",
    roles: ["manager", "direction", "admin"],
    group: "settings",
  },
  {
    to: "/prospection/admin",
    label: "Administration",
    icon: Settings,
    iconMotion: "spin",
    roles: ["direction", "admin"],
    group: "settings",
  },
];

export function crmNavFor(role: CrmRole) {
  return CRM_NAV.filter((i) => i.roles.includes(role));
}

export function crmNavSections(role: CrmRole) {
  const items = crmNavFor(role);
  return CRM_NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}
