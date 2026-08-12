import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Logo } from "@/components/common/Logo";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { formatPrismaError } from "@/lib/prisma-errors";

function NotFoundComponent() {
  const path =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel rounded-3xl px-10 py-14 text-center max-w-lg">
        <div className="mx-auto mb-6 flex justify-center">
          <Logo size="lg" className="rounded-lg" />
        </div>

        <div className="text-[5rem] font-bold leading-none text-gradient-primary">
          404
        </div>

        <h2 className="mt-3 text-xl font-semibold">
          Page introuvable
        </h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          L'adresse que vous avez saisie ne correspond à aucune page existante.
          <br />
          Vérifiez l'URL ou revenez à un espace connu.
        </p>

        {path && (
          <p className="mt-3 rounded-xl bg-muted/60 px-4 py-2 font-mono text-xs text-muted-foreground break-all">
            {path}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-[14px] bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Tableau de bord
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[14px] border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const msg = String(error?.message ?? "");
  const isDb =
    msg.includes("Can't reach database server") ||
    msg.includes("P1001") ||
    msg.includes("PrismaClientInitializationError");
  const detail = isDb
    ? "Impossible de joindre la base Supabase. Vérifiez que le projet n’est pas en pause, puis réessayez."
    : formatPrismaError(error, "Réessayez ou retournez à l'accueil.");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-panel rounded-3xl px-8 py-10 text-center max-w-md">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-[14px] bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            Réessayer
          </button>
          <a href="/login" className="rounded-[14px] border border-border px-4 py-2 text-sm font-medium">
            Connexion
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "2R Hub — Centraliser · Automatiser · Performer" },
      { name: "description", content: "2R Hub : plateforme multi-cabinet pour 2R Conseil et 2R Expertise Fiscale — clients, devis, factures et courriels." },
      { name: "author", content: "2R Hub" },
      { property: "og:title", content: "2R Hub — Centraliser · Automatiser · Performer" },
      { property: "og:description", content: "Plateforme premium de gestion des clients, devis et factures pour 2R Conseil et 2R Expertise Fiscale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var u=localStorage.getItem("2ref-auto-theme-user")||localStorage.getItem("2REF-AUTO-theme-user");var t=localStorage.getItem("2ref-auto-theme")||localStorage.getItem("2REF-AUTO-theme");if(!u||t!=="dark"){document.documentElement.classList.remove("dark");}else{document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
