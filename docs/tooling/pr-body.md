Dependency drift and the absence of an incremental lint foundation make policy adoption difficult to review. This PR refreshes compatible root and worker dependencies, adds pinned Oxlint/Oxfmt and explicit commands/exclusions, preserves React ESLint coverage, and resolves five React lint findings without suppressions.

The root check now includes worker typechecking. Broad anti-slop enforcement and the formatting baseline remain separate planned PRs. Stripe component compatibility and major dependency migrations are explicitly tracked follow-ups.

Validation: bun run check passes, including build and 110 tests. One Oxlint advisory and the Vite bundle-size advisory remain. Formatting remains a separate failing baseline; no formatting rewrite applied. Fresh independent reviews covered the foundation and behavioral tests. Findings were addressed, including a controlled-clock invite test that verifies callback-driven expiry.

Preview deployment also exposed eager Stripe price validation during Convex module analysis. Validation now runs at payment request boundaries, allowing previews without billing configuration while checkout and fulfillment still reject missing/blank prices. Full check passes with 113 tests, including configuration regression coverage.
