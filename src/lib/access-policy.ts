/**
 * Politique d’accès 2R Hub.
 *
 * Par défaut : inscription publique désactivée (invitation uniquement).
 * Pour réactiver temporairement le formulaire /signup et l’onboarding libre :
 *   PUBLIC_SELF_SIGNUP=true
 *   VITE_PUBLIC_SELF_SIGNUP=true
 * (le code signup / magic link reste en place, seulement masqué / bloqué.)
 */

function envFlagTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Inscription libre (formulaire + onboarding auto) autorisée ? */
export function isPublicSelfSignupEnabled(): boolean {
  if (typeof process !== "undefined") {
    if (envFlagTrue(process.env.PUBLIC_SELF_SIGNUP)) return true;
    if (envFlagTrue(process.env.VITE_PUBLIC_SELF_SIGNUP)) return true;
  }
  try {
    // Vite client
    if (envFlagTrue(import.meta.env?.VITE_PUBLIC_SELF_SIGNUP as string | undefined)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export const INVITE_ONLY_LOGIN_HINT =
  "Accès réservé aux collaborateurs invités. Contactez un administrateur 2R Hub.";
