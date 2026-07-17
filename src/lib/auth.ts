import { createClient } from "@/lib/client";
import type { StaffPayload } from "@/lib/auth-schemas";

export function getAuthRedirectUrl(path = "/auth/callback") {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithStaff(
  email: string,
  password: string,
  staff: StaffPayload,
) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        staff,
        first_name: staff.firstName,
        last_name: staff.lastName,
        full_name: `${staff.firstName} ${staff.lastName}`,
        job_title: staff.jobTitle,
        phone: staff.phone ?? null,
      },
    },
  });
}

export async function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

export async function signInWithEmailMagicLink(email: string) {
  const supabase = createClient();
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      shouldCreateUser: true,
    },
  });
}

export function authErrorMessage(error: { message?: string } | null | undefined) {
  if (!error?.message) return "Une erreur est survenue.";
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (msg.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirmez votre email avant de vous connecter.";
  }
  if (msg.includes("password")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  if (msg.includes("pkce") || msg.includes("code verifier")) {
    return "Session OAuth expirée. Relancez la connexion Google depuis cette même fenêtre.";
  }
  return error.message;
}

export function staffInitials(firstName: string, lastName: string) {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}
