import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

/** Inscription collaborateur → table `staff_members`. */
export const signupStaffSchema = z
  .object({
    firstName: z.string().min(2, "Prénom requis"),
    lastName: z.string().min(2, "Nom requis"),
    jobTitle: z.string().min(2, "Poste requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(6, "Téléphone requis"),
    password: z.string().min(6, "Au moins 6 caractères"),
    confirmPassword: z.string().min(6, "Confirmez le mot de passe"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupStaffInput = z.infer<typeof signupStaffSchema>;

export type StaffPayload = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone?: string;
};

export function toStaffPayload(
  data: SignupStaffInput | StaffPayload,
): StaffPayload {
  const phone = data.phone?.trim();
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    jobTitle: data.jobTitle.trim(),
    email: data.email.trim().toLowerCase(),
    phone: phone ? phone : undefined,
  };
}
