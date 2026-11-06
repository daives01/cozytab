# Foundation verification

`bun run check` passes after compatible root and worker dependency updates and five React lint fixes: Oxlint, ESLint, worker typecheck, app typecheck/build, and 110 tests across 17 files. Oxlint retains one advisory no-useless-fallback-in-spread finding in roomDraft.ts. Vite reports its bundle-size advisory.

Formatting remains a separate baseline (previous run: 215 files); no mass formatting applied. The plan explicitly schedules formatting adoption before adding it to check.

The earlier dependency baseline was not measured. The five findings were in unchanged application source under the refreshed tooling; they have now been fixed without suppressing React checks. Three mounted React tests now cover delayed/out-of-order music title responses, fetch failure and no-video state, display-name prop updates after saving, and expired invite updates. React test renderer emits a deprecation warning; these tests do not exercise browser DOM behavior.

Hono is updated to 4.13.16; compatible Workers types to 4.20260702.1. Workers types 5 and other major migrations are tracked separately. Stripe remains pinned to 0.1.1 pending component API compatibility work.

Publication is blocked: gh reports invalid credentials and connected GitHub issue creation returned 403 Resource not accessible by integration. No PR or issue publication is confirmed. Do not use GitKraken. Issue and PR drafts remain local.

First independent review identified check failures, missing worker typecheck/update and missing formatting step. Those are addressed. A fresh review accepted the revised application/dependency changes. A subsequent fresh review accepted music/profile coverage and found that the invite test did not prove timer execution; the test now controls Date.now and asserts the link remains until the callback runs. The focused three-test suite passes after this correction; the full check passed with 110 tests before this test-only correction. Existing Taskbar stash and docs/research/quoridor-engine.md are untouched.

## Preview deployment correction

Vercel compiled the app successfully, then Convex analysis failed on missing STRIPE_PRICE_10_COINS in the preview deployment. Price configuration is now validated inside checkout/webhook request handling through a shared helper. Missing or blank prices still throw; no placeholder prices or secrets are introduced. Tests verify modules load without billing configuration and payment validation still fails closed. Full check passes with 113 tests across 18 files. Fresh review covers this correction.

## Formatting baseline (issue #7)

Baseline from cc7cbd3: four-space indentation is prevalent (1,661 sampled statement lines at four spaces versus 146 at two); double quotes and semicolons retained, 120-column wrapping selected. Oxfmt 0.76 requires explicit --ignore-path: .oxfmtignore is not automatically discovered. Both format scripts now pass .gitignore and .oxfmtignore. Vendor, generated Convex, agent assets, public assets, lockfiles, unrelated Markdown and research remain excluded. Vendor SHA256SUMS verifies unchanged.

Full check passes including format:check and 113 tests. A second formatting check passes; git diff --check passes. TypeScript AST comparison was attempted with parentheses and JSX whitespace normalization; residual JSX representation differences require reviewer inspection, so full AST equivalence is not claimed. No semantic refactors are intended.

Pinned require-readable-spacing trial used temporary copies of tracked owned TS/TSX and a temporary rule-only config: 1,398 findings after Oxfmt, zero after rule --fix, and zero after rerunning Oxfmt. The broader repository audit reports 1,816 findings; the tracked-copy trial intentionally limits scope. The tools are compatible, but adopting spacing requires a separate reviewed blank-line baseline and enforcement decision. No spacing fixes or policy changes are included here.

Foundation #8 and audit #9 are merged; earlier publication-blocked notes above are historical. Formatting PR awaits fresh independent review by the parent; no merge or deployment performed by this implementation agent.

## Readable spacing policy (issue #7, base 9243c9e)

Globally enforce pinned anti-slop/require-readable-spacing at error (13 enforced rules). The isolated .oxlintrc.spacing.json enables only spacing and disables default correctness rules. Existing exclusions are preserved. Assertion policy remains advisory.

Workflow: bun run format runs Oxfmt → isolated spacing --fix → Oxfmt → spacing check. bun run format:check checks both and remains the first normal check gate.

