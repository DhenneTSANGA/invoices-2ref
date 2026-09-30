import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DossierWorkspace } from "@/components/dossier/DossierWorkspace";

export const Route = createFileRoute("/_app/dossiers")({
  validateSearch: (raw: Record<string, unknown>) => ({
    q: typeof raw.q === "string" ? raw.q : undefined,
  }),
  component: DossiersLayout,
});

function DossiersLayout() {
  return (
    <DossierWorkspace>
      <Outlet />
    </DossierWorkspace>
  );
}
