import { useSyncExternalStore } from "react";
import {
  createDossierDemoSeed,
  type GedAsset,
  type Mission,
  type MissionStatus,
  type TaxFile,
  type TaxFileStatus,
} from "@/lib/dossier-demo";

type Data = {
  files: TaxFile[];
  assets: GedAsset[];
  missions: Mission[];
};

type Actions = {
  setFileStatus: (id: string, status: TaxFileStatus) => void;
  toggleDeadline: (fileId: string, deadlineId: string) => void;
  toggleAssetMissing: (id: string) => void;
  setMissionStatus: (id: string, status: MissionStatus) => void;
  toggleMissionTask: (missionId: string, taskId: string) => void;
  reset: () => void;
};

type Store = Data & Actions;

let data: Data = createDossierDemoSeed();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return data;
}

const actions: Actions = {
  setFileStatus: (id, status) => {
    data = {
      ...data,
      files: data.files.map((f) => (f.id === id ? { ...f, status } : f)),
    };
    emit();
  },
  toggleDeadline: (fileId, deadlineId) => {
    data = {
      ...data,
      files: data.files.map((f) =>
        f.id !== fileId
          ? f
          : {
              ...f,
              deadlines: f.deadlines.map((d) =>
                d.id === deadlineId ? { ...d, done: !d.done } : d,
              ),
            },
      ),
    };
    emit();
  },
  toggleAssetMissing: (id) => {
    data = {
      ...data,
      assets: data.assets.map((a) =>
        a.id === id ? { ...a, missing: !a.missing } : a,
      ),
    };
    emit();
  },
  setMissionStatus: (id, status) => {
    data = {
      ...data,
      missions: data.missions.map((m) =>
        m.id === id ? { ...m, status } : m,
      ),
    };
    emit();
  },
  toggleMissionTask: (missionId, taskId) => {
    data = {
      ...data,
      missions: data.missions.map((m) =>
        m.id !== missionId
          ? m
          : {
              ...m,
              tasks: m.tasks.map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t,
              ),
            },
      ),
    };
    emit();
  },
  reset: () => {
    data = createDossierDemoSeed();
    emit();
  },
};

export function useDossierDemoStore<T>(selector: (s: Store) => T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector({ ...snap, ...actions });
}
