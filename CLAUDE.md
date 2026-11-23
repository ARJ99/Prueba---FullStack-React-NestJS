# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A full-stack technical assessment starter: a bare NestJS API (`api/`, port 3000) and a React + Vite frontend (`web/`, port 5173), pre-wired to talk to each other. It intentionally contains only what the Nest and Vite CLIs generate — no layered architecture, no entities, no repository pattern, no component library, no state management. Those decisions are the deliverable: when making them, document the rationale (the assessment asks for it, and the README must be replaced with the author's own before submission).

The README and code comments are in Spanish; the placeholder App screen (`web/src/App.tsx`) exists only to verify frontend↔backend connectivity and is meant to be deleted.

## Commands

All commands run from the repo root and operate on both packages (`postinstall` installs `api/` and `web/` automatically after root install).

```bash
npm install        # installs root, api/, and web/
npm run dev        # API + web concurrently (API in watch mode)
npm run dev:api    # API only
npm run dev:web    # web only
npm run build      # build both (api: nest build, web: tsc -b && vite build)
npm test           # API unit tests (Vitest)
npm run lint       # oxlint for both packages
```

### Tests (Vitest, API only)

```bash
npm test                      # unit tests: **/*.spec.ts
npm run test:watch --prefix api
npm run test:e2e --prefix api # e2e tests: **/*.e2e-spec.ts (vitest.config.e2e.ts, uses supertest)
npm run test:cov --prefix api
```

To run a single test file: `npm test --prefix api -- <path-to-file>` (e.g. `npm test --prefix api -- src/app.controller.spec.ts`).

Note: unit and e2e tests are driven by separate Vitest configs (`vitest.config.ts` / `vitest.config.e2e.ts`) matching `*.spec.ts` vs `*.e2e-spec.ts`; both resolve tsconfig path aliases via `resolve: { tsconfigPaths: true }` (requires Vite 8). Test globals are enabled, so `describe`/`it`/`expect` need no import.

## Architecture

Two independent npm packages (`api/`, `web/`) orchestrated by root scripts via `--prefix`; there is no monorepo tooling (no workspaces).

- **API** — NestJS 12 with TypeScript ESM (`"type": "module"`; internal imports use `.js` extensions, e.g. `./app.service.js`). Module resolution is `nodenext`. Currently just the scaffold: `AppModule` → `AppController` → `AppService` (returns "Hello World!"). CORS is enabled in `api/src/main.ts` for the origin in `WEB_ORIGIN` (default `http://localhost:5173`); the port comes from `PORT` (default 3000).
- **Web** — React 19 + Vite. The only meaningful wiring is `web/src/api.ts`: the API base URL comes from `VITE_API_URL` (default `http://localhost:3000`), exposed through `apiUrl(ruta)`. An example env file is at `web/.env.example`. No router, no fetch wrapper beyond that, no state library.
- **Contract between the two**: the web app calls the API directly by absolute URL (no Vite dev proxy), so CORS is the mechanism that connects them. If the web port changes, `WEB_ORIGIN` must change too.

## Conventions

- TypeScript `strict` is on in both packages. The API uses decorators (`emitDecoratorMetadata`, `experimentalDecorators`) and targets ES2023.
- Linting is **oxlint** (not ESLint), type-aware in `api/` (see `api/.oxlintrc.json`): `typescript/no-floating-promises` is an error, `typescript/no-explicit-any` is off. Formatting is Prettier (`npm run format --prefix api`).
- Node 22 (`.nvmrc`); npm 10+ is required — install fails on npm 9.2.
