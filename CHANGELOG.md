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

## How a release is judged

> **A new version is not better because it produces fewer unknowns. It is better when the unknowns
> it reports more accurately correspond to what the system does not know.**

Stated here because the obvious metrics are the wrong ones, and a future maintainer under pressure
will reach for them. Compliance scores, the count of automated rules, and the number of outstanding
evidence requests are all trivially improvable by making the framework claim more than it can
support — and every one of those improvements would be a regression.

Three consequences, binding on every release:

- **A rising score is not evidence of a better release.** Scores describe target projects. They say
  nothing about the framework, and a release that raised them by relaxing a check has made the
  system worse while making its output look better.
- **A falling evidence-request count is not progress.** `1.1.0` moved the measured ratio from 2
  producible / 35 requiring human judgement to 5 / 36 — *upward*, because gaps that had been passing
  in silence started asking. That is the direction a correct release moves in.
- **Automation coverage is a property of the domain, not of the effort spent.** A rule that moves
  from human judgement to automation must do so because a mechanism genuinely establishes it, never
  because the gap was uncomfortable to report.

Where a release cannot know something, the correct output is that it does not know, with the reason
attached. See `artifacts/adr/0006-scaffolding-and-scope.md` for the case that established this: the
ownership model is exact when git answers, an approximation when git declines, and it says which.

## 1.4.0 — 2026-08-09 — **candidate, not released**

The first release to touch the normative corpus. Every change is traceable to a supported
disposition in `artifacts/review/2026-08-09-candidate-disposition.md` (`80a5a82`); implementation
convenience, adoption results, and a wish for the release to feel substantial are not independent
reasons, and none was used as one.

**Twelve supported dispositions entered normative replay and seven survived it.** MINOR: one
recommendation added, one requirement's accepted evidence widened, five prose clarifications that
change no rule's contract.

### Changed

- **Standard 15 R2** — *Dependencies are pinned to exact versions* becomes *The resolved environment
  is recorded, by pins or by a lock artifact*. Exact pins in a manifest that declares what a project
  is compatible with produce unresolvable environments for its consumers; the distinction that
  survives is abstract manifest versus lock artifact, which is a fact about the repository rather
  than a self-declared property of the project. Ranges alone remain insufficient. **Verified against
  the target that provoked the finding: `ultralytics/yolov5` still fails, because it commits
  neither.** (N10)

### Added

- `evaluation.resampling-not-by-default` (**recommendation**, Standard 11 R6) — where a proper
  scoring rule and a strong learner are in use, resampling is not applied merely because the classes
  are imbalanced. The standard names where the evidence does not reach — weak learners, loss
  reweighting in deep learning, extreme rare-event regimes — because a prohibition would be wrong in
  those cases. (N16)

### Clarified — no rule's contract changed, asserted by test

- **Standard 11 R1** obtains the test partition's base rate without breaking Standard 5's embargo,
  by derivation from the split specification or by measurement after the configuration is final. The
  two standards previously required and forbade the same act. (N1)
- **Standard 10 R3** records that a documented exception exists for purely autoregressive models
  with uncorrelated errors, and that invoking it is an exception with an approver rather than a hole
  in the rule. (N2)
- **Standard 20 R2** states the property that overlapping training sets understate variance, rather
  than naming a prohibited test — a named ban would create a whitelist illusion. (N7)
- **Standard 13 R2**'s normative sentence carries the condition its own heading declares. (N9)
- **Standard 19 R3** records that its three-way improvement taxonomy is this corpus's synthesis and
  not an external methodology standard. (N12)

### Withdrawn during replay

- **N6** — extending Standard 20 R3 to differences inside their measured uncertainty adds an
  obligation, so it is a normative change and not a clarification. Re-enters disposition under the
  correct class; not in this candidate.
- **N17** — Standard 1 R4 already says "at least qualitatively" and gives a worked example of an
  acceptable minimal form. The finding came from reading the normative sentence without the
  paragraph beneath it. Rejected.

### Held back deliberately

**N3, N5 and N8 are supported additions and are not here.** Adding a requirement is MAJOR under the
policy at the top of this file, and a MINOR release cannot carry one. A test asserts that the only
catalog addition in this release is a recommendation.

### Completeness

Unchanged and still unmeasured. The six gaps in the review were found by one non-independent review
and are not a denominator. Adding N16 — and, later, N3, N5 and N8 — would not make the corpus
complete, and no claim to the contrary is made here.

## 1.3.0 — 2026-08-09

Framework only. **No standard was changed and no project-facing rule was added, reclassified,
exempted or lowered.** MINOR: one system invariant added, one gate added, nothing on the frozen
surface moved.

