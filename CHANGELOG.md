# Changelog

Semantic versioning, with the increments stated so a release cannot be argued into being smaller
than it is:

- **MAJOR** — adding a requirement or a prohibition; raising a rule's level; removing any rule;
  changing anything on the frozen surface below.
- **MINOR** — adding a recommendation; adding an optional field; widening what is accepted.
- **PATCH** — corrections that change no conclusion.

Three versions travel independently: the **framework** version (`VERSION`, and a project's
`standardVersion`), the **output schema** version (`schemaVersion` in every report), and the
**package** version in `package.json`.

## Unreleased — a MAJOR that is not cut

**Nothing here is released.** `VERSION` and `package.json` stay at 1.1.0 and the baseline's
`frameworkVersion` stays at 1.1.0, because no release has been made: no tag, no publication. The
three rules below carry `introducedIn: "2.0.0"`, the MAJOR that adding a requirement requires under
the policy above. That 2.0.0 is the next MAJOR **on this tree**. It is not the 2.0.0 described on
the `design/publication-state-correction` branch, which is a different, uncut release that this
tree does not contain. Tags `v1.4.0` to `v1.6.0` exist on the remote but are not reachable from
this tree; they are recorded as unreconciled and are not reconciled here.

### Added (requirements)

- `framing.proxy-label-relationship-recorded` (Standard 1 R6, N3). Conditional: applies only where
  R1's predicted quantity and R3's decided quantity differ. Where they are the same quantity,
  nothing is required and no evidence is requested.
- `evaluation.external-validation-stated` (Standard 5 R6, N5). Reported performance states whether
  it was externally validated.
- `leakage.pretraining-contamination-stated` (Standard 8 R5, N8). Applicability is declared in the
  project policy, not detected; no trigger signal was added.

All three are manual-review, `nonExemptible: false`, attestable. `artifacts/catalog-baseline.json`
locks them (`reviewedOn` 2026-10-03; the existing 50 entries are unchanged) and
`project-policy.yml` declares each not-applicable for this repository.

## 1.1.0 — 2026-08-09

Remediation of what three adoptions against real machine-learning repositories found. Every change
here answers recorded evidence in `artifacts/adoption/`; **no standard was changed, and no rule was
reclassified, exempted, or lowered.** MINOR rather than MAJOR: one invariant was added and several
checks became stricter, and nothing on the frozen surface moved.

### Added

- `invariant.no-self-satisfying-scaffolding` — framework-generated artifacts must not satisfy the
  requirements they were generated to help someone meet. Running `init` previously flipped three
  required rules to passed with no work done on the project.
- An ownership model for scan scope (`scripts/ownership.mjs`). Scope is what the project tracks,
  asked of git; where git cannot answer, unowned trees are recognised by structure. `--include-unowned`
  evaluates everything, for the case where vendored code genuinely is the product.
- `scripts/scaffolding.mjs` — three independent signals for recognising an unfilled document.
- The scan envelope carries `scope`, stating how the scope was decided and why.

### Fixed

- **Bootstrap manufactured compliance.** Three required rules no longer pass on placeholder text.
- **The scanner read unowned code.** Across three targets, no finding now cites code the project did
  not write; twelve false leakage findings inside a vendored scikit-learn became zero.
- **A general silent pass**, found while fixing the first. A rule whose detector is gated behind a
  trigger reported `passed` when the trigger never fired — a project with no data was credited with
  documenting its data. The evaluator now receives the rules actually examined on this target.
- **Blocked runs printed a score.** Once an invariant fires the score is suppressed: a number
  computed with a ruler the framework has just called untrustworthy should not be published.
- **`explain` emitted a glob.** `standards/15-*.md` is not openable; locations now resolve to a real
  file and a verified heading anchor.
- **The scope reporter called a real repository "not a git repository"** when git declined under
  `safe.directory`. It now names git's own reason.

### Measured, and not to be optimised

Evidence requests on the target evaluated both ways moved from 2 producible / 35 requiring human
judgement, to 5 / 36. The rise is honest gaps surfaced rather than automation gained. No rule moved
from judgement to automation, and future versions should not be judged by making that ratio larger.

## 1.0.0 — 2026-08-09

First release.

### Added

- Twenty-five normative standards, `standards/NN-*.md`, derived from
  `artifacts/prompts/original-prompt.md` through the enumerated specification at
  `artifacts/prompts/ml-standards-spec.md`.
- A machine-readable catalog in `rules/`, with entries of three project-facing kinds —
  requirement, prohibition, recommendation — plus system invariants in `rules/invariants.json`.
  Every one of the source brief's must-never rules is reproduced verbatim in a standard and carried
  by a prohibition entry.
- `invariant.standards-integrity`, enforced along five routes: a reviewed catalog baseline, policy
  weakening detection, attestations that cannot override a mechanism, content digests that expire an
  approval when the reviewed material changes, and mutation tests that reintroduce each defect.
- Five commands — `init`, `scan`, `evaluate`, `explain`, `status` — and ten detectors, with eight
  further checks deliberately not built and recorded as such in
  `artifacts/adr/0004-honest-automation.md`.
- `BLOCKED_BY_INVARIANT` as a first-class conclusion with its own exit code, so a refusal is visible
  to a caller that sees only an exit status.
- Templates for a project policy, manifest, agent instructions, model card, and dataset card.

### The frozen surface

Changing any of these is a MAJOR version:

- the command names and their high-level semantics;
- the project-policy schema;
- the canonical rule ids;
- the rule-entry contract;
- the output envelope;
- the status and disposition vocabularies;
- the exit-code meanings, including `3` for a blocked run;
- the score, assurance, and coverage semantics.

Not frozen: console wording, internal module layout, detector internals, and the ordering of
non-semantic output.

### Notes on decisions that could look like defects

- **`schemaVersion` is `"1.0.0"` in every emitter**, from the first release, and a test asserts it.
  There is no `"1.0"` era to migrate away from.
- **`attestable` is derived from the verification method rather than chosen per rule.** Entries
  verified by `document` or `configuration` are not attestable, because they ask for an artifact
  that either exists in the repository or does not, and asserting that it exists is not evidence
  that it does. The flag is locked in the baseline, so turning it on is reported as a weakening.
- **Two entries carry two source statements each.** `split.no-test-set-tuning` covers tuning
  against the final test set and repeatedly inspecting it; `leakage.no-preprocessing-leakage` covers
  preprocessing seeing forbidden information and fitting transformations globally before a split.
  Both statements are reproduced verbatim in their standards; creating separate ids would have
  manufactured a distinction the domain does not have.
- **Coverage is low and reported.** Roughly a fifth of the catalog is machine-examined. This is a
  property of the domain rather than of the effort spent: a cherry-picked evaluation period and a
  hidden segment are undetectable by construction, because the auditor cannot see what was not
  reported.

### Known limitations

- Most rules rest on attestation. Careless attestation produces a compliant report.
- The leakage detectors read in-file ordering and naming conventions; multi-file pipelines and
  unconventionally named variables are invisible to them.
- Document checks confirm that a document exists with the expected sections, never that its content
  is accurate.
- The scanner's code-analysis checks are Python-shaped. ML code in R, Julia, or Scala registers a
  footprint but is not otherwise examined.
