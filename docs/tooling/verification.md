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

## Remaining room components assertion audit (issue #7, base fe2f3f2)

Complete remaining src/room components/utilities inventory: 16 missing-evidence findings → 0; global 74 → 58. Hooks/session remain clear and unchanged. Base locations: RoomPage.tsx:71,85,86,412; ChatInput.tsx:39,100; AssetDrawer/index.tsx:34,37,44,62,108,142; MobileChatInput.tsx:69; visitorRoomSource.ts:29; ItemNode.tsx:158; FriendVisitPage.tsx:60. Eleven assertions removed using inferred Convex data, domain item contracts, currentTarget and existing Element narrowing. The guest template has no items field; the actual default-room response supplies items. Friend routes pass strings to getFriendRoom, which normalizes user IDs server-side. Visitor source items now require the actual typed query contract rather than unknown.

Five retained assertions: two chat document keyboard targets use HTML focus/body event origins; drawer pointer target uses rendered drawer elements and only calls Element.closest; two inventory-ID casts originate from authenticated getMyInventory results and hide controls are disabled for guests. Guest synthetic IDs never reach these mutations. Adjacent SAFETY evidence records these concrete producers and gates. Const assertions remain excluded. Global enforcement stays advisory (13 enforced rules).

Full bun run check passes: 120 tests / 641 assertions, including formatting/spacing, both linters, worker typecheck and build. Vendor SHA256SUMS and git diff --check pass. Existing behavior suites cover room persistence/omission, selection, limits and visitor flows; no runtime validation added. Taskbar stash and docs/research untouched. Parent fresh review required; no agents, merge, watch, apps, codegen or deployment.

PR #24 fresh review rejected three unsupported DOM target assumptions. Replaced ChatInput assertions with HTMLElement guards and AssetDrawer closest access with an Element guard. A mounted window-target keyboard regression test verifies chat activation and dismissal without element assumptions. The retained room assertions now cover only the two authenticated inventory-ID boundaries.

## Computer assertion audit (issue #7, base 1b6d3f1)

Inventory: seven type assertions in src/computer (the ReactPointerEvent and NeoVolumeSlider `as` occurrences are import/export aliases). Removed five: ComputerScreen cloneNode, keyboard target, context-menu target, touch target, and FriendsPanel ConvexError data. DOM accesses now require instanceof guards; error data requires a string. Two retained FriendsPanel visitor-ID assertions only transport strings to getFriendshipStatusBatch's v.array(v.id("users")) and sendFriendRequestByUserId's v.id("users") validators before handler/database access; neither establishes trusted presence identity. No storage assertions exist in this scope. Missing-evidence findings 7 → 0; global 58 → 51. Assertion enforcement remains advisory, with 13 enforced rules.

Full check passes: 121 tests / 644 assertions, including formatting/spacing, both linters, worker typecheck and build. Vendor SHA256SUMS and diff whitespace checks pass. Limitation: dedicated behavioral coverage for the changed computer DOM/error boundaries remains outstanding; existing suites pass but do not demonstrate these paths. Parent fresh review required before merge. Taskbar stash and docs/research untouched; no agents, merges, watches, apps, codegen or deployment.

PR #25 test follow-up: full check passes 124 tests / 659 assertions (baseline 121 / 644), including formatting and spacing. Mounted FriendsPanel coverage submits Add Friend through the real Convex hooks with a disabled client mutation spy: structured ConvexError data renders Something went wrong, string data remains visible, and sending clears after rejection. No module mocking. ComputerScreen now calls an extracted typing-target boundary; tests cover non-element EventTarget/null, INPUT, TEXTAREA, contenteditable true/false and BUTTON. Limitation: this uses a minimal HTMLElement stand-in, not browser DOM or mounted ComputerScreen keyboard dispatch; full event-flow coverage remains outstanding for parent review. Vendor checksums pass. Fresh review of these tests is pending; Taskbar stash and docs/research preserved.

## Shop assertion audit (issue #7, base 0fca7f7)

Complete src/shop group: 8 missing-evidence findings → 0; global 52 → 44. Removed all eight assertions, retaining none. Category groups now accurately declare absent buckets with Partial and use an initialized local array; category keys come from the canonical category list and preserve its existing sort order. Inventory IDs and Vite environment values use producer inference. Empty/loading grouping and rendered categories are preserved. No wire, API, storage or runtime boundary changes; no new tests required for this typing-only change.

