import type { User } from "@supabase/supabase-js";

/**
 * Flag local : demande de reset en cours (détecte le retour PKCE sans type=recovery).
 * localStorage (pas sessionStorage) : le lien e-mail s’ouvre souvent dans un autre onglet.
 */
export const PASSWORD_RECOVERY_PENDING_KEY = "2r_password_recovery_pending";
const PASSWORD_RECOVERY_PENDING_TTL_MS = 60 * 60 * 1000; // 1 h

/** Métadonnée Auth : l’utilisateur doit choisir un mot de passe (après invitation). */
export const MUST_SET_PASSWORD_KEY = "must_set_password";

/** Compte créé par super admin : rappel au login pour changer le MDP (optionnel). */
export const SUGGEST_PASSWORD_CHANGE_KEY = "suggest_password_change";

export function markPasswordRecoveryPending() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function hasPasswordRecoveryPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PASSWORD_RECOVERY_PENDING_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > PASSWORD_RECOVERY_PENDING_TTL_MS) {
      localStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearPasswordRecoveryPending() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function userMustSetPassword(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  return meta[MUST_SET_PASSWORD_KEY] === true;
}

export function userShouldSuggestPasswordChange(
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  return meta[SUGGEST_PASSWORD_CHANGE_KEY] === true;
}
