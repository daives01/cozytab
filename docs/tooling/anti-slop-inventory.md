# Generic anti-slop audit inventory

Opt-in only: `bun run lint:audit`; JSON: `bun run lint:audit --format json`. All 18 generic rules and oxc/no-accumulating-spread are warnings. Normal Oxlint policy is unchanged; ESLint retains React hooks and refresh coverage. Vendor, generated, research, build and agent assets are excluded. No fixes or baseline formatting applied.

Snapshot at foundation 467ff70: 1603 warnings. Counts are diagnostics, not distinct defects. Zero is not proof of absence.

| Rule                                                | Count |
| --------------------------------------------------- | ----: |
| anti-slop/no-array-filter-map                       |     2 |
| anti-slop/no-reduce-accumulator-copy                |     0 |
| anti-slop/no-chained-type-assertions                |     0 |
| anti-slop/no-conditional-empty-object-spread        |     2 |
| anti-slop/no-known-value-widening                   |     9 |
| anti-slop/no-module-mocking                         |     0 |
| anti-slop/no-object-parameters                      |     0 |
| anti-slop/no-reflect-apply                          |     0 |
| anti-slop/no-reflect-get                            |     0 |
| anti-slop/no-runtime-typeof                         |    76 |
| anti-slop/no-unsafe-dictionary-type                 |    18 |
| anti-slop/no-shape-in-symbol-names                  |     0 |
| anti-slop/no-unknown-parameters                     |    17 |
| anti-slop/no-unknown-returns                        |     3 |
| anti-slop/no-unknown-type-aliases                   |     0 |
| anti-slop/no-widen-then-assert                      |     0 |
| anti-slop/require-readable-spacing                  |  1354 |
| anti-slop/require-safety-comment-for-type-assertion |   122 |
| oxc/no-accumulating-spread                          |     0 |

Review interpretation: spacing is a style preference, not a correctness signal. Runtime typeof and unknown parameters are legitimate validation boundaries (guest persistence, imported data); unsafe dictionaries can represent intentionally untrusted payloads. SAFETY comments cannot establish that assertions are sound. Conditional empty spreads preserve property omission; replacing them with undefined changes semantics. Filter/map pipelines may be clearer and changing them can alter callback order and indexes. Broad return annotations may intentionally hide implementation details.

Detector limits: these rules use AST/local scope evidence, not the TypeScript checker or interprocedural analysis. Array recognition is conservative; reducer and accumulating-spread checks cover recognizable syntax rather than all quadratic algorithms. Chained assertions and widen-then-assert inspect explicit syntax/local immutable bindings. Known-value widening and dictionary rules resolve selected local aliases, not imported contracts. Object/unknown parameter, return and alias rules cannot decide whether an API boundary needs validation. Reflect rules recognize selected method targets; module mocking recognizes Jest/Vitest APIs, not Bun `mock.module`. Cozytab uses Bun tests: zero findings do not establish Bun mocking coverage; a separate source audit is required. Symbol-name restrictions are vocabulary policy, not semantic quality. Spacing delegates to the attributed Stylistic implementation. Safety marker detection checks comment syntax, not truth. No rule should become blocking from counts alone.

Representative findings (inspect before remediation):

- anti-slop(require-safety-comment-for-type-assertion): src/room/hooks/useRoomBackgroundImageUrl.ts:20.
- anti-slop(require-readable-spacing): src/room/hooks/useRoomBackgroundImageUrl.ts:29.
- anti-slop(no-conditional-empty-object-spread): src/presence/presenceState.ts:42.
- anti-slop(no-runtime-typeof): src/musicPlayer/VisitorMusicModal.tsx:53.
- anti-slop(no-unsafe-dictionary-type): convex/catalog.ts:77.
- anti-slop(no-unknown-parameters): src/musicPlayer/MusicPlayerButtons.tsx:55.
- anti-slop(no-known-value-widening): src/time/timezoneCoordinates.ts:6.
- anti-slop(no-array-filter-map): src/games/chess/useChessController.ts:32.
- anti-slop(no-unknown-returns): src/room/hooks/useRoomPageEffects.ts:54.

## Pipeline policy adoption (after formatting baseline 95cd0d1)

Fresh audit before: 1647 diagnostics; after: 1646. Selected counts before → after: no-array-filter-map 2 → 0; no-reduce-accumulator-copy 0 → 0; oxc/no-accumulating-spread 0 → 0. Spacing increases from 1398 to 1399 (the new multiline flatMap return); other counts are unchanged: safety comments 122, runtime typeof 76, dictionaries 18, unknown parameters 17, known-value widening 9, unknown returns 3, conditional empty spreads 2; remaining rules zero. The historical table above remains the foundation snapshot.

