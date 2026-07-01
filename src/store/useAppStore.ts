import { create } from "zustand";
import { seedClients, seedDocuments, seedServices, seedActivity, seedNotifications } from "@/lib/mock/seed";
import type { Client, Document, LineItem, NotificationItem, Service, Activity } from "./types";

type State = {
  clients: Client[];
  services: Service[];
  documents: Document[];
  activities: Activity[];
  notifications: NotificationItem[];
  company: {
    name: string;
    tagline: string;
    ice: string;
    if: string;
    rc: string;
    patente: string;
    cnss: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    bankName: string;
    bankRib: string;
  };

  addClient: (c: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  removeClient: (id: string) => void;

  addService: (s: Omit<Service, "id">) => Service;
  updateService: (id: string, patch: Partial<Service>) => void;
  removeService: (id: string) => void;

  upsertDocument: (d: Document) => void;
  removeDocument: (id: string) => void;
  setDocumentStatus: (id: string, status: Document["status"]) => void;

  markAllNotificationsRead: () => void;
};

export const computeTotals = (items: LineItem[]) => {
  const subtotal = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100), 0);
  const vat = items.reduce((a, b) => a + b.quantity * b.unitPrice * (1 - (b.discount || 0) / 100) * (b.vatRate / 100), 0);
  return { subtotal, vat, total: subtotal + vat };
};

export const useAppStore = create<State>((set) => ({
  clients: seedClients,
  services: seedServices,
  documents: seedDocuments,
  activities: seedActivity,
  notifications: seedNotifications,
  company: {
    name: "FacturIA Conseil & Expertise",
    tagline: "Cabinet d'expertise comptable et fiscale",
    ice: "002998877000001",
    if: "40998877",
    rc: "11223",
    patente: "33445566",
    cnss: "9988776",
    address: "27 Boulevard Zerktouni, 6ème étage",
    city: "20 000 Casablanca, Maroc",
    phone: "+212 522 99 88 77",
    email: "contact@facturia.ma",
    website: "www.facturia.ma",
    bankName: "Attijariwafa Bank",
    bankRib: "007 780 0001234567890123 45",
  },

  addClient: (c) => {
    const client: Client = { ...c, id: `c-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    set((s) => ({ clients: [client, ...s.clients] }));
    return client;
  },
  updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

  addService: (s) => {
    const service: Service = { ...s, id: `s-${Date.now()}` };
    set((st) => ({ services: [service, ...st.services] }));
    return service;
  },
  updateService: (id, patch) => set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),

  upsertDocument: (d) => set((s) => {
    const exists = s.documents.find((x) => x.id === d.id);
    return { documents: exists ? s.documents.map((x) => (x.id === d.id ? d : x)) : [d, ...s.documents] };
  }),
  removeDocument: (id) => set((s) => ({ documents: s.documents.filter((x) => x.id !== id) })),
  setDocumentStatus: (id, status) => set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, status } : d)) })),

  markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
