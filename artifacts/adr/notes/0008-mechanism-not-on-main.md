# Note on ADR 0008 (acceptance lock): mechanism not present on `main`

[ADR 0008](../0008-acceptance-lock.md) was recovered verbatim from tag `v1.6.0` (blob `adc51f22aa06749eb2f96cb2df1aa94d0358dc84`, issue #66) and is unmodified. This note is separate and is not part of the ADR.

The ADR describes `artifacts/acceptance-baseline.json`, `scripts/acceptance.mjs`, `test/acceptance-lock.test.mjs` and the catalog invariant `invariant.acceptance-locked` as existing. **None of these is present on `main`.** Their recovery was declined by the owner on 2026-11-19. On `main`, the acceptance lock is therefore a recorded decision, not an enforced mechanism; do not cite it as enforced here. The implementation remains reachable at tag `v1.6.0`.

Likewise, ADR 0007 links to `../adoption/2026-08-09-fourth-adoption.md` and `../../design/negative-evidence-audit.md`, which are not on `main`.
