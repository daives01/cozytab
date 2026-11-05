# Foundation verification

`bun run check` passes after compatible root and worker dependency updates and five React lint fixes: Oxlint, ESLint, worker typecheck, app typecheck/build, and 110 tests across 17 files. Oxlint retains one advisory no-useless-fallback-in-spread finding in roomDraft.ts. Vite reports its bundle-size advisory.

Formatting remains a separate baseline (previous run: 215 files); no mass formatting applied. The plan explicitly schedules formatting adoption before adding it to check.

The earlier dependency baseline was not measured. The five findings were in unchanged application source under the refreshed tooling; they have now been fixed without suppressing React checks. Three mounted React tests now cover delayed/out-of-order music title responses, fetch failure and no-video state, display-name prop updates after saving, and expired invite updates. React test renderer emits a deprecation warning; these tests do not exercise browser DOM behavior.

Hono is updated to 4.13.16; compatible Workers types to 4.20260702.1. Workers types 5 and other major migrations are tracked separately. Stripe remains pinned to 0.1.1 pending component API compatibility work.

Publication is blocked: gh reports invalid credentials and connected GitHub issue creation returned 403 Resource not accessible by integration. No PR or issue publication is confirmed. Do not use GitKraken. Issue and PR drafts remain local.

First independent review identified check failures, missing worker typecheck/update and missing formatting step. Those are addressed. A fresh review accepted the revised application/dependency changes. A subsequent fresh review accepted music/profile coverage and found that the invite test did not prove timer execution; the test now controls Date.now and asserts the link remains until the callback runs. The focused three-test suite passes after this correction; the full check passed with 110 tests before this test-only correction. Existing Taskbar stash and docs/research/quoridor-engine.md are untouched.
