# Workers types migration — issue #7

Base: 296eaa9. Registry latest verified on 2026-11-06:
`@cloudflare/workers-types` 5.20261106.1 (the proposed 5.20261104.1 is superseded).
Updated presence-worker from ^4.20260702.1 to ^5.20261106.1 and its lock integrity.
Bun also removes Wrangler's redundant older types resolution; Wrangler itself remains 4.158.0.

Primary evidence:

- [npm registry latest](https://registry.npmjs.org/@cloudflare/workers-types/latest): version and integrity match bun.lock.
- [Cloudflare TypeScript migration guidance](https://developers.cloudflare.com/workers/languages/typescript/): v5 removes dated entrypoints and exposes latest runtime types. This project already uses the undated entrypoint. Wrangler-generated types are preferable for matching the configured date and flags; adopting them requires a generated declaration and type-generation/CI lifecycle. Deferred from this bounded package update; no application code generation or Env rewrite performed.
- [Durable Object base class](https://developers.cloudflare.com/durable-objects/api/base/): existing cloudflare:workers import, DurableObject<Env>, constructor and WebSocket handlers remain compatible with installed declarations.
- [WebSocket attachments](https://developers.cloudflare.com/durable-objects/best-practices/websockets/): installed index.d.ts retains serializeAttachment(attachment: any): void and deserializeAttachment(): any | null. Existing internal typed attachment boundary requires no new assertion or suppression.

Hono 4.13.16 routing, cors and stub.fetch compile with the new types. No source changes were necessary. Worker configuration remains compatibility_date 2024-11-01 with no compatibility flags. In particular, newer WebSocket close-handshake defaults are not enabled by upgrading declarations. Runtime behavior and deployment configuration are unchanged.

Validation: full bun run check passes formatting/spacing, all 14 enforced policies, both linters, worker typecheck, build, and 139 tests / 870 assertions. Existing roomDraft lint warning remains. Frozen install passes without changes; all vendor/anti-slop SHA256SUMS pass. No runtime changes warranted new tests. Typechecking retains existing skipLibCheck; this does not prove every latest ambient API exists on the older runtime target. No Worker deployment or runtime integration test performed. Parent fresh review and CI remain required.

Parent Stripe verification text and candidate patch, research files and Taskbar stash are outside this commit and preserved.
