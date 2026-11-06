# Current status

See [self-contained rollout status](rollout-status.md) for current counts, merged PR links, dependency holds and Stripe compatibility validation. [Worker types migration](workers-types-migration.md) is merged in [PR #36](https://github.com/daives01/cozytab/pull/36).

- [x] Formatting/spacing gate and 14 selected policies enforced; full 19-entry audit recorded.
- [x] Toolchain, client dependencies, SunCalc and Worker types migrations merged through #36.
- [x] Five generic policies explicitly deferred with follow-ups; no temporary overrides.
- [x] Stripe 0.1.7 API compatibility and payment-boundary tests merged after fresh review and CI in [PR #38](https://github.com/daives01/cozytab/pull/38).
- [x] Synchronized Oxlint/plugins 1.92.0 and Oxfmt 0.77.0 validated; fresh review/CI pending before merge.
- [x] Remaining dependency holds are explicit: TypeScript 7 awaits parser peer support; Node 26 types await a Node 26 runtime target.

## Historical assessment and checklist

The snapshots and unchecked items below belong to their stated bases; current status above supersedes completed migration items. Remaining boundary-contract follow-ups still apply.

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
- [x] Review accumulator copying and eager pipelines: oxc/no-accumulating-spread, no-reduce-accumulator-copy, no-array-filter-map. Preserve callback order and immutability.
- [x] Adopt no-chained-type-assertions and no-widen-then-assert separately using accurate types and typed fixture builders.
- [x] Evaluate no-reflect-get and no-reflect-apply with receiver and missing-property tests.
- [x] Review no-conditional-empty-object-spread; preserve omitted fields at Convex, storage and guest import boundaries.
- [x] Assess contract policies: enable no-object-parameters (0); explicitly defer unsafe dictionaries (18) and known-value widening (11). Per-location rationale and bounded follow-ups are in anti-slop-inventory.md.
- [ ] Inventory external inputs; evaluate no-unknown-parameters, no-unknown-returns and no-unknown-type-aliases individually after boundary validation exists.
- [ ] Evaluate no-runtime-typeof after parsing work, documenting predicate exemptions.
- [x] Audit module mocking: enable Jest/Vitest-only no-module-mocking (0); manual Bun audit found no module replacements. Existing method spies remain valid seams.
- [ ] Trial require-readable-spacing against Oxfmt. Shape-name rule explicitly deferred after domain vocabulary review (0); see inventory.
- [ ] Evaluate require-safety-comment-for-type-assertion after assertion cleanup; document concrete invariants, never boilerplate assurances.
- [ ] Reinventory all pinned generic rules; record enabled/deferred status, remove temporary overrides and document synchronized upgrades. New upstream rules require new review.

For each step start from the merged predecessor, change one rule/group in one bounded subsystem, record before/after counts and exact scope, inspect every finding, preserve auth/presence/music/guest contracts, and add behavioral tests only where behavior changes. No blanket disables, broad casts or cosmetic rewrites. Enable errors only at zero unexplained findings. Run check plus targeted tests, obtain fresh review and merge before beginning the next piece. Keep formatting-only work separate. User authorization does not mandate adopting every opinionated rule.

Worker registry assessment: Hono 4.13.16 and compatible Workers types 4.20260702.1 selected. Workers types latest 5.20261104.1 is a separate major migration. Wrangler aligned with root 4.158.0.

## Assertion and Reflect policy (base 087a7d5)

Enable only no-chained-type-assertions, no-widen-then-assert, no-reflect-get and no-reflect-apply as global errors over the existing owned-source scope and exclusions. Each has 0 before → 0 after diagnostics; full audit remains 1646. No source changes or fixture builders needed. ESLint and vendored bytes remain unchanged.

Pinned source review and temporary plugin probes: chained assertions report both parenthesized as chains and angle-bracket chains (2); single assertions and all-const chains pass. Widening reports a local const unknown initialized with a known object then asserted narrower (1); unknown boundary parameters pass. It uses syntax and same-function immutable binding evidence, not checker assignability; mutable, cross-function, imported and unsupported alias flows can escape detection.

Reflect probes report direct and string-literal computed global get/apply calls (2 each), including missing-property get, get with explicit receiver, and apply with explicit this. Shadowed Reflect, aliases and dynamic computed names pass (known detection limits). Source search across src, shared, convex, presence-worker and tests found only Reflect.deleteProperty cleanup calls and unrelated Promise<unknown> annotations, no selected calls or assertion chains. No existing receiver-dependent or missing-property behavior requires migration. These bans do not prove direct property/call replacements equivalent: missing reads may yield undefined, getters use the supplied receiver, and apply preserves explicit this; any future exception requires individual semantic review. No automatic fixes. Probes were removed; no production fixtures or detector-mirroring tests added.

Unknown contract assessment: [complete location inventory and decisions](unknown-contract-assessment.md). Parameters 17, returns 3, aliases 0, typeof 76 unchanged; alias rule alone now enforced (ten rules total). Remaining contracts explicitly deferred by subsystem.

## Module mocking and symbol vocabulary assessment (base 391140e)

Enable `no-module-mocking` globally at error with existing exclusions: 0 before → 0 after; twelve enforced rules total. This is specifically Jest/Vitest enforcement, not Bun enforcement. The pinned detector recognizes global vi/jest and named imports (including renamed imports) from vitest/@jest/globals, calling mock, doMock or unstable_mockModule through direct or literal-computed members. It does not follow local aliases, destructured methods, namespace imports or dynamic member names. Neither selected rule exposes configurable options.

Owned-source audit across src, shared, convex, presence-worker/src and tests inspected framework imports and mock/spy usages including aliases: no Jest/Vitest imports or calls and no Bun mock.module calls or aliases. Bun imports use named test helpers; tests/roomItemUrl.test.ts uses mock as an injected window-open callback. tests/reactRefactors.test.tsx spies on watchQuery/mutation of a real disabled ConvexReactClient supplied through ConvexProvider, fetch and Date.now; tests/roomPageEffects.test.tsx spies on timers. These method seams do not replace modules and do not warrant a mock refactor or blanket spy ban. Backend tests use convex-test with real registered modules. Future Bun module replacement needs source review; this rule cannot catch it.

Explicitly defer `no-shape-in-symbol-names`, 0 before → 0 after. Exact semantics are a hardcoded case-insensitive substring `shape` on Identifier, PrivateIdentifier and JSXIdentifier, excluding noncomputed borrowed member names. It does not ban square, circle or rect. Existing legitimate domain geometry includes chess Square/squareStyles, RoomToolbar circleBaseStyles, DOMRect room actions and drag/cursor bounds. No current shape match is evidence of clean counts only: future geometry names such as collisionShape would be rejected without understanding ownership; unrelated reshape names also match. This vocabulary restriction adds no demonstrated correctness benefit to a spatial room editor. Retain audit-only status, with no gratuitous renaming or custom ban.

No runtime changes or additional tests are needed. Existing policies, vendor bytes and exclusions remain unchanged.
