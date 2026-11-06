# Current rollout status

Verified against merged base 5582c8f on 2026-11-06. This supersedes historical snapshots in the linked assessments. Rollout remains open pending Stripe.

Full `bun run check` passes: formatting and spacing, selected Oxlint policies, ESLint, Worker typecheck, build, 139 tests / 870 assertions. Frozen installation and all vendor SHA256SUMS pass. No temporary policy overrides exist.

## Current rule inventory

All 18 generic rules plus the builtin accumulator rule were rerun, with warning severity in the audit. The normal config enforces 14 (13 generic plus builtin). Counts are diagnostics, not proof of detector completeness.

| Rule                                                  | Count | Final status / follow-up                                                                     |
| ----------------------------------------------------- | ----: | -------------------------------------------------------------------------------------------- |
| `anti-slop/no-array-filter-map`                       |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-reduce-accumulator-copy`                |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-chained-type-assertions`                |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-conditional-empty-object-spread`        |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-known-value-widening`                   |     9 | Deferred: review finite lookups separately from intentional mutable/public contracts.        |
| `anti-slop/no-module-mocking`                         |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-object-parameters`                      |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-reflect-apply`                          |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-reflect-get`                            |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-runtime-typeof`                         |   109 | Deferred: retain validation predicates; revisit boundary parsing per subsystem.              |
| `anti-slop/no-unsafe-dictionary-type`                 |    20 | Deferred: separate catalog patches and cross-layer presence metadata contracts.              |
| `anti-slop/no-shape-in-symbol-names`                  |     0 | Deferred: vocabulary restriction has no demonstrated benefit for spatial domain names.       |
| `anti-slop/no-unknown-parameters`                     |    26 | Deferred: preserve untrusted inputs until validation; follow unknown-contract-assessment.md. |
| `anti-slop/no-unknown-returns`                        |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-unknown-type-aliases`                   |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/no-widen-then-assert`                      |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/require-readable-spacing`                  |     0 | Enforced globally as error; retain existing scope.                                           |
| `anti-slop/require-safety-comment-for-type-assertion` |     0 | Enforced globally as error; retain existing scope.                                           |
| `oxc/no-accumulating-spread`                          |     0 | Enforced globally as error; retain existing scope.                                           |

Full audit: 164 warnings; selected 14: 0 findings.

Detectors use local AST/scope evidence, not checker or interprocedural proofs. Array/reducer syntax, local aliases and literal Reflect targets have conservative coverage. Safety comments check evidence syntax, not truth. Module mocking covers Jest/Vitest, not Bun `mock.module`; future Bun replacement needs manual source review. Spacing is stylistic. Effect rules are excluded because Effect is unused. See [inventory](anti-slop-inventory.md) for per-policy limits and subsystem follow-ups.

Vendor source is pinned to `13909c9e07590f5a85d93c62712259fe14a883f7`, with MIT LICENSE and nested ESLint Stylistic license/attribution retained. Follow [provenance and upgrade procedure](../../vendor/anti-slop/UPSTREAM.md): inspect a chosen upstream SHA, copy without transformation, compare bytes, regenerate checksums, rerun audit/check and update inventory; review new policy separately. Oxlint and @oxlint/plugins must move together from exact 1.91.0; Oxfmt remains exact 0.76.0 and requires spacing/format compatibility checks during upgrades.

## Dependencies and remaining decision

Fresh root and Worker `bun outdated` checks found root Stripe 0.1.1 → 0.1.7, Node types 24.19.2 → 26.6.6, TypeScript 6.0.3 → 7.0.2, Oxlint/plugins 1.91.0 → 1.92.0 and Oxfmt 0.76.0 → 0.77.0. Worker reports only TypeScript. These are explicit holds/follow-ups, not a claim that all dependencies are current. TypeScript 7 exceeds typescript-eslint 8.72.1 parser peer range >=4.8.4 <6.1.0; Node 26 types exceed verified Node 24.12.0 runtime. Review the synchronized lint/format update separately.

Merged implementation: [PR #34](https://github.com/daives01/cozytab/pull/34) Jotai/Lucide, [#35](https://github.com/daives01/cozytab/pull/35) SunCalc, [#36](https://github.com/daives01/cozytab/pull/36) Worker types; earlier bounded policy/toolchain work merged in #8–33. See [dependency assessment](dependency-assessment.md) and [Worker migration](workers-types-migration.md).

Stripe remains exact 0.1.1. The 0.1.7 candidate requires generated component API compatibility work. The explicit AGENTS.md override request has no answer: no API generation, deployment or approval is assumed. Parent verification notes and candidate patch are preserved. Issue #7 must remain open pending this decision and fresh parent review/CI.
