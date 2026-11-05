# Tooling foundation and adoption plan

Reference: https://github.com/daives01/risk/issues/17 and https://oxc.rs/docs/guide/usage/linter.html.
Registry verified Oxlint/@oxlint/plugins 1.91.0 and Oxfmt 0.76.0. Keep the lint pair pinned together.
Compatible dependency refresh uses existing manifest ranges across workspaces. Defer major upgrades (ESLint, Vite/plugin-react, TypeScript, Node types, lucide), pre-1.0 convex-test migration, and Stripe component update. Stripe 0.1.7 requires regenerated component API; retain exact 0.1.1 pending a separate component API compatibility migration; the running Convex dev server owns code generation.

ESLint remains authoritative for React hooks and refresh. Oxlint adds default correctness diagnostics only. Generic anti-slop rules are pinned and vendored for opt-in audit only (PR #9). Formatting now has a dedicated baseline and format:check is included in check. Generated Convex, build output, dependencies, Wrangler output and unrelated research are excluded. Public assets and lockfile are also excluded from formatting.

## Sequential checklist (issue body)

- [x] Merge dependency/tooling foundation after fresh independent review. Record build, lint, tests, Oxlint and formatting baseline.
- [ ] Land a dedicated formatting baseline PR, verify readable-spacing compatibility, then add format:check to the normal check gate.
- [ ] Assess remaining major dependency migrations separately, including Workers types 5, ESLint, Vite, TypeScript, lucide, convex-test and Stripe component compatibility. Record updates or concrete deferrals.
- [x] Pin an upstream anti-slop commit, review and vendor generic plugin sources with license, provenance and upgrade instructions. Add opt-in audit only; inventory every rule with counts and false positives. Do not add Effect rules without Effect usage.
- [ ] Review accumulator copying and eager pipelines: oxc/no-accumulating-spread, no-reduce-accumulator-copy, no-array-filter-map. Preserve callback order and immutability.
- [ ] Adopt no-chained-type-assertions and no-widen-then-assert separately using accurate types and typed fixture builders.
- [ ] Evaluate no-reflect-get and no-reflect-apply with receiver and missing-property tests.
- [ ] Review no-conditional-empty-object-spread; preserve omitted fields at Convex, storage and guest import boundaries.
- [ ] Evaluate no-object-parameters, no-unsafe-dictionary-type and no-known-value-widening separately; preserve safe runtime lookups.
- [ ] Inventory external inputs; evaluate no-unknown-parameters, no-unknown-returns and no-unknown-type-aliases individually after boundary validation exists.
- [ ] Evaluate no-runtime-typeof after parsing work, documenting predicate exemptions.
- [ ] Audit no-module-mocking against actual Bun detection; replace relevant mocks with tested dependency seams.
- [ ] Trial require-readable-spacing against Oxfmt and no-shape-in-symbol-names against domain vocabulary. Explicit deferral is acceptable.
- [ ] Evaluate require-safety-comment-for-type-assertion after assertion cleanup; document concrete invariants, never boilerplate assurances.
- [ ] Reinventory all pinned generic rules; record enabled/deferred status, remove temporary overrides and document synchronized upgrades. New upstream rules require new review.

For each step start from the merged predecessor, change one rule/group in one bounded subsystem, record before/after counts and exact scope, inspect every finding, preserve auth/presence/music/guest contracts, and add behavioral tests only where behavior changes. No blanket disables, broad casts or cosmetic rewrites. Enable errors only at zero unexplained findings. Run check plus targeted tests, obtain fresh review and merge before beginning the next piece. Keep formatting-only work separate. User authorization does not mandate adopting every opinionated rule.

Worker registry assessment: Hono 4.13.16 and compatible Workers types 4.20260702.1 selected. Workers types latest 5.20261104.1 is a separate major migration. Wrangler aligned with root 4.158.0.
