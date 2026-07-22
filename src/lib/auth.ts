import { createClient } from "@/lib/client";
import type { StaffPayload } from "@/lib/auth-schemas";

export function signInWithEmailPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithStaff(
  email: string,
  password: string,
  staff: StaffPayload,
) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        staff,
        first_name: staff.firstName,
        last_name: staff.lastName,
        full_name: `${staff.firstName} ${staff.lastName}`,
        job_title: staff.jobTitle,
        phone: staff.phone ?? null,
        cabinet: staff.cabinet ?? null,
      },
    },
  });
}

export function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export function signInWithEmailMagicLink(email: string) {
  const supabase = createClient();
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export function staffInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
