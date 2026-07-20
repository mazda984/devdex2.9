# Devdex

Devdex is a game database / catalog platform: a REST API backed by PostgreSQL, a React web client, and shared TypeScript packages for API contracts and validation.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from an OpenAPI spec)
- Web client: Vite + React
- Build: esbuild (CJS bundle) for the API server

## Repo layout

```
artifacts/
  api-server/       Express API server
  devdex/            React web client (Vite)
  mockup-sandbox/    UI mockup preview app
lib/
  api-spec/          OpenAPI spec + Orval codegen config
  api-zod/            Generated Zod types (from the OpenAPI spec)
  api-client-react/   Generated React Query hooks (from the OpenAPI spec)
  db/                  Drizzle schema + DB client
scripts/               Repo maintenance scripts
```

## Prerequisites

- Node.js 24+
- pnpm (installed automatically via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- A PostgreSQL database (local, Docker, or a hosted instance)

## Getting started

1. Clone the repo and install dependencies:

   ```bash
   git clone <your-fork-or-repo-url>
   cd Devdex2s-main
   pnpm install
   ```

2. Copy the environment template and fill in your database connection string:

   ```bash
   cp .env.example .env
   ```

3. Push the database schema:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Run the API server (port 5000 by default):

   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

5. In a separate terminal, run the web client:

   ```bash
   PORT=5173 BASE_PATH=/ pnpm --filter @workspace/devdex run dev
   ```

## Common commands

- `pnpm run typecheck` — typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment variables

See `.env.example`. At minimum you need `DATABASE_URL` pointing at a Postgres instance.

## CI

GitHub Actions (`.github/workflows/ci.yml`) installs dependencies, spins up a throwaway Postgres service container, and runs `pnpm run build` (typecheck + build) on every push and pull request to `main`.

## Deployment

Build the API server with `pnpm --filter @workspace/api-server run build` and serve `artifacts/api-server/dist/index.mjs` with Node 24 on any host that can provide a `DATABASE_URL`. Build the web client with `pnpm --filter @workspace/devdex run build` and serve the static output in `artifacts/devdex/dist/public` from any static host or CDN.

### GitHub Pages (web client only)

`.github/workflows/deploy-pages.yml` builds `artifacts/devdex` and publishes it to GitHub Pages on every push to `main`.

One-time setup:

1. In the repo, go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
2. Push to `main` — the workflow builds the client with `BASE_PATH` set automatically to `/<your-repo-name>/` (derived from the repo name, so renaming the repo doesn't break it), copies `index.html` to `404.html` for client-side routing fallback, adds a `.nojekyll` file (so GitHub doesn't try to render `README.md` as the site), and deploys.
3. If the page still shows the raw README after this, double-check that **Settings → Pages → Source** is set to **GitHub Actions** and not "Deploy from a branch" — the latter is what renders README.md via Jekyll instead of running the workflow.

**Important:** GitHub Pages only serves static files. The API server (`artifacts/api-server`) and the Postgres database it needs cannot run there — you'll need to host those separately (e.g. Render, Railway, Fly.io, a VPS) and point the web client at that API's URL for the deployed site to actually load data.

### Making login work on the deployed site

The frontend on GitHub Pages and the API server live on different domains, so this needs three things, all already wired up in this repo:

1. **Deploy `artifacts/api-server` somewhere** (Render, Railway, Fly.io, a VPS...) with `DATABASE_URL` and `NODE_ENV=production` set. Note the public URL you get, e.g. `https://devdex-api.onrender.com`.
2. **Tell the frontend build where the API is.** In the repo, go to **Settings → Secrets and variables → Actions → Variables** and add a repo variable named `VITE_API_URL` with that URL. The `deploy-pages.yml` workflow already passes it through at build time.
3. **Push to `main`** to rebuild and redeploy the frontend with the new API URL baked in.

Without step 2, the deployed site has no idea where the API is and every request (including login) silently fails.
