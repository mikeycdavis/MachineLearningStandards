# First adoption — findings

**Date:** 2026-08-09 · **Framework version under test:** `v1.0.0` (tagged before this exercise, so
that what follows is measured against something that does not move)

**Targets:** two real machine-learning repositories on the same machine, neither written with these
standards in mind:

| Target | Shape |
| --- | --- |
| `Numerai` | Multi-phase tournament pipeline. Contains a **committed virtualenv** (`test-env-3.11/Lib/site-packages/`) and several `.claude/worktrees/` copies of itself. |
| `kaggle` | Multi-competition repository, largely agent-written. Contains several `.claude/worktrees/` copies of itself. |

Both were scanned **read-only**. Nothing was written into either repository. The adoption flow
(`init`, `evaluate`, `explain`, `status`) was exercised against a temporary copy of
`Numerai/phases` plus its requirements file.

---

## Summary

The standards held up. The **scanner's scope did not**, and the **bootstrap manufactures
compliance**. Both are tooling defects; no evidence emerged that any of the twenty-five standards is
wrong, incomplete, ambiguous, or misscoped, and none was changed.

| # | Finding | Severity | Is it a standards defect? |
| --- | --- | --- | --- |
| 1 | `init` writes placeholder templates that immediately satisfy three required rules | **Critical** | No — tooling |
| 2 | The scanner reads vendored, third-party, and disposable code and reports it as the project's | **Critical** | No — tooling |
| 3 | Both scans silently exhausted the file cap, so coverage was incomplete | High | No — tooling |
| 4 | A blocked run still prints a score | Medium | No — reporting |
| 5 | `explain` cites a standard by glob rather than by filename | Low | No — tooling |
| 6 | Only two of thirty-seven evidence requests are machine-actionable | Observation | No — domain |

---

## Finding 1 — the bootstrap manufactures compliance

**Critical.** This is the framework producing exactly the false confidence
[ADR 0004](../adr/0004-honest-automation.md) exists to forbid, and producing it with its own
command.

Before `init`, the target failed five rules. After `init` — with no work done on the project at all —
three required rules flipped to `passed / evaluated`:

```text
deployment.model-card            passed / evaluated
data.provenance-documented       passed / evaluated
evaluation.baseline-exists       passed / evaluated
```

The reported score went from unmeasured to **83%**. The document that satisfied
`evaluation.baseline-exists` was this, verbatim, written by `init` seconds earlier:

```text
| Baseline — REPLACE with the strongest simple thing that could reasonably work | | | |
```

An empty row whose only content is an instruction to replace it. The card still contained
`REPLACE-ME` placeholders when the check passed it.

**Why the standard is not at fault.** Standard 25 R1 is right that a model card should exist and
travel with the model. The defect is that the detector cannot distinguish a card from a form, and
the bootstrap supplies the form.

**Recommended remedy (v1.1), not applied here.** A document check should ignore a section whose body
is empty or consists only of template placeholder text, and `init` should mark what it writes as
unfilled — a machine-readable marker the detectors treat as absence. The alternative, dropping the
document detectors, would be worse: their finding on an un-bootstrapped repository was correct and
useful.

**What must not be done:** weaken Standard 25, or exempt bootstrapped projects. The rule is right;
the evidence for it is being faked by the tool.

---

## Finding 2 — the scanner reads code the project did not write

**Critical**, and the cause of every false positive observed.

`Numerai` produced a `preprocessing-fit-before-split` finding against
`leakage.no-preprocessing-leakage`. **All twelve pieces of evidence were false positives**, and every
one of them was inside scikit-learn's own test suite in the committed virtualenv:

```text
test-env-3.11/Lib/site-packages/sklearn/tests/test_pipeline.py:397
test-env-3.11/Lib/site-packages/sklearn/linear_model/tests/test_logistic.py:614
test-env-3.11/Lib/site-packages/sklearn/utils/estimator_checks.py:931
   … nine more, all under site-packages
```

Evidence pointing at non-project code:

| Target | Share of evidence |
| --- | --- |
| `kaggle` | 79 of 86 entries cited `.claude/worktrees/` |
| `Numerai` | 42 of 125 entries cited `site-packages`; the `ml-footprint` evidence was entirely worktree copies |

The `MAX_EVIDENCE` cap of twelve then crowds the real project out of the report entirely. A reader
following this output would go and edit a library they do not own, inside a directory that is
disposable.

