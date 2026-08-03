import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ban, ArrowRight } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { AuthVisualPanel } from "@/components/auth/AuthVisualPanel";
import {
  ACCOUNT_REMOVED_HINT,
} from "@/lib/access-policy";
import { finalizeAccountRemoval } from "@/lib/admin.functions";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/compte-supprime")({
  head: () => ({
    meta: [
      { title: "Compte supprimé — 2R Hub" },
      {
        name: "description",
        content: "Votre compte collaborateur a été retiré de 2R Hub.",
      },
    ],
  }),
  component: CompteSupprimePage,
});

function CompteSupprimePage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await finalizeAccountRemoval();
      } catch {
        try {
          await signOut();
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel
        imageSrc="/optimized/auth/login-panel2.webp"
        imageAlt="Espace collaborateur 2R Hub"
        title="Accès retiré"
        subtitle="Ce compte ne fait plus partie de l’équipe 2R Hub."
      />

      <div className="flex items-center justify-center p-6">
        <div className="glass-panel w-full max-w-md rounded-3xl p-5 shadow-float sm:p-8">
          <Logo size="md" className="rounded-lg" />

          <div className="mt-6 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
              <Ban className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold">Compte supprimé</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {ACCOUNT_REMOVED_HINT}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-surface/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Si vous avez besoin d’un nouvel accès, un administrateur devra
            recréer votre compte.
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Retour à la connexion
            <ArrowRight className="h-4 w-4" />
          </Link>

          {!done ? (
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Fermeture de la session…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
