# Toolchain migration assessment (issue #7)

Base: 3a13ade. Registry metadata checked 2026-11-06.

| Tool                                 | Before | After   |
| ------------------------------------ | ------ | ------- |
| ESLint                               | 9.39.5 | 10.14.0 |
| @eslint/js                           | 9.39.5 | 10.0.1  |
| Vite                                 | 7.3.7  | 8.3.6   |
| @vitejs/plugin-react                 | 5.2.0  | 6.2.1   |
| eslint-plugin-react-refresh          | 0.4.26 | 0.5.7   |
| globals                              | 16.5.0 | 17.14.0 |
| lint-staged                          | 16.4.0 | 17.6.0  |
| concurrently                         | 9.2.5  | 10.0.6  |
| Bun packageManager (both workspaces) | 1.1.32 | 1.3.8   |

Official migration sources: [Vite 8](https://vite.dev/guide/migration), [ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0), [React plugin](https://github.com/vitejs/vite-plugin-react/releases), [lint-staged](https://github.com/lint-staged/lint-staged/releases), [concurrently](https://github.com/open-cli-tools/concurrently/releases).

Vite uses Rolldown/Oxc and advances its default browser baseline to Chrome/Edge 111, Firefox 114, Safari 16.4. Existing config needs no conversion. Tailwind's installed plugin explicitly supports Vite 8. React plugin 6 requires Vite 8; optional compiler peers are unused. ESLint React Hooks and typescript-eslint peers support ESLint 10. ESLint 10's recommended no-useless-assignment identified eight redundant initializers; removing these preserves every branch assignment. React lint configurations, all 14 enforced anti-slop rules, format gate, exact oxlint/@oxlint/plugins 1.91.0 coupling and oxfmt 0.76.0 remain intact.

Local Node is 24.12.0, satisfying Vite/React plugin (^20.19 or >=22.12), lint-staged (>=22.22.1), concurrently (>=22), and ESLint 10's Node 24 range. Keep @types/node 24.19.2: Node 26 types would describe APIs unavailable in this verified Node 24 runtime. No runtime target or Worker compatibility date changes.

Both manifests now declare the locally verified Bun 1.3.8, replacing an untested historical 1.1.32 pin. Vercel's reported Bun 1.3.14 is newer; reproducibility here is the 1.3.8 frozen lockfile check, not a claim that both executors use identical binaries. This is a verified version, not a newly established minimum supported Bun version.

## Required next pieces

- TypeScript migrated to 6.0.3 in both workspaces (root ~5.9.3 and Worker ^5.6.3 → ~6.0.3). Registry latest 6 verified; TypeScript 7.0.2 remains deferred because typescript-eslint 8.72.1 requires >=4.8.4 <6.1.0.
- convex-test 0.0.41 → 0.0.67 satisfies Convex ^1.43.0 with installed 1.49.0, but the full suite regresses to 127/129: heartbeat and visitor title tests fail because Bun spyOn cannot spy on accessor properties (global fetch). Reverted to 0.0.41. Next isolate the new fetch descriptor lifecycle and repair test adapter restoration before upgrading; preserve production fetch behavior and test contracts.

No application behavior tests added for dependency-only work. Existing Taskbar stash and docs/research are untouched. Fresh parent review required before merge.

Validation: full `bun run check` passes (129 tests, 809 assertions), frozen installation passes, vendor SHA256SUMS pass, and `git diff --check` passes. Audit has zero selected assertion findings; existing advisory rules remain advisory. Existing roomDraft warning and bundle-size advisory remain.

## TypeScript 6 migration (base 2e0157a)

[Official migration notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) deprecate baseUrl. Removed it from root and app configs: existing ./src/_, ./shared/_ and ./convex/* paths resolve relative to their config for TypeScript and Bun; Vite retains matching explicit aliases. All configs already use ESNext/bundler and explicit ambient types. Worker root remains presence-worker; app config remains at repository root, covering shared and Convex imports under the new rootDir default. No suppressions, strictness reductions, contract casts or runtime edits needed. Node types remain 24.19.2 for Node 24.12.0.

## convex-test migration (issue #7, base 20f5f69)

Upgraded exact 0.0.41 → 0.0.67. Official registry latest is 0.0.67 with Convex peer ^1.43.0 (installed 1.49.0). See https://registry.npmjs.org/convex-test/latest and https://docs.convex.dev/testing/convex-test.

Reproduced 127/129: Bun spyOn rejects accessor properties. Installed dist/index.js installGlobalProxies wraps fetch and timers in configurable accessors using AsyncLocalStorage; ensureGlobalProxy installs them and runWithGlobalOverrides reinstalls them before handlers. The heartbeat failure concerns setInterval, not fetch. Descriptor-safe test stubs bypass setters and restore the exact prior descriptor in finally. Visitor title test verifies restoration. Production code and Convex integration remain unchanged; all 14 rules remain enforced.

Validation: full check 129 tests passes; focused files pass; frozen installation passes. Remaining bounded runtime work: @convex-dev/stripe, jotai, lucide-react, suncalc and Workers types major updates require independent compatibility review.

## Client runtime dependencies (issue #7, base 4672093)

Registry latest verified 2026-11-06: Jotai 3.0.1, lucide-react 1.70.0, SunCalc 2.1.2. This PR upgrades Jotai 2.20.3 → 3.0.1 and lucide-react 0.555.0 → 1.70.0.

[Jotai migration](https://jotai.org/docs/guides/migrating-to-v3): ESM-only, React >=18, TypeScript >=5.5 and Node >=22.12 are satisfied by this project. Actual usage is synchronous primitive/derived atoms and useAtom/useAtomValue/useSetAtom in useTimeOfDay; no async atoms, custom stores, deprecated utilities, delay or internal imports. Public contracts require no edits. [Lucide migration](https://lucide.dev/guide/react/migration): removed brand icons are unused; named component imports and SVG props compile unchanged. Installed React peer accepts React 19. No runtime source changes or redundant dependency-only tests.

SunCalc 2.1.2 includes index.d.ts, but migration is split out: named exports, nullable polar events, revised astronomy and day selection require dedicated behavior fixtures before accepting changed sunrise/sunset boundaries. Existing local-noon normalization, timezone-coordinate lookup/cache and day/night fallback remain on SunCalc 1.9.0 with @types/suncalc 1.9.2. Do not remove those types until the actual solar migration. Official contract: https://github.com/mourner/suncalc#sunlight-times.

Full check passes: formatting/spacing, 14 enforced policies, both linters, worker types, build, 129 tests / 810 assertions. Frozen install passes. Vendor checksums pass from vendor/anti-slop. Selected assertion audit zero. Taskbar stash and docs/research preserved. Remaining: SunCalc migration with solar/timezone tests, Stripe and Workers types compatibility reviews. Fresh parent review and CI required before merge.

## SunCalc 2.1.2 migration (issue #7, base efec68c)

SunCalc 1.9.0 → exact 2.1.2; removed @types/suncalc 1.9.2 because the package exports bundled index.d.ts. Named getTimes replaces the default import. Primary evidence: [tagged README](https://github.com/mourner/suncalc/blob/v2.1.2/README.md), [declarations](https://github.com/mourner/suncalc/blob/v2.1.2/index.d.ts), [implementation](https://github.com/mourner/suncalc/blob/v2.1.2/index.js), and [release history](https://github.com/mourner/suncalc/releases). Installed package declarations confirm the fifth utcOffset argument is minutes east of UTC; missing events are null. Astronomy is revised in v2, including grazing polar events in 2.1.2; exact v1 timestamps are intentionally not compatibility requirements.

Intentional correction: old normalization and cache keys used the host calendar even for an explicitly requested timezone. The new key uses the requested IANA calendar date; getTimes receives that zone's offset at the input instant, computed from calendar fields without host-offset addition or sign reversal. This selects the civil day rather than relying on host noon/solar-day coincidence. Dates returned remain absolute instants. DST and east/west UTC date boundaries are covered. Representative coordinate catalog is unchanged; it is not precise geolocation. Offset is fixed for the selected calculation window, so unusual midnight transitions remain a limitation of the upstream offset API.

The actual existing phase contract is day/night, sunrise inclusive and sunset exclusive; repository source has no dawn/dusk phase contract. It remains unchanged. Missing polar sunrise/sunset still returns null and uses the existing host-hour 06–18 fallback, including explicit unsupported zones. Polar flags are tested but do not introduce a new all-day lighting policy. This deliberately preserves fallback behavior rather than silently changing product phases.

Verification: full check passes with formatting/spacing, 14 enforced policies, both linters, worker types, build, and 138 tests (129 baseline). Targeted solar fixtures cover normal event order, local calendar membership, phase boundaries, both DST transitions, east/west date boundaries, polar day/night flags and null fallback. Frozen install and vendor SHA256SUMS pass; selected assertion audit has zero findings; no new casts or suppressions. No exact astronomy accuracy claim or browser verification. Taskbar stash and docs/research preserved. Fresh parent review and CI required; Stripe and Workers types remain separate migrations. No agents, merge, watch, apps, codegen or deployment.