**The controlled comparison.** Scanning only real project code — `Numerai/phases`, 663 files, no
truncation — produced **zero** findings from `preprocessing-fit-before-split`,
`test-identifier-in-fit`, or `seed-absence`. The three code-analysis detectors have a **false
positive rate of zero on project code**. Every false positive came from scope, not from the
heuristics.

That is a genuinely good result for the detectors and a bad one for the walker.

**Recommended remedy (v1.1), not applied here.** Extend the skip list to cover vendored and
disposable trees — `site-packages`, `.claude/worktrees`, `.git/worktrees`, `Lib/`, `Scripts/`,
`.tox`, `.eggs`, `*.egg-info` — and, better, respect `.gitignore` so the scanner examines what the
project actually version-controls. Note that a project's own tests must **not** be skipped: the
sklearn false positives are library tests, and a project's own test suite is legitimately in scope.

---

## Finding 3 — silent-ish truncation

Both full-repository scans stopped at the 20,000-file cap. The tool did disclose it:

```text
[warning] scan-truncated
The scan stopped at 20000 files. Coverage below is incomplete, and a clean result
does not describe the whole repository.
```

That disclosure is correct behaviour and worked as designed. But the truncation was caused entirely
by Finding 2 — the caps were consumed by vendored and duplicated code — and while truncated, the
scan's results are also **order-dependent and therefore not deterministic** across filesystems,
which contradicts the determinism property claimed in `PROJECT.md`.

Fixing Finding 2 removes the cause. The cap should stay.

---

## Finding 4 — a blocked run still prints a score

Attempting the obvious shortcut on a real target — lowering the level of the one failing rule —
correctly produced:

```text
Status: BLOCKED_BY_INVARIANT
Score:  83%  (required- and forbidden-level rules that were evaluated: 6)
```

Exit 3, as designed. But printing a score beneath a blocked status undercuts the reasoning in
[ADR 0005](../adr/0005-integrity-invariant-enforcement.md): if the ruler has been altered, the
number computed with it should not be published at all. The score line should be suppressed, or
replaced with an explicit refusal to compute one, when the status is blocked.

---

## Finding 5 — `explain` cites a glob

```text
Standard 15 R2 — standards/15-*.md
```

An agent cannot open `standards/15-*.md`. The catalog has the standard number and the inventory has
the filename; the two should be joined so the line names the actual file.

---

## Finding 6 — the evidence-request split, measured

On the real target, forty-five rules were applicable and the requests divided:

```text
2 producible by an agent unaided:
    data.version-pinned
    reproducibility.experiment-config-recorded
35 requiring human judgement
```

This is the honesty model behaving exactly as designed rather than a defect, and it is worth
stating plainly: **an agent can close two of thirty-seven gaps on its own.** The rest need a person.
That ratio is the domain, not the tooling, and inflating it would mean inventing checks that guess.

Request wording held up. Only one request was shorter than ninety characters, and it is still
actionable (`evaluation.uncertainty-reported` — "An uncertainty estimate reported with each
comparison, and the method used to produce it"). No request was found to be too vague for an agent
to act on where action was possible at all.

---

## What worked, unchanged

- **The three code-analysis detectors are clean on project code.** Zero false positives across 663
  real files.
- **`status` caught applicability drift correctly.** Declaring `leakage.no-target-in-features`
  not-applicable and then scanning code that trains models produced:
  `declared not-applicable, but the scan now observes training-code`, quoting the recorded revisit
  condition back. This is the revisit mechanism working on a real repository.
- **The integrity invariant held under the realistic temptation.** The shortcut a person under a
  deadline actually takes — lowering the level of the failing rule rather than pinning the
  dependencies — was blocked with exit 3.
- **`explain` was sufficient to remediate** without opening the standard: it gave the rule, its
  applicability and why, the evidence expected, the verification method, the honest limits of that
  method, and the remediation.
- **`init --dry-run`** described the plan and wrote nothing, and the real run wrote exactly what it
  described.
- **Applicability triggers were sensible.** `ml-footprint`, `training-code`, `data-artifacts`,
  `notebooks-present`, `deployment-surface` and `temporal-signals` fired correctly on both targets.

## What was deliberately not done

No standard was changed. No rule was reclassified, exempted, or lowered. No target-specific
exception was written. Every finding above is either a defect in the tooling or a property of the
domain, and Findings 1 and 2 are recorded as work for v1.1 rather than applied here, so that the
`v1.0.0` baseline and the evidence against it stay separable.