Remaining application inventory outside cleared folders: games 11, admin 5, hooks 4, musicPlayer 2, components 1, lib 1, main 1 (25 total). Cleared computer scope has one newly reported finding requiring parent reconciliation; it is untouched. Tests have 18 findings and remain unaudited. Global assertion enforcement remains advisory; 13 enforced rules unchanged. Vendor checksums and git diff --check pass. Taskbar stash and docs/research preserved. Parent fresh review required; no agents, merge, watch, apps, codegen or deployment.

Full bun run check passes with formatting/spacing, Oxlint, ESLint, worker typecheck, application build, and 124 tests / 659 assertions across 23 files. Existing roomDraft advisory and Vite bundle-size advisory remain.

## Games assertion audit (issue #7, base 33574f2)

Complete src/games scope: 11 missing-evidence findings → 0; global 44 → 33. Removed all eleven non-const assertions; none retained. Base inventory: ChessGame.tsx:261,262 (last-move squares), 281,282 (presence side/signal), 519 (CSS custom property); useChessController.ts:125,126,142 (board event squares),161 (chess.js Move.to); GameOverlay.tsx:47,99 (presence/local side). Const assertions remain excluded. Global enforcement stays advisory; 13 enforced rules unchanged.

Board inputs and stored last-move squares require exact lowercase a1–h8 values before chess.js access. Presence sides and signals require supported literal values; malformed claims cannot trigger resignation/draw outcomes. React style uses an explicitly typed custom-property object, and chess.js already types Move.to as Square. Promotion, selection, tie-breaking, metadata merging and wire handling remain otherwise unchanged.

Full check passes: 125 tests / 768 assertions across 24 files (baseline 124 / 659), including formatting/spacing, both linters, worker typecheck and build. New boundary test checks all 64 squares, malformed inputs, supported sides/signals and invalid cross-domain values. Existing game behavior tests pass. Vendor checksums and git diff --check pass. Taskbar stash and docs/research untouched. Fresh parent review required; no agents, merge, watch, apps, codegen or deployment.

## Remaining non-admin application assertions (issue #7, base ec4763a)

Complete ten-finding inventory: hooks useKeyboardSoundSetting.ts:29, useTouchCapability.ts:31, useWebSocketPresence.ts:117,144; musicPlayer MusicNotesOverlay.tsx:114, VisitorMusicModal.tsx:57; components AssetImage.tsx:19; lib audio.ts:11; main.tsx:9; computer FriendsPanel.tsx:130 callback evidence association. Missing-evidence findings 33 → 23: admin 5 and tests 18 remain deferred. Global enforcement remains advisory; 13 enforced rules unchanged.

Eight casts removed using producer inference, explicit browser/React extension properties, function-union narrowing, and runtime JSON guards. AssetImage retains the storage ID transport assertion with adjacent evidence of getImageUrl's v.id("_storage") validator; it does not claim storage strings are trusted. FriendsPanel's existing validator evidence now lives inside the map callback beside its assertion.

WebSocket JSON enters as unknown and every message variant is checked before state updates or typing audio. Snapshot visitors require the full visitor contract; optional false, null, and omitted cursor fields remain distinct. External media titles require an object and string title. Guest preferences require an object before property access and retain existing clamping/default behavior. Legacy numeric touch capability and WebKit audio support remain available.

Full bun run check passes: 126 tests / 782 assertions across 25 files (baseline 125 / 768), including formatting/spacing, both linters, worker typecheck and build. Added wire-boundary tests cover malformed payloads, invalid snapshots, non-finite coordinates, malformed metadata and valid message variants including omitted/null/false fields. Limits: no new mounted settings or legacy browser audio/touch tests; existing media response-order/failure coverage passes. Vendor SHA256SUMS and git diff --check pass. Existing roomDraft and bundle-size advisories remain. Taskbar stash and docs/research untouched. Fresh parent review required; no agents, merge, watch, apps, codegen or deployment performed.

PR #28 fresh independent review found no code defect and requested a nonempty worker-shaped snapshot test. Added valid required visitor fields, omitted optional fields, null metadata/game values, populated optional metadata and malformed visitor field cases. Full check passes127 tests. Preview issuer configured separately with no production changes.

