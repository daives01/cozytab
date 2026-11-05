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
