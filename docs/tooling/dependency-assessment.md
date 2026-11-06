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

- TypeScript 7.0.2 is blocked by typescript-eslint 8.72.1's >=4.8.4 <6.1.0 peer range. Keep root 5.9.3 and Worker ^5.6.3 (resolved compatible 5.x); Worker has no independent compiler migration in this PR. Next evaluate TypeScript 6.0.3 with its migration guide and baseUrl/config deprecations, then TypeScript 7 when lint parser support exists. Do not bypass peers.
- convex-test 0.0.41 → 0.0.67 satisfies Convex ^1.43.0 with installed 1.49.0, but the full suite regresses to 127/129: heartbeat and visitor title tests fail because Bun spyOn cannot spy on accessor properties (global fetch). Reverted to 0.0.41. Next isolate the new fetch descriptor lifecycle and repair test adapter restoration before upgrading; preserve production fetch behavior and test contracts.

No application behavior tests added for dependency-only work. Existing Taskbar stash and docs/research are untouched. Fresh parent review required before merge.

Validation: full `bun run check` passes (129 tests, 809 assertions), frozen installation passes, vendor SHA256SUMS pass, and `git diff --check` passes. Audit has zero selected assertion findings; existing advisory rules remain advisory. Existing roomDraft warning and bundle-size advisory remain.
