# FacturIA — Premium Front-End Prototype Plan

A high-end, fully front-end (mock data) prototype of an invoice/quotation management SaaS, built on the project's TanStack Start + Tailwind v4 + shadcn stack (not Next.js — I'll adapt the spec to the existing stack while keeping every visual/UX requirement).

## Stack adaptation
- **Framework**: TanStack Start (existing) instead of Next.js 15 — same React 19 + file routing, no functional loss.
- **Styling**: Tailwind v4 via `src/styles.css` with full custom design system (oklch tokens, gradients, glass shadows, radii from spec).
- **UI**: shadcn/ui (already installed).
- **Animations**: `framer-motion` (install).
- **State**: `zustand` (install) for mock data store.
- **Forms**: `react-hook-form` + `zod` (install).
- **Tables**: `@tanstack/react-table` (install).
- **Icons**: lucide-react (installed).
- **Data**: in-memory Zustand store seeded with realistic fictional clients/services/quotes/invoices. No backend.

## Design system (src/styles.css)
- Light + dark themes with the exact palette from spec converted to oklch (primary #1E40AF, secondary #3B82F6, accent #F59E0B, success/warning/danger, slate surfaces).
- Token additions: `--gradient-primary`, `--gradient-accent`, `--gradient-hero`, `--shadow-soft`, `--shadow-float`, `--shadow-glass`, `--shadow-glow`, `--radius` 14px base with card 24px / modal 28px variants.
- Glassmorphism utility classes (`@utility glass-panel`, `glass-sidebar`, `glass-topbar`) using `backdrop-filter` (standard property only).
- Inter font loaded via `<link>` in `__root.tsx`; JetBrains Mono for financial numbers (`.font-numeric`).
- Animated background utility (subtle aurora blobs) for auth + dashboard hero.

## Routes (src/routes)
```
__root.tsx                  shell, fonts, theme provider, toaster
index.tsx                   redirect → /dashboard (mock auth always on)
login.tsx                   premium split-screen login
_app.tsx                    authenticated layout (floating glass sidebar + sticky glass topbar + <Outlet/>)
_app.dashboard.tsx          dashboard with widgets, charts, activity feed
_app.clients.index.tsx      clients list (data table, search, filters)
_app.clients.new.tsx        create client (multi-section form)
_app.clients.$id.tsx        edit client
_app.services.tsx           services catalog (grid + table toggle)
_app.quotations.index.tsx   quotations list
_app.quotations.new.tsx     two-panel quotation editor + live preview
_app.quotations.$id.tsx     quotation details + preview + actions
_app.invoices.index.tsx     invoices list
_app.invoices.new.tsx       two-panel invoice editor + live preview
_app.invoices.$id.tsx       invoice details + preview
_app.templates.tsx          document templates gallery (4 templates)
_app.archive.tsx            archived documents
_app.search.tsx             global results page
_app.settings.tsx           settings (company, branding, fiscal, preferences) tabs
_app.profile.tsx            user profile
_app.notifications.tsx      notifications center
sitemap[.]xml.ts            sitemap
```
Plus `notFoundComponent` on root for the 404.

## Shared components (src/components)
- `layout/AppSidebar.tsx` — floating glass sidebar, collapsible, animated icons, active-route highlight.
- `layout/AppTopbar.tsx` — sticky glass topbar with global ⌘K search trigger, notifications popover, profile dropdown, theme toggle.
- `layout/CommandPalette.tsx` — global search via shadcn `command`.
- `common/StatCard.tsx` — gradient/glass stat card with animated counter (framer-motion).
- `common/AnimatedCounter.tsx`
- `common/PageHeader.tsx`
- `common/DataTable.tsx` — TanStack Table wrapper with sticky header, staggered row entrance, row hover.
- `common/EmptyState.tsx` — illustrated empty states (inline SVG).
- `common/StatusBadge.tsx`
- `charts/RevenueAreaChart.tsx`, `charts/DocumentsBarChart.tsx`, `charts/StatusDonut.tsx` — Recharts (install) with progressive render.
- `documents/InvoicePreview.tsx` — pixel-perfect A4 preview (Excel-style standard invoice).
- `documents/QuotationPreview.tsx`
- `documents/ProformaPreview.tsx`
- `documents/LetterPreview.tsx`
- `editor/DocumentEditor.tsx` — two-panel workspace (left form sections, right live preview, sticky scroll, real-time totals).
- `editor/LineItemsTable.tsx` — editable services rows with add/remove, animated totals.
- `forms/FloatingInput.tsx`, `forms/FloatingTextarea.tsx`, `forms/FormSection.tsx` — floating-label inputs.
- `theme/ThemeProvider.tsx` + `ThemeToggle.tsx`.

## Mock data (src/lib/mock)
- `clients.ts` — 12 realistic fictional clients (company name, ICE, IF, RC, address, contact).
- `services.ts` — 15 services with unit, unit price, VAT.
- `documents.ts` — 20 quotations + 25 invoices with line items, statuses, dates.
- `activity.ts`, `notifications.ts`.
- Zustand store `src/store/useAppStore.ts` for CRUD on the in-memory data so create/edit flows feel real.

## Document preview (pixel-perfect)
A4-ratio container (`aspect-[1/1.414]`), serif/sans mix, company header with logo block, client block, items table with bordered cells, totals box (HT, VAT, TTC) with monospace numbers, signature + stamp placeholders, footer with legal mentions. Live-updates from editor form via Zustand.

## Animations (framer-motion)
- Route-level `<motion.div>` fade+slide+blur (500ms).
- Card hover scale 1.03 + glow; button tap scale 0.97.
- Staggered table row entrance.
- Modal scale+fade+blur.
- Sidebar width spring.
- Shimmer skeletons (tailwind keyframes).
- Toast: sonner with custom slide-in.

## Responsive
- Sidebar collapses to icon rail < lg, off-canvas sheet on mobile.
- Editor stacks single-column on < xl with preview behind a "Preview" sheet button.
- Tables → card list on mobile.

## Out of scope (prototype)
- Real auth (login button just navigates to /dashboard).
- Real PDF export (preview is the rendered HTML; a "Download PDF" button shows a toast).
- Real backend / database.

## Deliverable
A complete, navigable prototype where every page in the spec is reachable from the sidebar, every form works against the in-memory store, the dashboard animates on load, and the invoice/quotation editors render true-to-Excel A4 previews that update live.

---

Approve and I'll build it. If you'd rather scope down first (e.g. ship Dashboard + Clients + Invoice editor first, then the rest), say the word.