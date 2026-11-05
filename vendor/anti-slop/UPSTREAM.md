# Provenance

Original generic sources and tests copied byte-for-byte from https://github.com/dmmulroy/anti-slop at 13909c9e07590f5a85d93c62712259fe14a883f7. MIT license is in LICENSE. Nested ESLint Stylistic attribution and license remain in src/vendor/eslint-stylistic. No Effect sources are included.

To update: fetch and inspect a specific upstream commit, review every generic rule and helper, replace LICENSE and src/index.ts, src/rules, src/shared, src/vendor without transformations, compare every copied file against that checkout, and regenerate SHA256SUMS (relative paths, excluding this provenance document and manifest). Re-run the audit and repository check; update the inventory. Never activate policy as part of a vendor update. Upstream targeted @oxlint/plugins 1.78.0; this repository runs exact 1.91.0 and oxfmt 0.76.0. Audit execution verifies loading compatibility, not semantic completeness.