Normal config now loads the pinned vendor plugin and explicitly enables only these three selected rules as errors, retaining all excludes. The audit keeps warning severity for inventories. Chess side selection and guest item sanitization use flatMap; neither callback uses indexes. The chess callbacks only read plain claimant fields; the guest predicate only checks object/null, so moving those checks between cloning callbacks has no observable effects. Sorting still uses a fresh array; sanitization still clones each retained item and preserves order, generated-ID order, clamping and input immutability. Existing boundary and guest persistence tests cover these contracts. Vendor sources and checksums are unchanged.

## Assertion and Reflect policy (base 087a7d5)

Enable only no-chained-type-assertions, no-widen-then-assert, no-reflect-get and no-reflect-apply as global errors over the existing owned-source scope and exclusions. Each has 0 before → 0 after diagnostics; full audit remains 1646. No source changes or fixture builders needed. ESLint and vendored bytes remain unchanged.

Pinned source review and temporary plugin probes: chained assertions report both parenthesized as chains and angle-bracket chains (2); single assertions and all-const chains pass. Widening reports a local const unknown initialized with a known object then asserted narrower (1); unknown boundary parameters pass. It uses syntax and same-function immutable binding evidence, not checker assignability; mutable, cross-function, imported and unsupported alias flows can escape detection.

Reflect probes report direct and string-literal computed global get/apply calls (2 each), including missing-property get, get with explicit receiver, and apply with explicit this. Shadowed Reflect, aliases and dynamic computed names pass (known detection limits). Source search across src, shared, convex, presence-worker and tests found only Reflect.deleteProperty cleanup calls and unrelated Promise<unknown> annotations, no selected calls or assertion chains. No existing receiver-dependent or missing-property behavior requires migration. These bans do not prove direct property/call replacements equivalent: missing reads may yield undefined, getters use the supplied receiver, and apply preserves explicit this; any future exception requires individual semantic review. No automatic fixes. Probes were removed; no production fixtures or detector-mirroring tests added.

## Conditional spread omission policy

The two no-conditional-empty-object-spread findings are replaced with typed conditional assignments, and the rule is globally enforced at zero findings. Presence retains previous x/y outside the matching context, updates coordinates inside it, preserves untouched visitor references and clones the changed visitor. Stripe purchase metadata omits missing/empty session IDs and persists nonempty IDs. Boundary tests verify actual ledger storage and JSON serialization plus coordinate and immutability behavior. No undefined-valued replacement keys are introduced. Full audit counts after new boundary tests: {'anti-slop(require-readable-spacing)': 1411, 'anti-slop(require-safety-comment-for-type-assertion)': 122, 'anti-slop(no-runtime-typeof)': 76, 'anti-slop(no-unsafe-dictionary-type)': 18, 'anti-slop(no-unknown-parameters)': 17, 'anti-slop(no-known-value-widening)': 11, 'anti-slop(no-unknown-returns)': 3}.

Final post-format audit total: 1,658 warnings; selected conditional-spread count 2 → 0. Full check passes with 115 tests. Changes in advisory counts include the new boundary tests (known-value widening 9 → 11) and spacing. Other enforced rules remain clear.

## Contract policy assessment (base 0b4328b)

All three pinned detector implementations were inspected. Object parameters checks annotated function inputs and local aliases/unions for broad `object`; it does not ban structured object parameters. Enable globally over existing owned-source exclusions: 0 → 0. This brings enforced rules from 8 to 9. Dictionary and known-value-widening remain advisory, explicitly deferred without suppressions or a temporary baseline. No application cleanup is bundled.

Dictionary detection examines direct escape-hatch values, selected aliases and index signatures; constraints and plain alias consumers are excluded. Widening uses syntactic evidence, stable local bindings and selected local call flows, not checker assignability. It can flag intentional public contracts and mutable optional-field builders. Zero object findings does not prove imported aliases or inferred boundaries safe.

Exact diagnostic inventory below distinguishes validation boundaries, concrete domain improvements and legitimate annotations. Revisit presence as a coherent transport/validation/UI contract project, catalog/admin as a separate editing contract project, and finite lookup tables independently. Enabling either deferred rule globally now would force unrelated changes or erase useful unknown boundaries. No permanent scoped exception is proposed.

