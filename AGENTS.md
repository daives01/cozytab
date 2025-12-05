# AGENTS.md - Cozytab Monorepo Quick Facts

## Overview
- Cozytab lets users or guests build shareable rooms with draggable catalog items, shortcuts, and optional music. Rooms are created from templates; one room is marked active.
- Auth via Clerk; guest sessions can be imported on sign-in (referrals add cozy coins). Presence is handled with Convex plus a Cloudflare Worker.

## Tech Stack
- React 19 + React Router 7, TypeScript, Vite 7 (packageManager: bun@1.1.32).
- Styling: Tailwind CSS v4 + tw-animate-css, radix/shadcn-style UI pieces, warm paper palette with serif fonts (Libre Baskerville/Lora) defined in `src/App.css`.
- Backend: Convex 1.30 (auth, database, storage) with Clerk integration.
- Worker: `presence-worker` Cloudflare Worker (Wrangler 4) for realtime presence forwarding.

## Repo Layout
- `/` web app (React + Tailwind), shared guest helpers in `shared/`.
- `/convex` Convex schema, queries/mutations, and auth config.
- `/presence-worker` Cloudflare Worker for presence.
- `public/` static assets.

## Data Model (Convex)
- `users`: externalId, username, displayName?, currency, computer.shortcuts[], lastDailyReward?, onboardingCompleted?, referralCode, referredBy?, admin?; indexes `by_externalId`, `by_referralCode`, `by_referredBy`.
- `roomTemplates`: name, description?, basePrice, backgroundUrl, isDefault; index `by_default`.
- `rooms`: userId, templateId, name, isActive, items[], shortcuts?; indexes `by_user`, `by_user_active`.
  - Item fields: id, catalogItemId, x, y, url?, flipped?, musicUrl?, musicType? ("youtube"), musicPlaying?, musicStartedAt?, musicPositionAtStart?.
  - Shortcuts: id, name, url.
- `catalogItems`: name, category, basePrice, assetUrl, defaultWidth; index `by_name`.
- `inventory`: userId, catalogItemId, purchasedAt, hidden?; indexes `by_user`, `by_user_and_item`.
- `roomInvites`: roomId, token, createdAt, expiresAt?, isActive, createdBy; indexes `by_token`, `by_room`.

## Frontend Types & Flows
- `RoomItem` matches the room item fields above; `CatalogItemCategory` = "Furniture" | "Decor" | "Computers" | "Music".
- Routing (`src/App.tsx`): Signed-out users see `RoomPage` in guest mode; signed-in users call `users.ensureUser` (imports guest session + referral) then view `RoomPage`. Routes include `/visit/:token` (invites) and `/admin`.
- Rooms: active room fetched via `rooms.getMyActiveRoom` (or `rooms.getDefaultRoom` for guests); save items with `rooms.saveMyRoom`, shortcuts with `rooms.saveShortcuts`, and music state with `rooms.updateMusicState`. Invites resolved with `rooms.getRoomByInvite`.
- Catalog/shop: `catalog.list` for drawer/shop; inventory is persisted in `inventory`; admin-only catalog mutations and storage upload helpers live in `convex/catalog.ts`.

## Dev Workflow (Bun)
- Install: `bun install`.
- Run: `bun run web` (Vite), `bun run convex`, `bun run --filter presence-worker dev`, or `bun run all` to start web + convex + worker.
- You do NOT need to try running/install the apps, the user already is running them
- Checks (agents SHOULD run): `bun run build` for type-check + build; staged lint: `bunx lint-staged` (runs lint on staged files); full lint: `bun run lint`; preview: `bun run preview`.
- Convex dev server auto-runs codegen; agents do NOT run `convex:codegen`. Deploy with `bun run convex:deploy` only when asked.
- Worker deploy: `bun run --filter presence-worker deploy`.
- Env: `.env.local` needs `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_ISSUER_DOMAIN`.

## Status
- Tests: none committed.
- Last Updated: 2025-12-05
- Maintainer: Agent-generated documentation
- Project Status: Active Development
