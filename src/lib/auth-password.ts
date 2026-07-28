import type { User } from "@supabase/supabase-js";

/** Métadonnée Auth : l’utilisateur doit choisir un mot de passe (après invitation). */
export const MUST_SET_PASSWORD_KEY = "must_set_password";

/** Compte créé par super admin : rappel au login pour changer le MDP (optionnel). */
export const SUGGEST_PASSWORD_CHANGE_KEY = "suggest_password_change";

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