| Location at base                                | Detector                    | Assessment / next action                                                                                                                                                                                                                                          |
| ----------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/catalog.ts:77`                          | `no-unsafe-dictionary-type` | Concrete improvement deferred: schema-derived optional catalog patch plus explicit permitted field assignments; preserve omission of undefined values.                                                                                                            |
| `shared/presenceProtocol.ts:12`                 | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `shared/presenceProtocol.ts:37`                 | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/games/chess/ChessBoardPreview.tsx:3`       | `no-known-value-widening`   | Concrete lookup improvement deferred: preserve finite literal keys and use runtime-safe membership or Map lookup for arbitrary input; never assert an arbitrary string is a key.                                                                                  |
| `convex/roomTemplates.ts:123`                   | `no-known-value-widening`   | Legitimate explicit contract: optional patch/metadata fields or declared coordinate/platform return shape intentionally widen literals. Inference alone would prevent later optional assignments or expose implementation literals; retain the domain annotation. |
| `tests/conditionalSpreadBoundaries.test.ts:31`  | `no-known-value-widening`   | Legitimate explicit contract: optional patch/metadata fields or declared coordinate/platform return shape intentionally widen literals. Inference alone would prevent later optional assignments or expose implementation literals; retain the domain annotation. |
| `src/games/components/GameOverlay.tsx:15`       | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/games/components/GameOverlay.tsx:35`       | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/games/components/GameOverlay.tsx:53`       | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `presence-worker/src/PresenceRoom.ts:16`        | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `presence-worker/src/PresenceRoom.ts:56`        | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `presence-worker/src/PresenceRoom.ts:60`        | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `presence-worker/src/PresenceRoom.ts:84`        | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `presence-worker/src/PresenceRoom.ts:113`       | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `presence-worker/src/PresenceRoom.ts:163`       | `no-unsafe-dictionary-type` | Validation boundary: unknown fields must remain untrusted until individual checks pass. Keep unknown at parsing; a future primitive metadata schema must distinguish raw input from validated output.                                                             |
| `src/admin/RoomTemplatesTab.tsx:30`             | `no-known-value-widening`   | Concrete improvement deferred: correlate editable field keys with their value types through a generic or discriminated edit contract; a key cast alone cannot validate the field/value pair.                                                                      |
| `src/time/timezoneCoordinates.ts:6`             | `no-known-value-widening`   | Concrete lookup improvement deferred: preserve finite literal keys and use runtime-safe membership or Map lookup for arbitrary input; never assert an arbitrary string is a key.                                                                                  |
| `src/time/timezoneCoordinates.ts:37`            | `no-known-value-widening`   | Concrete lookup improvement deferred: preserve finite literal keys and use runtime-safe membership or Map lookup for arbitrary input; never assert an arbitrary string is a key.                                                                                  |
| `src/admin/CatalogItemsTab.tsx:38`              | `no-known-value-widening`   | Concrete improvement deferred: correlate editable field keys with their value types through a generic or discriminated edit contract; a key cast alone cannot validate the field/value pair.                                                                      |
| `src/hooks/useWebSocketPresence.ts:29`          | `no-known-value-widening`   | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/hooks/useWebSocketPresence.ts:105`         | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/hooks/useWebSocketPresence.ts:231`         | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/hooks/useWebSocketPresence.ts:256`         | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/hooks/useWebSocketPresence.ts:363`         | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/room/hooks/useRoomOverlaysModel.ts:80`     | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `src/room/components/RoomOverlays.types.ts:107` | `no-unsafe-dictionary-type` | Presence/game contract improvement deferred as one cross-layer subsystem: define validated game metadata and partial update semantics together across transport, worker and UI; do not rename unknown payloads as trusted.                                        |
| `convex/stripe.ts:76`                           | `no-known-value-widening`   | Legitimate explicit contract: optional patch/metadata fields or declared coordinate/platform return shape intentionally widen literals. Inference alone would prevent later optional assignments or expose implementation literals; retain the domain annotation. |
| `src/room/onboardingUtils.ts:29`                | `no-known-value-widening`   | Legitimate explicit contract: optional patch/metadata fields or declared coordinate/platform return shape intentionally widen literals. Inference alone would prevent later optional assignments or expose implementation literals; retain the domain annotation. |
| `src/room/onboardingUtils.ts:47`                | `no-known-value-widening`   | Legitimate explicit contract: optional patch/metadata fields or declared coordinate/platform return shape intentionally widen literals. Inference alone would prevent later optional assignments or expose implementation literals; retain the domain annotation. |

Audit before → after: total 1,658 → 1,658; object parameters 0 → 0; unsafe dictionaries 18 → 18; known-value widening 11 → 11. Other audit counts unchanged.

Validation: fresh `bun run check` passes including formatting, both linters, worker typecheck, application build and all 115 tests. Vendor SHA256SUMS all pass; `git diff --check` passes. No runtime changes or new tests.
