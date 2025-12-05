# Cozytab monorepo (Bun)

## Workspace layout
- `./` – Vite web app (React 19 + Tailwind)
- `convex/` – Convex functions and schema
- `presence-worker/` – Cloudflare Worker for presence

## Setup
- Install Bun (1.1.32): follow https://bun.sh
- Install deps: `bun install`

## Common scripts
- Web dev: `bun run web`
- Web build: `bun run build`
- Lint: `bun run lint`
- Convex dev: `bun run convex` (runs `bunx convex dev` from root)
- Convex deploy: `bun run convex:deploy`
- Convex codegen: `bun run convex:codegen`
- Worker dev: `bun run --filter presence-worker dev` (or `cd presence-worker && bun run dev`)
- Worker deploy: `bun run --filter presence-worker deploy`

## Deployment
- Vercel: install via `bun install`, build via `bunx convex deploy --cmd "bun run build"` (configured in `vercel.json`). Set `BUN_VERSION=1.1.32` in project settings if Vercel doesn’t auto-detect.
- Convex: deployment piggybacks on the Vercel build command above.
- Cloudflare Worker: `bun run --filter presence-worker deploy` using Wrangler.

## CI (GitHub Actions)
Add Bun to runners (e.g., `oven-sh/setup-bun`) and use `bun install` + workspace scripts for web, convex, and worker. Use the same build command as Vercel to stay consistent.
