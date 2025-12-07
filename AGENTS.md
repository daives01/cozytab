# AGENTS.md - Cozytab Monorepo Quick Facts

## Overview
- Cozytab lets users or guests build shareable rooms with draggable catalog items, shortcuts, and optional music. Rooms are created from templates; one room is marked active.
- Auth via Clerk; guest sessions can be imported on sign-in (referrals add cozy coins). Presence/presence leases handled with Convex plus a Cloudflare Worker.

## Tech Stack
- React 19 + React Router 7, TypeScript, Vite 7 (packageManager: bun@1.1.32).
- Styling: Tailwind CSS v4 + tw-animate-css, shadcn-style primitives, “Cozy Neo-Brutalism” theme (warm paper palette, thick borders, hard shadows) defined in `src/App.css`.
- Backend: Convex 1.30 (auth, database, storage) with Clerk integration.
- Worker: `presence-worker` Cloudflare Worker (Wrangler 4, Hono) for realtime presence forwarding.

## Repo Layout
- `/` web app (React + Tailwind), shared guest helpers in `shared/`.
- `/convex` Convex schema, queries/mutations, and auth config.
- `/presence-worker` Cloudflare Worker for presence.
- `public/` static assets.

## Data Model (Convex)
- `users`: externalId, username, displayName?, currency, cursorColor?, computer?{shortcuts[id,name,url,row,col], cursorColor?}, lastDailyRewardDay?, loginStreak?, onboardingCompleted?, referralCode, referredBy?, admin?; indexes `by_externalId`, `by_referralCode`, `by_referredBy`.
- `roomTemplates`: name, description?, basePrice, backgroundUrl, isDefault; index `by_default`.
- `rooms`: userId, templateId, name, isActive, items[], shortcuts?; indexes `by_user`, `by_user_active`.
  - Items: id, catalogItemId, x, y, url?, flipped?, musicUrl?, musicType?("youtube"), musicPlaying?, musicStartedAt?, musicPositionAtStart?.
  - Shortcuts: id, name, url, row?, col?.
- `roomLeases`: roomId, hostId, lastSeen, expiresAt; indexes `by_room`, `by_host`.
- `catalogItems`: name, category (string), basePrice, assetUrl, defaultWidth; index `by_name`.
- `inventory`: userId, catalogItemId, purchasedAt, hidden?; indexes `by_user`, `by_user_and_item`.
- `roomInvites`: roomId, token, code, createdAt, expiresAt?, isActive, createdBy; indexes `by_token`, `by_room`, `by_code`.

## Frontend Types & Flows
- Types: `RoomItem` aligns with stored item fields; `CatalogItemCategory` = "Furniture" | "Decor" | "Computers" | "Music"; guest types add optional scale/rotation/zIndex for client-only transforms.
- Routing (`src/App.tsx`): `/` renders `RoomPage` (guest store when signed out), `/visit/:token` for invites, `/ref/:code` captures referral, `/admin` admin panel. Sign-in triggers `users.ensureUser` (imports guest session + referral, then clears guest data).
- Rooms: active room via `rooms.getMyActiveRoom` (or `rooms.getDefaultRoom` for guests); save items with `rooms.saveMyRoom`, shortcuts with `rooms.saveShortcuts`, music state with `rooms.updateMusicState`; invites resolved with `rooms.getRoomByInvite` (honors leases from `roomLeases`).
- Catalog/shop: `catalog.list` for drawer/shop; inventory persisted in `inventory`; admin-only catalog mutations and storage upload helpers live in `convex/catalog.ts`.

## Design System: Cozy Neo-Brutalism
- Look: warm paper (`#f8f4ec` background, `#fff7e6` headers), deep ink text (`#111827`), bold 2px borders using `var(--color-foreground)`, and flat hard shadows (e.g., `shadow-[8px_8px_0px_0px_var(--color-foreground)]`).
- Shape/feel: rounded-3xl cards/modals, rounded-xl inputs/buttons, occasional rounded-full icon buttons; hard shadows only, no blur. Active/press state translates to cover the shadow (`translate-x-[4px] translate-y-[4px] shadow-none` on click).
- Layout patterns: modal headers are bordered strips with left icon token + title/subtitle and right circular close button; include visual “stage” areas with subtle patterns for objects; prefer fixed heights and dashed borders for empty states.
- Typography & motion: bold/tight headings, uppercase wide-tracked labels; primary fonts in `src/App.css` (`Libre Baskerville`, `Lora`, `IBM Plex Mono`), optional playful handwriting for loading; use Tailwind animate-in/fade/slide utilities for transitions.
- Always prefer design system tokens: use `var(--color-*)` palette, `--shadow-*` presets, and theme radii before hard-coding colors, shadows, or radii.
- Reference snippet (Tailwind):

```tsx
<div className="rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[8px_8px_0px_0px_var(--color-foreground)] overflow-hidden">
  <div className="flex items-center justify-between border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-6 py-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold leading-none">Title</h2>
        <p className="text-xs uppercase tracking-widest">Subtitle</p>
      </div>
    </div>
    <button className="h-9 w-9 rounded-full border-2 border-[var(--color-foreground)] shadow-[2px_2px_0px_0px_var(--color-foreground)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
      <X />
    </button>
  </div>
  <div className="p-6">{/* content */}</div>
</div>
```

## Dev Workflow (Bun)
- Install: `bun install`.
- Run: `bun run web` (Vite), `bun run convex`, `bun run --filter presence-worker dev`, or `bun run all` to start web + convex + worker.
- You do NOT need to try running/install the apps, the user already is running them.
- Checks (agents SHOULD run): `bun run build` for type-check + build; staged lint: `bunx lint-staged`; full lint: `bun run lint`; preview: `bun run preview`.
- Convex dev server auto-runs codegen; agents do NOT run `convex:codegen`. Deploy with `bun run convex:deploy` only when asked.
- Worker deploy: `bun run --filter presence-worker deploy`.
- Env: `.env.local` needs `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_ISSUER_DOMAIN`.

## Status
- Tests: none committed.
- Last Updated: 2025-12-07
- Maintainer: Agent-generated documentation
- Project Status: Active Development
