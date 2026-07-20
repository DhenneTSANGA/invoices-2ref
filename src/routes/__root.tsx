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
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel rounded-3xl px-10 py-12 text-center max-w-md">
        <div className="text-[6rem] font-bold leading-none text-gradient-primary">404</div>
        <h2 className="mt-2 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-[14px] bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Retour au tableau de bord
        </Link>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-panel rounded-3xl px-8 py-10 text-center max-w-md">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Réessayez ou retournez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-[14px] bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
          >
            Réessayer
          </button>
          <a href="/dashboard" className="rounded-[14px] border border-border px-4 py-2 text-sm font-medium">
            Tableau de bord
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
      { title: "2REF-AUTO — Automatisation cabinet fiscal" },
      { name: "description", content: "Plateforme d'automatisation du cabinet 2REF Expertise Fiscale." },
      { name: "author", content: "2REF-AUTO" },
      { property: "og:title", content: "2REF-AUTO — Automatisation cabinet fiscal" },
      { property: "og:description", content: "Plateforme premium de gestion des clients, devis et factures." },
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
      { rel: "icon", href: "/logo-2ref.png", type: "image/png" },
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
