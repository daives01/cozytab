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