Exact audit before → after: total 1674 → 248; spacing 1426 → 0; safety comments 127; runtime typeof 76; dictionaries 18; unknown parameters 16; known-value widening 11; all other audit counts zero and unchanged.

Full checks pass before and after: 117 tests / 611 assertions. All 159 changed source files pass whitespace-only comparison and transpileModule emitted runtime AST equivalence including JSX, normalizing parentheses. Adjacent JSX literal normalization was unnecessary. This verifies emitted syntax under ESNext/ReactJSX options, not arbitrary compiler settings or browser behavior. Vendor checksums and git diff --check pass. Complete formatting is byte-idempotent.

## Backend/shared assertion audit (issue #7, base 6f545d7)

Scope: owned convex/ and shared/ TypeScript, excluding generated files. Pinned require-safety-comment-for-type-assertion audit: 14 missing justifications before, zero after. Removed 13 assertions: http.ts:14 (Stripe event object already typed); inventory.ts:209 and users.ts:188 (typed global process); rooms.ts:353 (validator-inferred items), rooms.ts:496 (explicit result contract); lib/guestImport.ts:95 (already branded catalog ID); guestConversion.ts:58,59,62,63,74,75 (identity claims accepted as unknown by normalizeString); shared/coinPacks.ts:49 (generic accumulator). Locations refer to base 6f545d7.

One non-const assertion remains in http.ts at the fulfillment userId argument. createCoinCheckout writes metadata from the database user._id; fulfillCoinPurchase applies v.id("users") at the mutation boundary before invoking its handler. The assertion only transports the string to that existing runtime validator; it does not establish trust or bypass validation. Its adjacent SAFETY comment records both facts. Existing missing metadata and unsupported price checks remain intact. Const assertions are excluded by the pinned rule and preserved.

Global missing-comment baseline: 127; this scope removes 14 findings, leaving 113 outside this scope for later frontend/test/worker audits. Global enforcement remains advisory; 13 enforced rules remain unchanged. No runtime behavior change is intended. No codegen, deployment, merge, or independent review performed by this implementation agent.

## Presence worker assertion audit

PresenceRoom had 20 assertion findings. Cursor validation now declares its checked payload type, removing coordinate/field casts. The default logging branch reads the already narrowed message directly. Six attachment read assertions are consolidated in one helper whose invariant is the typed handleJoin creation and typed updateAttachment patches; Cloudflare persists these internal attachments across hibernation. It remains a trusted internal-state assertion, not validation of client input. Runtime message validation, bounds, optional-field semantics and hibernation paths are preserved.

Four retained assertions have concrete evidence: optional unknown type-property read after object/null checks; unknown-valued object view for key-by-key metadata validation; message dictionary view after type-string validation; internal attachment view backed by typed writers. Worker evidence findings20→0;93 remain outside backend/shared/worker scopes. Global assertion enforcement remains pending. Full check passes117 tests; worker typecheck included. No deployment or app startup performed locally.

## Room drag-preview assertion audit (issue #7, base 86e337b)

Bounded completed scope: src/room/utils/ (one assertion finding → zero), plus its sole drag-preview caller in AssetDrawer/components/ItemCard.tsx. querySelector("img") already produces HTMLImageElement | null; the helper now accepts that accurate producer type and drawImage needs no assertion. Two assertions removed, none retained in this piece. No runtime boundary or behavior changes; canvas failure handling and cleanup are unchanged.

Inventory using pinned audit config: src/room/ and src/guest/ have 35 → 33 missing-evidence findings; global baseline 93 → 91. Remaining room/guest scope includes hooks, RoomPage, visitor sources/pages, chat and item pointer handling, AssetDrawer normalization, and guestSession JSON parsing. These remain unaudited; guest storage parsing/persistence, save/retry and invite lifecycle semantics are unchanged. Global enforcement remains advisory.

