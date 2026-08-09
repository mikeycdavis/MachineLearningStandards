# Third adoption — a differently shaped target

**Date:** 2026-08-09 · **Framework version under test:** `v1.0.0` · **Appended, not merged** into the
first report, so the record stays chronological.

**Target:** `bitgrit` — several machine-learning competition subprojects in one repository, real
dependency management (`requirements.txt`, `requirements-dev.txt`), generated training output
(`catboost_info/`), logs, tool caches, and a committed-on-disk virtualenv. Twenty-four commits of
real history. **No `.claude/worktrees/`**, which is what made it worth choosing: the first two
targets shared a convention, and a defect that only appears under that convention would not
generalise.

Scanned read-only. Nothing was written into the repository.

## The number that matters

```text
files git tracks:        41   (11 Python, 0 notebooks)
files the scanner read:  20,000   — the cap, hit and disclosed
on disk:                 18,491 Python files, 80+ GB
```

The repository's own `.gitignore` excludes the data, the trained models, the logs, and the
environment. The project's owned surface is **41 files**. The scanner read at least four hundred
times that, and still did not finish.

This is the strongest available evidence for the ownership model over a skip list. A skip list is a
guess about what to exclude and will always trail the ecosystem — `test-env-3.11` is not a name
anyone would have predicted. The repository already states what it owns, in a file written for
exactly that purpose, and `git ls-files` answers the question exactly rather than approximately.

## What generalised

Every v1.0 finding reproduced on a differently shaped target:

| Finding | Reproduced? |
| --- | --- |
| 2 — scanner reads unowned code | Yes. 20,000 files read against 41 owned. |
| 3 — truncation | Yes. Cap hit again. |
| 1 — bootstrap manufactures compliance | Not re-tested here; nothing was written into this repository. Already demonstrated. |

No target-specific accommodation was needed to run the tool, and no standard looked wrong against
this repository either. The evaluator model generalised; the scope model did not.

## What only became visible with a third target

**Truncation makes findings order-dependent, and that is worse than incomplete.**

Numerai and bitgrit both contain a committed virtualenv with scikit-learn in it. Numerai produced
twelve false `preprocessing-fit-before-split` findings from `sklearn`'s own test suite. bitgrit
produced **none** — not because it is cleaner, but because the twenty-thousand-file cap fell before
the walk reached the equivalent directory.

The same defect therefore presents as a loud false positive on one repository and as silence on
another, decided by traversal order. Two runs of the same tool on the same class of target disagree
about whether a leakage rule is violated. That contradicts the determinism property `PROJECT.md`
claims, and it means neither result can be trusted in either direction.

Fixing the ownership model removes the cause: 41 files never approaches the cap.

## Honest limitation of this adoption

All three targets belong to the same owner. `bitgrit` differs in shape, tooling, and convention, and
it lacks the worktree pattern that dominated the first two — but it is not a third-party repository
with unfamiliar authorship. The generalisation claim above is therefore about **shape**, not about
**provenance**. A genuinely external target remains untested, and that gap should be closed before
the trigger and applicability model is considered settled.
