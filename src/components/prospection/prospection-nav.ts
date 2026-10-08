import type { LucideIcon } from "lucide-react";
import type { NavIconMotion } from "@/components/layout/NavIcon";
import type { CrmRole } from "@/lib/prospection-access";
import {
  BookOpen,
  Building2,
  LayoutDashboard,
  ListChecks,
  Settings,
  Target,
  Users,
  BarChart3,
} from "lucide-react";

export type CrmNavGroupId = "main" | "settings";

export type CrmHubTab = {
  to: string;
  label: string;
  /** Préfixes d’URL qui activent cet onglet (détails inclus). */
  match?: string[];
};

export type CrmNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconMotion?: NavIconMotion;
  roles: CrmRole[];
  group: CrmNavGroupId;
  /** URLs qui gardent cet item actif dans la sidebar. */
  matchPaths?: string[];
  /** Onglets du hub (contenu regroupé). */
  tabs?: CrmHubTab[];
};

export const CRM_NAV_GROUPS: { id: CrmNavGroupId; label: string }[] = [
  { id: "main", label: "Espace" },
  { id: "settings", label: "Réglages" },
];

/**
 * Menu simplifié (~7 entrées).
 * Le contenu des anciennes pages reste accessible via onglets.
 */
export const CRM_NAV: CrmNavItem[] = [
  {
    to: "/prospection",
    label: "Aujourd’hui",
    icon: LayoutDashboard,
    iconMotion: "bounce",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "main",
  },
  {
    to: "/prospection/pistes",
    label: "Captation",
    icon: Users,
    iconMotion: "pulse",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "main",
    matchPaths: ["/prospection/pistes", "/prospection/prospects"],
    tabs: [
      { to: "/prospection/pistes", label: "Pistes internes" },
      {
        to: "/prospection/prospects",
        label: "Prospects",
        match: ["/prospection/prospects"],
      },
    ],
  },
  {
    to: "/prospection/opportunites",
    label: "Pipeline",
    icon: Target,
    iconMotion: "bounce",
    roles: ["manager", "direction", "chef_service", "admin"],
    group: "main",
    matchPaths: ["/prospection/opportunites", "/prospection/pipeline"],
  },
  {
    to: "/prospection/activites",
    label: "Activités",
    icon: ListChecks,
    iconMotion: "pulse",
    roles: ["manager", "direction", "admin"],
    group: "main",
    matchPaths: ["/prospection/activites", "/prospection/agenda", "/prospection/actions"],
    tabs: [
      { to: "/prospection/activites", label: "Liste" },
      { to: "/prospection/agenda", label: "Agenda" },
    ],
  },
  {
    to: "/prospection/bibliotheque",
    label: "Bibliothèque",
    icon: BookOpen,
    iconMotion: "tilt",
    roles: ["manager", "direction", "chef_service", "collaborateur", "admin"],
    group: "main",
  },
  {
    to: "/prospection/clients",
    label: "Portefeuille",
    icon: Building2,
    iconMotion: "tilt",
    roles: ["manager", "direction", "chef_service", "admin"],
    group: "main",
    matchPaths: [
      "/prospection/clients",
      "/prospection/portefeuille",
      "/prospection/strategiques",
      "/prospection/port-gentil",
    ],
    tabs: [
      {
        to: "/prospection/clients",
        label: "Clients",
        match: ["/prospection/clients"],
      },
      { to: "/prospection/portefeuille", label: "Vue portefeuille" },
      { to: "/prospection/strategiques", label: "Stratégiques" },
      {
        to: "/prospection/port-gentil",
        label: "Port-Gentil",
        match: ["/prospection/port-gentil"],
      },
    ],
  },
  {
    to: "/prospection/kpi",
    label: "Pilotage",
    icon: BarChart3,
    iconMotion: "lift",
    roles: ["direction", "admin", "manager", "collaborateur"],
    group: "main",
    matchPaths: [
      "/prospection/kpi",
      "/prospection/objectifs",
      "/prospection/budget",
      "/prospection/notifications",
    ],
    tabs: [
      { to: "/prospection/kpi", label: "KPI" },
      { to: "/prospection/objectifs", label: "Objectifs" },
      { to: "/prospection/budget", label: "Budget" },
      { to: "/prospection/notifications", label: "Notifications" },
    ],
  },
  {
    to: "/prospection/admin",
    label: "Réglages",
    icon: Settings,
    iconMotion: "spin",
    roles: ["direction", "admin", "manager"],
    group: "settings",
    matchPaths: [
      "/prospection/admin",
      "/prospection/import",
      "/prospection/equipe",
    ],
    tabs: [
      {
        to: "/prospection/admin",
        label: "Référentiels",
        match: ["/prospection/admin"],
      },
      {
        to: "/prospection/equipe",
        label: "Équipe",
        match: ["/prospection/equipe"],
      },
      {
        to: "/prospection/import",
        label: "Import / export",
        match: ["/prospection/import"],
      },
    ],
  },
];

export function crmNavFor(role: CrmRole) {
  return CRM_NAV.filter((i) => i.roles.includes(role)).map((item) => {
    if (!item.tabs) return item;

    if (item.to === "/prospection/pistes") {
      if (role === "chef_service" || role === "collaborateur") {
        const tabs = item.tabs.filter((t) => t.to === "/prospection/pistes");
        return { ...item, tabs, matchPaths: ["/prospection/pistes"] };
      }
      return item;
    }

    if (item.to === "/prospection/clients") {
      let tabs = item.tabs;
      if (role === "chef_service") {
        tabs = tabs.filter((t) => t.to === "/prospection/clients");
      } else if (role !== "direction" && role !== "admin") {
        tabs = tabs.filter((t) => t.to !== "/prospection/port-gentil");
      }
      return { ...item, tabs, matchPaths: tabs.map((t) => t.to) };
    }

    if (item.to === "/prospection/kpi") {
      if (role === "collaborateur") {
        return {
          ...item,
          to: "/prospection/notifications",
          tabs: item.tabs.filter((t) => t.to === "/prospection/notifications"),
          matchPaths: ["/prospection/notifications"],
        };
      }
      return item;
    }

    if (item.to === "/prospection/admin" && role === "manager") {
      return {
        ...item,
        to: "/prospection/import",
        tabs: item.tabs.filter((t) => t.to === "/prospection/import"),
        matchPaths: ["/prospection/import"],
      };
    }

    if (item.to === "/prospection/admin" && (role === "direction" || role === "admin")) {
      return item;
    }

    return item;
  });
}

export function crmNavSections(role: CrmRole) {
  const items = crmNavFor(role);
  return CRM_NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}

export function findCrmHub(pathname: string, role: CrmRole): CrmNavItem | null {
  const items = crmNavFor(role);
  for (const item of items) {
    if (!item.tabs?.length) continue;
    const paths = item.matchPaths ?? [item.to];
    if (paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return item;
    }
  }
  return null;
}

export function isCrmNavActive(pathname: string, item: CrmNavItem) {
  const paths = item.matchPaths ?? [item.to];
  return paths.some((to) => {
    if (to === "/prospection") return pathname === "/prospection" || pathname === "/prospection/";
    return pathname === to || pathname.startsWith(`${to}/`);
  });
}

export function isCrmTabActive(pathname: string, tab: CrmHubTab) {
  const paths = tab.match ?? [tab.to];
  return paths.some((to) => pathname === to || pathname.startsWith(`${to}/`));
}