Scoped Oxfmt and spacing pass. Full bun run check passes: 117 tests, 611 assertions. Targeted guestSession suite passes: six tests, 30 assertions. Vendor SHA256SUMS all pass; git diff --check passes. Taskbar stash and unrelated docs/research preserved. Parent fresh independent review remains required; no merge, codegen, app startup or deployment performed.

## Guest storage assertion audit (issue #7, base 76a6fbf)

Complete src/guest inventory: guestSession.ts generic parseJson assertion was the sole finding (1 → 0 missing-evidence findings). Global 91 → 90; combined room/guest 33 → 32, all remaining outside guest. Global enforcement remains advisory. JSON now enters as unknown and is decoded by the storage boundary. One retained assertion brands checked strings as opaque catalog IDs; its SAFETY evidence explicitly limits this to representation, with catalog membership filtering when available and server import validation. LocalStorage is not trusted.

Justified recovery corrections: valid JSON with null/non-array inventory or room items now recovers to empty arrays instead of throwing. Non-string inventory IDs and room items lacking string catalog IDs are discarded. Invalid optional item fields and unknown fields are omitted rather than leaking into typed domain data. Valid schema fields, missing optional fields, false values, coordinate clamping, legacy shortcut recovery, duplicate inventory ordering, starter grants and autosave storage-failure feedback remain covered. No import behavior or storage keys changed.

Full bun run check passes including format/spacing: 118 tests / 622 assertions (baseline 117 / 611). Targeted guest tests: 7 / 41 (before 6 / 30). Vendor SHA256SUMS pass; git diff --check passes. Existing Taskbar stash and docs/research untouched. Fresh independent parent review required; no agents, merge, watch, apps, codegen or deployment invoked.

PR #22 fresh review requested complete optional-field round-trip coverage. Added read/persist/read tests for every supported URL/music field, false flags, zero timestamps, and omission of malformed optional values. Removed redundant inventory/shortcut decoding. Full check now passes119 tests; guest evidence remains zero. Preview issuer configured separately; no production settings changed.

## Room hooks/session assertion audit (issue #7, base 20941dd)

Complete inventory of src/room/hooks/ and src/room/session/: 16 missing-evidence findings → 0. Session has no type-assertion findings before or after. Global 90 → 74; room 32 → 16, remaining in components/UI and other room sources outside these two folders. Global enforcement remains advisory. Const assertions are excluded by the pinned rule.

Base locations: useRoomBackgroundImageUrl.ts:20; useRoomState.ts:32; useRoomOverlaysModel.ts:114,138; useRoomHandlers.ts:126; useCursorColor.ts:16,123; useRoomData.ts:20,58; useCozyCursor.ts:17; useCursorAssets.ts:14; useRoomPageEffects.ts:27,28,209,214,374. Removed 13 assertions using inferred query/state types, checked Map reads, explicit cursor keys, validated cursor cache data, narrowed heartbeat properties and Element event targets. The debounce producer returns only a function, so its optional cancel checks never invoked cleanup and are removed without changing pending timer behavior.

Three retained assertions: the two storage-reference strings are transported to getImageUrl's v.id("_storage") validator before storage access; the drag catalog string is checked against session inventory eligibility before placement. Adjacent SAFETY comments describe these specific boundaries. No trust in arbitrary drag payload membership or storage-ID validity is established by the casts.

Cursor JSON now enters as unknown and requires a matching color and four string cursor values. Tests cover valid data, stale color, malformed JSON, null, arrays, missing values and non-string values. Room session/draft/save/retry/blocked-switch code is unchanged, including omitted draft fields and storage-error feedback. Invite timers, stop conditions and cleanup remain unchanged; property casts are removed after existing guards. Guest query fallback behavior is unchanged.

Scoped Oxfmt and spacing pass. Full bun run check passes: baseline 119 tests / 633 assertions; after 120 tests / 641 assertions. Targeted cursor cache test passes 1 / 8. Vendor SHA256SUMS and git diff --check pass. Existing Taskbar stash and docs/research preserved. Parent fresh independent review required; no agents, merges, watches, apps, codegen or deployment commands used.
