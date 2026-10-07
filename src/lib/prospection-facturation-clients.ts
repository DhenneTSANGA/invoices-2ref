import type { Client } from "@/store/types";
import type {
  ClientCrmOverlay,
  Company,
  ServiceLine,
  Site,
} from "@/lib/prospection-demo";
import { parseClientPole, type ClientPole } from "@/lib/client-pole";

export type { ClientCrmOverlay };

const POLE_TO_LINE: Record<ClientPole, ServiceLine> = {
  formation: "formation",
  audit: "conseil",
  juridique: "conseil",
  comptabilite: "comptabilite",
};

export function siteFromClientCity(city?: string | null): Site {
  const c = (city ?? "").toLowerCase();
  if (c.includes("gentil") || c.includes("port-gentil") || c.includes("port gentil")) {
    return "port_gentil";
  }
  if (c.includes("franceville")) return "franceville";
  return "libreville";
}

/** Client Facturation → fiche Company CRM (lecture seule côté factu). */
export function companyFromFacturationClient(
  client: Client,
  overlay?: ClientCrmOverlay,
  defaultManagerId = "mgr-awa",
): Company {
  const pole = parseClientPole(client.pole);
  const line = POLE_TO_LINE[pole];
  return {
    id: client.id,
    name: client.name,
    kind: "client",
    sector: overlay?.sector || client.activity || "—",
    size: overlay?.size || "—",
    site: overlay?.site ?? siteFromClientCity(client.city),
    address: [client.address, client.city].filter(Boolean).join(", ") || client.city || "",
    phone: client.phone || "",
    email: client.email || "",
    website: "",
    managerId: overlay?.managerId ?? defaultManagerId,
    servicesBought: overlay?.servicesBought?.length ? overlay.servicesBought : [line],
    targetLines: overlay?.targetLines ?? [],
    source: "client_existant",
    strategic: overlay?.strategic ?? false,
    caSigned: overlay?.caSigned ?? 0,
    notes: overlay?.notes ?? "",
    plan: overlay?.plan,
    cabinet: client.cabinet,
    fromFacturation: true,
  };
}

export function mergeProspectionCompanies(args: {
  facturationClients: Client[];
  localCompanies: Company[];
  overlays: Record<string, ClientCrmOverlay>;
  defaultManagerId?: string;
}): Company[] {
  const { facturationClients, localCompanies, overlays, defaultManagerId } = args;
  const fromFactu = facturationClients.map((c) =>
    companyFromFacturationClient(c, overlays[c.id], defaultManagerId),
  );
  const factuIds = new Set(fromFactu.map((c) => c.id));
  /** Prospects (et clients CRM locaux pas encore en Facturation). */
  const localOnly = localCompanies.filter(
    (c) => !c.fromFacturation && !factuIds.has(c.id),
  );
  return [...fromFactu, ...localOnly].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}
