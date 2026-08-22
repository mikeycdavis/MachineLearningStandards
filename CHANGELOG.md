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

## 1.6.0 — 2026-08-22

**An invocation may name the policy to apply. MINOR: an optional field, widening what is accepted.**

No rule is added, removed, or relevelled; no conclusion changes for any project that does not pass
the new flag; the frozen surface is untouched. Under the policy at the top of this file that is a
MINOR increment, and stating it here is what keeps it from being argued into a patch.

### What it is for

A policy was a property of the target: `evaluate` read `project-policy.yml` from the directory under
evaluation, and there was exactly one place it could be. That is correct for a repository governed by
this pack alone, and it cannot express a repository governed by several. Two packs cannot both own
the root-level filename, so the invocation must be able to name the file.

```bash
standards evaluate . --policy=policies/machine-learning.yml
```

Absent the flag, nothing moves: the target's own `project-policy.yml` is read exactly as before.

### Three semantics, decided rather than inherited

- **Resolved against the working directory**, never against `--dir`. This is the same resolution
  `--dir=` already performs. Resolving against the target instead would silently turn an operator's
  relative path into a target-relative one, which is the failure most likely to go unnoticed because
  it usually still finds *a* file.
- **An explicit path that does not exist is an error.** There is no fall back to the default. A
  fallback would evaluate one policy while the caller believed another had been applied — a verdict
  about the wrong material, reported as if it were about the right one. The flag exists to remove
  that divergence and must not reintroduce it.
- **Attestation digests stay target-relative.** `reviewedAgainst.paths` continue to resolve against
  the target root, not against the policy file's directory. Those paths name reviewed material in the
  governed repository, and were the base to follow the policy file, relocating a policy would move
  every digest and expire every attestation without a single reviewed file having changed.

`evaluate`, `status`, and `explain` all honour the flag. A flag honoured by some of them would let
`status` report freshness for a policy that was never the one evaluated.

### The adapter contract moves to 1.1.0

`standards-adapter.json` declares `schemaVersion` `1.1.0` and adds `--policy={policy}` to the
invocation. `1.1.0` is the contract version that admits the `{policy}` placeholder; at `1.0.0` a
consumer binding a policy would have had it silently dropped, evaluating the target's default while
reporting the path it supplied.

Per ADR 0010, this capability exists in this release and in no earlier one. `1.5.0` does not acquire
it, and a consumer that needs it must pin `1.6.0` or later.

## 1.5.0 — 2026-08-10

**Normative evaluator correction. A verdict that rested on nothing is no longer a pass.**

This release changes conclusions. It is not interoperability metadata and must not be read as such.

`scripts/compliance.mjs` opens by claiming four load-bearing properties, the first being that there
is **no default-pass path**. That property held for individual rules and did not hold for the verdict
assembled from them. The status ladder ended in a bare `else`, so an evaluation in which every
applicable rule was skipped fell past `blocked`, `no policy`, `failures` and `excepted` and arrived at
`COMPLIANT` — nothing failed, therefore everything passed.

```text
applicable:    46
scored:         0
notEvaluated:  46
status:         COMPLIANT
exit:           0
```

`catalog.mjs` had already named the confusion this exploits: `COMPLIANT` reads as *everything was
checked* when it means *everything checked passed*. When nothing was checked, neither reading
supports a pass.

A positive verdict now requires that at least one applicable rule was **established** — examined and
given a result. Rules that were skipped establish nothing; rules whose evidence was sought and absent
establish nothing either, which is why `insufficient-evidence` is excluded on the same grounds that
give it its own assurance bucket. Where nothing was established the status is `NOT_EVALUATED`, this
pack's existing answer for *nothing is known*, which already exits `2`.

### Two conclusions move

- **All applicable rules skipped** — was `COMPLIANT`, now `NOT_EVALUATED`.
- **Every rule declared not-applicable** — was `COMPLIANT`, now `NOT_EVALUATED`. Declaring a project
  out of every rule established nothing about it, and a pass made *declare everything away* the
  cheapest route to green. Whether this pack applies to a project at all is a question above this
  engine; what the engine can say honestly is that it evaluated nothing.

### This repository's own evaluation was one of them

Every domain rule in `project-policy.yml` is declared not-applicable — correctly, since there is no ML
work in a standards repository. So `npm run evaluate` reported `COMPLIANT` on this repository, having
established nothing, and the CI gate passed on that. `project-policy.yml` had already said what
self-evaluation here actually exercises: the invariants and the test suite.

The gate now asserts what is true instead — `NOT_EVALUATED` with zero applicable rules — and fails if
an applicable rule appears, because that means ML work has arrived and the not-applicable declarations
need re-reading. `test/self-evaluation.test.mjs` pins it.

### Why MINOR and not PATCH

PATCH here means *corrections that change no conclusion*, and this changes conclusions. Nothing on the
frozen surface moved: the status and disposition vocabularies are unchanged, `NOT_EVALUATED` already
existed, the exit-code meanings are unchanged, and the output envelope, score, assurance and coverage
semantics are untouched. No rule was added, removed, reclassified or relevelled.

