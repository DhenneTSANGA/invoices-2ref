/**
 * Traduit les messages d’auth Supabase en français, ton humain.
 * Les messages déjà clairs en français sont laissés tels quels.
 */
export function humanAuthError(
  error: unknown,
  fallback = "Une erreur est survenue. Réessayez dans un instant.",
): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : error instanceof Error
          ? error.message
          : "";

  const msg = raw.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();

  // Déjà en français (heuristique simple) → garder
  if (/[àâäéèêëïîôùûüçœ]/i.test(msg) || /\b(mot de passe|compte|connexion|e-mail|email)\b/i.test(msg)) {
    // Sauf si c’est un mélange technique anglais connu
    if (!/invalid login|email not confirmed|rate limit|user already|weak password/i.test(lower)) {
      return msg;
    }
  }

  if (/invalid login credentials|invalid credentials|wrong password|invalid email or password/i.test(lower)) {
    return "E-mail ou mot de passe incorrect. Vérifiez votre saisie, sinon demandez un accès à un administrateur.";
  }

  if (/email not confirmed|email_not_confirmed/i.test(lower)) {
    return "Votre adresse e-mail n’est pas encore confirmée. Contactez un administrateur pour débloquer votre accès.";
  }

  if (/user already registered|already been registered|email address is already/i.test(lower)) {
    return "Cet e-mail est déjà utilisé. Choisissez une autre adresse, ou connectez-vous avec ce compte.";
  }

  if (/user not found|no user found/i.test(lower)) {
    return "Aucun compte ne correspond à cet e-mail. Vérifiez l’adresse ou demandez un accès.";
  }

  if (/rate limit|too many requests|email rate limit/i.test(lower)) {
    return "Trop de tentatives pour le moment. Patientez quelques minutes avant de réessayer.";
  }

  if (/weak password|password should be|password is too weak/i.test(lower)) {
    return "Ce mot de passe est trop faible. Choisissez-en un plus long (8 caractères minimum).";
  }

  if (/same password|new password should be different/i.test(lower)) {
    return "Choisissez un mot de passe différent de l’actuel.";
  }

  if (/session|jwt|refresh token|not authenticated|auth session missing/i.test(lower)) {
    return "Votre session a expiré. Reconnectez-vous pour continuer.";
  }

  if (/network|fetch failed|failed to fetch/i.test(lower)) {
    return "Problème de connexion réseau. Vérifiez votre internet puis réessayez.";
  }

  if (/otp|token|expired|invalid.*link|magic.?link/i.test(lower)) {
    return "Ce lien n’est plus valide ou a expiré. Demandez un nouvel accès à un administrateur.";
  }

  if (/signup.?disabled|signups not allowed|sign ups not allowed/i.test(lower)) {
    return "Les inscriptions libres sont fermées. Seul un administrateur peut créer un accès.";
  }

  if (/permission|not allowed|forbidden|access denied/i.test(lower)) {
    return "Vous n’avez pas l’autorisation d’effectuer cette action.";
  }

  // Message technique restant : reformuler sans afficher l’anglais brut
  return fallback;
}
