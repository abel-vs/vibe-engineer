# Repository Guidelines

This workspace powers the Vibe Engineer Next.js experience; use the following practices so features, tooling, and automation stay predictable.

## Project Structure & Module Organization
Application routes live in `src/app` (App Router, API handlers, client pages). Shared UI and logic sit in `src/components`, `src/contexts`, `src/hooks`, and `src/lib`, while automation helpers and validation harnesses are under `src/scripts`. Documentation and assets live in `docs`, `examples`, and `public`. Keep new modules colocated with their feature (e.g., `src/components/toolbar/`), and expose cross-cutting utilities through `src/lib` to avoid circular imports.

## Build, Test, and Development Commands
Use PNPM consistently: `pnpm dev` for the live Next server, `pnpm build` for production compilation, and `pnpm start` to serve the output. Run `pnpm lint` before every commit—ESLint uses the Next config plus TypeScript rules. Schema and voice harnesses can be exercised with `pnpm tsx src/scripts/test-schema.ts` and `pnpm tsx src/scripts/test-voice-api.ts`, which hit the local API routes and require the same env keys as production.

## Coding Style & Naming Conventions
Stick to TypeScript with 2-space indentation and strict imports (use `@/` aliases defined in `tsconfig.json`). UI components and contexts should be PascalCase (`ModeSwitcher.tsx`), hooks start with `use`, and helper modules are camelCase (e.g., `lib/auto-layout.ts`). Tailwind CSS classes belong inline with semantic ordering (layout → color → motion); rely on `clsx`/`cva` for conditional styling. Let ESLint surface formatting issues and run `pnpm lint --fix` for low-risk cleanup rather than manual reflows.

## Testing Guidelines
While the repo currently leans on script-based validation, all new features must carry executable checks. Prefer colocated `*.test.ts` files using `tsx` when exercising data/diagram logic; UI behavior can be verified through Cypress-style steps documented in PRs until browser tests are added. Always run `pnpm lint` plus the relevant `pnpm tsx src/scripts/...` commands, and document required API mocks or fixtures in `docs/` to keep voice and diagram flows reproducible.

## Commit & Pull Request Guidelines
Follow the Conventional Commit pattern seen in `git log` (`feat:`, `refactor:`, `fix:`). Commit early but keep each change focused on one concern. PRs must include: short summary, linked Linear/GitHub issue, screenshots or animation for UI updates, a checklist of commands run, and any environment variables touched (e.g., `CEREBRAS_API_KEY`, `ELEVENLABS_API_KEY`, `TEST_API_URL`). Tag reviewers who own the updated surface area and wait for automated lint/tests before merging.

## Security & Configuration Tips
Local development and CI require the Cerebras and ElevenLabs keys along with optional `TEST_API_URL`. Store them in `.env.local`, never in code. API routes echo stack traces only when `NODE_ENV=development`; confirm production logging stays redacted whenever you add diagnostics.
