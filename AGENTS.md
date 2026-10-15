<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Cloud Agent local development

The app is TanStack Start (Vite) plus Prisma, backed by a local Supabase stack. The Cloud Agent VM has no Docker daemon. Supabase CLI 2.121.0 uses the experimental native runtime (`SUPABASE_EXPERIMENTAL_STACK=1`).

- Install runs `pnpm install --frozen-lockfile`, then `supabase stack prepare --runtime native` for `database`, `auth`, `rest`, and `storage`.
- Start brings that stack up, writes the gitignored `.env`, applies Prisma migrations, seeds both cabinets, ensures a local super admin, and serves the app on port 8080 (`pnpm dev --host 0.0.0.0 --port 8080`).
- Two committed migrations do not apply inside Prisma's transaction on Postgres 17: `20260722140000_multi_cabinet_roles` uses the new `super_admin` enum value in the same transaction, and `20260917160000_document_show_rib` begins with a UTF-8 BOM. Start applies those with `psql` (autocommit) and `prisma migrate resolve`. Leave the migration files unchanged so existing database checksums stay valid.
- The local login email is `dev@2r-hub.local`. The password lives only in `~/.config/2r-hub/dev-login` and is copied into `.env` as `DEV_LOGIN_PASSWORD`. That address is `SUPER_ADMIN_EMAIL`, so the first login opens the hub without onboarding.
- `pnpm lint` fails on existing Prettier findings, and `pnpm exec tsc --noEmit` reports existing type errors. Neither blocks the dev server.
- `supabase/config.toml` still lists auth redirect URLs on port 3000. Password login against the local API does not use them. Resend is not configured in this environment.