The precedent is `1.1.0` in this changelog, where corpus scores fell — `yolov5` 80% → 50%, `Numerai`
67% → 0% — and the entry recorded that *every point removed was a pass the framework was not entitled
to*. That release was MINOR on the same grounds. This is the same class of change and takes the same
increment.

Projects currently reporting `COMPLIANT` on a real evaluation are unaffected. Projects reporting
`COMPLIANT` on nothing will now report `NOT_EVALUATED`, and their CI will go red. That is the release
working.

### How it was found

From outside, by StandardsEnforcer invoking this pack through its own published contract against a
directory it had no business approving. The enforcer's acceptance chain held at every link — the
adapter was valid, the evaluator ran, the status was declared, and the status was in this pack's
declared passing set — and the false green came through it intact. Locating the defect in the
authority rather than in the transport is what kept the fix here instead of adding pack-specific
interpretation to the consumer.

### Guarded, and proven to be guarded

`test/no-verdict-without-evidence.test.mjs` approaches the boundary from both sides: zero established
rules cannot be `COMPLIANT`; one established rule must not collapse to `NOT_EVALUATED`; all rules
passing is still `COMPLIANT`; a real violation is still `NON_COMPLIANT`; an invariant violation still
outranks the guard; an exception still yields `COMPLIANT_WITH_EXCEPTIONS`.

The last test deletes the guard from a copy of the source and requires the false green to return. A
test named for an invariant establishes nothing unless it bites, and this one is shown to.

219 tests pass, up from 207.

### Unchanged

`standards-adapter.json` and the invocation it declares. The contract published at `1.4.1` describes
`1.5.0` exactly as it described `1.4.1`: same entrypoint, same arguments, same five statuses, same
passing set. What changed is which of those statuses this evaluator reaches, which the contract has
never claimed to constrain.

## 1.4.1 — 2026-08-09

**Interoperability metadata. No normative or evaluator semantic change.**

A PATCH under this changelog's own rule — a release that changes no conclusion. No rule was added,
removed, reclassified or relevelled; the acceptance lock is untouched; the output schema version is
unchanged.

Adds `standards-adapter.json`, a machine-readable declaration of how this pack is invoked and how its
result is read, against the schema owned by StandardsEnforcer. It states what was already true: the
authoritative verdict comes from `evaluate` — not `scan`, which answers a different question — the
target is given as `--dir=<path>`, and the status vocabulary is the five values this pack emits.

`test/adapter-contract.test.mjs` builds the invocation from the contract, runs it, runs the
documented invocation directly, and requires the two results to be identical. A declaration that
drifts from the CLI it describes fails this pack's own suite, which is what makes the declaration
evidence rather than a comment.

### Why a new release rather than a retag

The contract did not exist at `v1.4.0`, so `v1.4.0` cannot be made to claim it, and a consumer reads
the declaration out of the pinned checkout rather than from `main`. A released product acquired a new
public machine-readable interface, so a new release publishes that interface.

### Unchanged

The normative corpus delivered in 1.4.0 in full, and the framework version, output `schemaVersion`,
verdict vocabulary, scoring and exit codes. The adapter declaration and its fidelity test are the
only changes since `v1.4.0`. 207 tests pass, as at `v1.4.0`.

## 1.4.0 — 2026-08-09

The first release to touch the normative corpus.

**On the version sequence.** `1.3.0` is framework work and `1.4.0` is the normative work, in that
order, because the stronger framework had to exist before these changes could safely pass through
it. Building this release against `1.2.0` showed that widening Standard 15 R2 was invisible to the
integrity check; `1.3.0` closed that hole with `invariant.acceptance-locked`; and the normative
changes were then replayed through it, where the widening was caught, named, and admitted through a
deliberate baseline transition. The sequence is provenance rather than accident, and reading the two
entries together is the point.

Every change is traceable to a supported disposition in
`artifacts/review/2026-08-09-candidate-disposition.md` (`80a5a82`); implementation convenience,
adoption results, and a wish for the release to feel substantial are not independent reasons, and
none was used as one.

**What this release claims, and nothing wider.** v1.4.0 introduces seven review-supported normative
changes after replay through the acceptance-lock invariant. The acceptance lock protects observable
semantics for the ten machine-examined rules. It does **not** establish semantic integrity for the
remaining thirty-five human-judgement rules, and it says nothing about the completeness of the
normative corpus. That 10-of-45 figure is an assurance boundary, not a gap awaiting work.

**Twelve supported dispositions entered normative replay and seven survived it.** MINOR: one
recommendation added, one requirement's accepted evidence widened, five prose clarifications that
change no rule's contract.

### Acceptance moved — one state, in the permissive direction

Required by `invariant.acceptance-locked`, added in 1.3.0 precisely because this change was invisible
to the catalog integrity check the first time it was made.

| State | Was | Now | Direction |
| --- | --- | --- | --- |
| `deps.ranged-with-lock` — a ranged manifest beside a committed lock artifact | failed | **passed** | **widened** |

Nothing else moved. `deps.ranged` — ranges and nothing else — still fails, and so does
`deps.pyproject-no-lock`. The gate blocked with exit 3 until `artifacts/acceptance-baseline.json` was
updated with the reason, which is the transition working rather than an obstacle to it.

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
