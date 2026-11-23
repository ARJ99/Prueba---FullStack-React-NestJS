# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package overview

NestJS 12 API for the full-stack assessment starter. See the repo-root CLAUDE.md for the monorepo-level picture (this package is orchestrated via root scripts using `--prefix api`). Everything here currently comes straight from the Nest CLI scaffold — architecture decisions (layering, entities, repositories, database) are expected to be made and justified as part of the work.

## Commands (run from `api/`)

```bash
npm run start:dev    # dev server in watch mode (port 3000)
npm run build        # nest build → dist/
npm run lint         # oxlint --type-aware on src/ and test/
npm run format       # prettier --write on src/ and test/
npm test             # unit tests (Vitest): **/*.spec.ts
npm run test:watch
npm run test:e2e     # **/*.e2e-spec.ts via vitest.config.e2e.ts
npm run test:cov
npm run test:debug
```

Single test file: `npm test -- src/app.controller.spec.ts`.

Scaffold new modules with `nest g resource <name>` (uses `@nestjs/schematics`; see `nest-cli.json`) — generated imports follow the ESM `.js` extension style described below.

## TypeScript / module setup

- **ESM package** (`"type": "module"`) with `module: nodenext`: all internal relative imports must use the **`.js` extension** even in `.ts` files (e.g. `import { AppService } from './app.service.js'`). Keep this style when adding files.
- Decorators are on (`emitDecoratorMetadata`, `experimentalDecorators`); `strict` is on, `strictPropertyInitialization` is off.
- `tsconfig.build.json` excludes `test/` and `*.spec.ts` from the compiled output (`rootDir: ./src`).

## Testing

- **Vitest** (not Jest), with `globals: true` — `describe`/`it`/`expect` need no imports; `vitest/globals` is in tsconfig `types`.
- Both unit and e2e configs use `resolve: { tsconfigPaths: true }` (Vite 8 feature), so tsconfig path aliases — including ones added by `nest g library` — work in tests without extra plugins.
- e2e tests bootstrap the full `AppModule` with `Test.createTestingModule` + `app.init()`, then hit it with `supertest` (`request(app.getHttpServer())`). `supertest/types.js` import also uses the `.js` suffix. Tests must call `app.close()` in teardown (see `test/app.e2e-spec.ts`).
- There is **no real database** in the scaffold — e2e tests run against the in-memory module only.

## Linting and formatting

- **oxlint** with type-aware rules (`oxlint-tsgolint`), config in `.oxlintrc.json`: `typescript/no-floating-promises` is an **error** — never leave promises unawaited; `typescript/no-explicit-any` is off.
- Prettier config: single quotes, trailing commas everywhere.

## Runtime configuration

`src/main.ts` enables CORS for `WEB_ORIGIN` (default `http://localhost:5173`) and listens on `PORT` (default 3000). These are plain `process.env` reads — no config module exists yet.
