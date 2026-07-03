# AGENTS Guidelines for This Repository

## Common Commands & Verification

- Only use `corepack pnpm` as the package manager — never npm / yarn (`packageManager` pins the pnpm version).
- After making changes, verify in this order: `corepack pnpm build` (includes vue-tsc type checking) → `corepack pnpm lint` → `corepack pnpm exec vitest run <relevant test files>`.
- Leave formatting to `corepack pnpm format` or `corepack pnpm lint:fix`; do not hand-format code (the project uses the @refinist config plus the Tailwind class-sorting plugin).

## Project Structure Map

- `src/preview/` — status line rendering engine (colors, powerline, renderers, previewText); the most heavily tested area.
- `src/widgets/` — widget definitions and options.
- `src/stores/config.ts` — core config store.
- `src/i18n/locales/` — localized copy (en, zh-CN, zh-TW).
- `src/templates/` — preset templates.
- The companion `ccsa` CLI lives in its own repository (refinist/ccstatusline-apply); this repo only references it as command strings (`npx -y ccsa@latest …`). When the CLI's behavior changes, update the copy here (help center, playground, templates) to match.
- `worker/` — Cloudflare Worker entry.

## UI Component Conventions

- The project uses shadcn-vue (components live in `src/components/ui/`, config in `components.json`). If shadcn-vue already provides a component, use it directly or add it via `pnpm dlx shadcn-vue@latest add <component>` — do not implement it yourself, and do not build your own wrapper on top of reka-ui from scratch.
- Stick to shadcn-vue's built-in styles and variants as much as possible; do not pile on custom styles. When customization is truly needed, prefer small class tweaks over writing a separate set of styles.

## i18n Conventions

- When adding or changing UI copy, you must update all locale files under `src/i18n/locales/` (en, zh-CN, zh-TW) in sync — never change just one language.

## Testing Conventions

- Tests are colocated with source files and named `*.test.ts`.
- When adding or changing logic in `src/preview/`, `src/widgets/`, or `src/stores/`, add or update the corresponding tests.
- Run focused tests with `corepack pnpm exec vitest run <file>`; do not run the full suite by default.

## Dev Server Ownership

- Any dev server that is already running is considered owned by the user. Do not use it to verify results, and do not stop, restart, or kill it.
- Prefer static verification, such as `corepack pnpm build`, type checking, or focused tests.
- If browser or runtime verification truly requires a dev server, start a new temporary one on an available port. If the target port is taken, pick another port — do not stop existing processes.
- Keep track of any temporary server processes or sessions you start, and use only that temporary server for verification.
- After verification, you must shut down any temporary server you started. Do not leave agent-started dev servers running at the end of a task.
