# Repository Guidelines

## Project Structure & Module Organization
- `src/` TypeScript Worker code. Entry: `src/index.ts` (routes `/api/chat` and serves `ASSETS`). Shared types in `src/types.ts`.
- `public/` Static UI (`index.html`, `chat.js`) served at root (`/`).
- `wrangler.jsonc` Cloudflare Worker config (bindings: `AI`, `ASSETS`).
- `tsconfig.json` TypeScript settings (strict, ESM).
- `package.json` Scripts and dev tooling.

## Build, Test, and Development Commands
- `npm run dev` Start local dev server with Wrangler at `http://localhost:8787`.
- `npm run deploy` Publish the Worker to Cloudflare.
- `npm run check` Type-check and do a dry-run deploy.
- `npm run cf-typegen` Generate Cloudflare types for bindings.
- `npm test` Run Vitest test suite.

Example: regenerate types and start dev
```
npm run cf-typegen && npm run dev
```

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Target `es2021`, ESM `es2022`.
- Indentation: 2 spaces. Line-endings: LF.
- Files: lower-kebab-case where possible (e.g., `chat.js`, `types.ts`).
- Names: `PascalCase` for types/interfaces, `camelCase` for variables/functions.
- Keep the Worker export pattern: `export default { fetch } satisfies ExportedHandler<Env>`.
- Run `npm run check` before pushing; fix type errors instead of suppressing.

## Testing Guidelines
- Framework: Vitest with Workers pool (`@cloudflare/vitest-pool-workers`).
- Location: `src/**/*.test.ts` or `test/**/*.test.ts`.
- Best practices: stub `env.AI` and `env.ASSETS.fetch`, test `/api/chat` behavior and SSE chunk handling.
- Commands: `npm test` (add `--watch` locally if desired).

## Commit & Pull Request Guidelines
- Commits: prefer Conventional Commits (e.g., `feat: stream SSE responses`), small and focused.
- PRs: include a clear description, linked issues, test coverage notes, and screenshots/GIFs for UI changes.
- Checklist: passing `npm run check`, `npm test`, no secrets in diff, docs updated when behavior changes.

## Security & Configuration Tips
- Do not hardcode secrets. Use Wrangler secrets: `npx wrangler secret put NAME`.
- Workers AI usage may incur costs even in dev; monitor with `npx wrangler tail`.
- Keep `wrangler.jsonc` bindings in sync with code (`AI`, `ASSETS`).