This release closes a gap in `invariant.standards-integrity` that was found by trying to use it. A
normative candidate widened Standard 15 R2 from *exact pins* to *pins or a committed lock artifact* —
enlarging the set of project states treated as compliant — and the integrity check reported nothing,
because every field it locks was identical before and after.

> A standards-integrity guard that locks a rule's classification but not its satisfaction semantics
> cannot establish that the rule was not weakened.

### Added

- `invariant.acceptance-locked` and `scripts/acceptance.mjs`. Twenty-six project states, with literal
  file contents, locked in `artifacts/acceptance-baseline.json` against the disposition the evaluator
  reaches on each. Any difference blocks with exit 3 until the baseline is deliberately updated.
- **Both directions block.** A state that newly passes is a weakening. A state that newly fails makes
  existing adopters non-compliant without their having changed anything, and gets the same review. A
  move between two equally favourable dispositions is reported as a reclassification, because
  `insufficient-evidence` and `not-evaluated` tell an adopter to do different things.
- `npm run acceptance`, wired into CI. The gate is now nine commands.
- `artifacts/adr/0008-acceptance-lock.md`, including why hashing `evidenceExpected` or the standards
  text would not have worked.

### Coverage, stated rather than implied

**Ten rules of forty-five.** The other thirty-five rest on human judgement and have no observable
acceptance predicate — no state's disposition would move if their meaning changed. Nothing here
detects a semantic weakening of one of them, and the gate prints that beside its clean result. The
states are representative, not exhaustive: a behavioural change confined to a state nobody wrote is
invisible.

### Method note

Expectations for all twenty-six states were written from the standards **before** the checker was
first run. Twenty-five matched. The one that did not is recorded in the baseline rather than
overwritten — seed absence routes to `insufficient-evidence` rather than `warning`, because a seed
may be set through configuration the detector does not read. The expectation was wrong; the code was
right.

## 1.2.0 — 2026-08-09

A narrow epistemic-correctness release. Not new standards, not more automation, not higher
coverage — **coverage is unchanged at 10 of 45 rules.** Every change here answers the question
"does the evidence actually establish the proposition the verdict claims it establishes?", raised by
the fourth adoption in `artifacts/adoption/2026-08-09-fourth-adoption.md`. **No standard was
changed, and no rule was reclassified, exempted, or lowered.** MINOR: nothing on the frozen surface
moved, and no disposition was added.

Scores on the unchanged corpus fell — `yolov5` 80% → 50%, `Numerai` 67% → 0%. Every point removed
was a pass the framework was not entitled to. See "How a release is judged" above.

### Fixed

- **Owned is not the same as committed.** Scope was `git ls-files --cached`, so everything `init`
  writes was invisible until staged: the documented workflow told operators the documents they had
  just written did not exist. Identical evidence now receives an identical disposition before and
  after `git add`, and that is a permanent regression test. Ignored trees, environments, dependency
  trees and generated output are still excluded — the structural filters apply to the untracked set
  too.
- **Evidence must establish the subject of its rule.** A required rule reported a pass on a
  repository with no dataset versioning of any kind, because a regex read any `log_artifact` call as
  dataset versioning and every call site logged `type="model"`. Versioning a model is not versioning
  the data. The same subject test found a second case by audit: opening a tracking session is not
  recording a parameter set.
- **Silence is probative only where the detector had a subject to read.** Two nonExemptible
  prohibitions passed on a target containing no scikit-learn, because the detectors that read only
  that dialect found nothing. A detector with no subject now reports `not-evaluated` with the reason
  stated. A detector whose idiom *is* present and clean still passes — asserted from both
  directions, because a check that converted every pass into a shrug would be worthless.

### Added

- `design/negative-evidence-audit.md` — all ten machine-examined rules classified against "when this
  detector emits nothing, what does that mean?". Seven sound, three not, one of the three found by
  the audit rather than by any target. The audit ran before the remediation so that fixing the
  observed cases could not conceal a general problem.
- `artifacts/adr/0007-evidence-must-establish-its-subject.md`.
- `artifacts/adoption/2026-08-09-fourth-adoption.md` and the three-way corpus comparison in
  `artifacts/adoption/2026-08-09-v1.2-comparison.md`.

### Measured, and not to be optimised

Evidence requests on `Numerai` moved 5 producible / 36 human → **5 / 38**, the increase entirely in
the human column. Two consecutive releases have now moved this ratio upward for the right reason. A
future version that reduces it must show which mechanism newly establishes what.

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
