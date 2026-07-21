import { create } from "zustand";

/** Store UI léger — les notifications passent par PostgreSQL + polling. */
type State = Record<string, never>;

export const useAppStore = create<State>(() => ({}));