## Admin assertion audit (issue #7, base 281379d)

Five findings → zero in src/admin; global 23 → 18, all remaining in tests. Base inventory: CatalogItemsTab.tsx:40,133,195,294 and RoomTemplatesTab.tsx:32. Removed both redundant branded-ID casts and all three select casts. Canonical category/game arrays resolve DOM strings to finite values. Editable updates now use explicit field branches producing correlated property/value objects, rather than arbitrary string keys with union values. Invalid inline categories throw before mutation. No assertions retained in admin. Global assertion enforcement remains advisory; 13 enforced rules unchanged.

Upload/storage code and backend catalog/template mutations are unchanged. Empty game type still omits on creation and sends null on update; category selection retains the previous value for invalid DOM input. Existing backend price validation remains authoritative, including negative/non-finite rejection. Conversion tests cover numeric zero/negative values, width, false, empty description, valid and invalid categories. Limitation: no mounted admin event-flow coverage added.

Full bun run check passes: 128 tests / 804 assertions across 26 files, including formatting/spacing, both linters, worker typecheck and build. Vendor SHA256SUMS and git diff --check pass. Taskbar stash and docs/research preserved. Fresh parent review required; no agents, merges, watches, apps, codegen or deployment performed.

PR #29 fresh review found invalid category text escaped the save handler. Validation errors now call onError and retain edit state; mounted EditableCell/hook coverage verifies no mutation, visible error callback, correction and successful save. Full check passes129 tests. Preview issuer configured separately without production changes.

## Complete test fixture assertion audit (issue #7, base d3f978a)

Current inventory: 18 missing-evidence findings resolved; application and tests selected assertion audit 0. Globally enforced rules: 14. Historical counts in earlier sections describe their respective bases.

Base inventory: roomSaveFeedback:25,26 (2); guestConversion:175 (1); guestSession:105,122,123,124,159 (5); roomSession:15,16 (2); refactorBoundaries:16 (1); roomPageEffects:30,64,66,75 twice (5); reactRefactors:62,130 (2). Seventeen assertions removed, one retained with concrete adapter evidence.

Catalog and room IDs now come from registered Convex test database inserts. Onboarding uses an inserted user document; sharing uses an inserted invite with its real room/user IDs and required creation fields. Music items have an explicit RoomItem return contract. The unowned conversion item has a real catalog ID absent from inventory, preserving the invalid-placement capacity invariant. Stale guest items remain absent from the supplied catalog lookup. Each fixture database is isolated from other files; fixture records are not mutated by these frontend tests. Existing global restoration, timer cleanup and behavioral assertions remain intact.

The sole retained test assertion converts the intercepted numeric interval handle to Bun's timer return type. Both intercepted setInterval and clearInterval use the same numeric-key map; no native timer receives it. Callback narrowing now checks for a function before storing an invocation wrapper. No blanket safety assurances or chained assertions were added.

Full bun run check passes: formatting/spacing, both linters, worker types, build, 129 tests / 809 assertions. Vendor SHA256SUMS and git diff --check pass. Explicit full owned-source audit selected assertion findings: 0. Current advisory inventory: runtime typeof 109; unknown parameters 26; unsafe dictionaries 20; known-value widening 9; total 164. All other selected audit rules zero. Parent fresh independent review remains required before merge. Taskbar stash and docs/research untouched.

## TypeScript 6 (issue #7, base 2e0157a)

Both workspaces resolve TypeScript 6.0.3. Deprecated baseUrl removed while preserving all three aliases; ESNext/bundler and explicit ambient types retained. Full bun run check passes: formatting/spacing, 14 enforced rules, both linters, worker typecheck, build and 129 tests / 809 assertions. Frozen lock install and vendor SHA256SUMS pass. Selected assertion audit remains zero; advisory inventory unchanged. No runtime edits or new diagnostics requiring contract changes. Taskbar stash and docs/research untouched. TypeScript 7 awaits typescript-eslint peer support; convex-test fetch descriptor migration remains separate. Parent fresh review and CI required before merge.

## convex-test 0.0.67 (issue #7)

Full check passes with 129 tests; both affected files also pass separately from the full suite. Frozen install and vendor checksums verified. Test adapters restore previous property descriptors; production fetch is unchanged. Fresh parent review and CI remain required.
