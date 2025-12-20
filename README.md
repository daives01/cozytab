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

## Stripe coin purchases

- **Environment** – Add the following Convex variables:
  - `STRIPE_SECRET_KEY`: your Stripe secret key (test or live).
  - `STRIPE_WEBHOOK_SECRET`: webhook signing secret for `https://<deployment>.convex.site/stripe/webhook`.
  - `APP_URL`: the publicly accessible base URL for your frontend (e.g., `https://cozytab.com`). This is used for Stripe success/cancel redirects.
  - `STRIPE_PRICE_10_COINS`, `STRIPE_PRICE_50_COINS`, `STRIPE_PRICE_150_COINS`, `STRIPE_PRICE_500_COINS`: Stripe price IDs for the four purchasable coin packs.
- **Webhook** – Register `https://<your-deployment>.convex.site/stripe/webhook` in the Stripe dashboard and include at least `checkout.session.completed`, `invoice.*`, `payment_intent.*`, and any other events on the [Convex Stripe docs](https://www.convex.dev/components/stripe) page.
- **Price IDs → Coins** – The UI exposes four pre-configured packs:
  1. `STRIPE_PRICE_10_COINS` → 10 cozy coins ($3 USD)
  2. `STRIPE_PRICE_50_COINS` → 50 cozy coins ($10 USD)
  3. `STRIPE_PRICE_150_COINS` → 150 cozy coins ($25 USD)
  4. `STRIPE_PRICE_500_COINS` → 500 cozy coins ($50 USD)
- **Discount guards** – Stripe webhooks route through `/stripe/webhook`, and a custom handler credits coins via the existing `currencyTransactions` ledger with an idempotency key of `stripe:checkout:<eventId>`.
- **Testing** – Use Stripe's test cards (`4242 4242 4242 4242`) plus the Stripe dashboard `Send test webhook` button to confirm the webhook fires and transactions appear exactly once.
