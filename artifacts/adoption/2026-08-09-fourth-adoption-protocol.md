# Fourth adoption — protocol, written before the target is chosen

**Date:** 2026-08-09 · **Framework version to be tested:** `v1.1.0`, **unchanged** · **Status:**
protocol recorded; target not yet selected.

The first three adoptions established structural validation: three differently shaped machine-learning
repositories, no standard requiring weakening, and two silent-pass defects found and fixed. They did
not establish external generalisation, because **all three share an owner**. A framework validated
only against its author's own repositories has been tested against its author's own assumptions.

This document states the selection criteria and the success conditions *before* a repository is
chosen, so the choice cannot be made to fit a desired result. That ordering is the same reason the
source inventory and the catalog baseline are committed rather than regenerated.

## The question this experiment asks

Not "does the framework find problems." The first three answered that.

> **Does MachineLearningStandards correctly understand machine-learning work written by people who
> had no knowledge of its assumptions?**

## Selection criteria

**Required.** All of them, verified and recorded before running anything.

| Criterion | Why it is required |
| --- | --- |
| Unrelated author and owner | The whole point. Same-owner targets cannot falsify a house-style assumption. |
| Predates MachineLearningStandards | A repository that could have been influenced by these standards is not independent evidence. |
| Genuine ML training and evaluation work | A library of utilities has no subject for most of the catalog. |
| Non-trivial | A ten-file example project will exercise nothing. |
| No modification to accommodate the standards | Read-only. Nothing is written into the target, and no file is adjusted to make a detector work. |

**Preferred**, not required: a conventional open-source project; real tests and CI; a documented
evaluation methodology; notebooks or experiments; production or research history.

**Explicitly not a criterion: expected outcome.** Do not choose a repository because it looks likely
to pass, and do not choose one because it looks likely to fail. A messy external project is probably
more informative than an exemplary one, and choosing on predicted result would make the experiment
report the choice rather than the framework.

## What to watch for

The defects this experiment can find that the first three could not — all of them varieties of the
framework mistaking its author's habits for the domain:

- **False applicability** — a rule fires on a project where it has no subject.
- **Ownership mistakes** — the scope model misreads an unfamiliar layout, monorepo, or submodule.
- **Terminology assumptions** — a detector keys on vocabulary that is one community's, not the field's.
- **Python-centric assumptions** — already a documented limitation; measure how much it costs on a
  real target rather than restating it.
- **Evidence requests that only make sense in the author's projects** — a request for an artifact
  that no reasonable external project would keep.
- **Detector conventions encoding house style** — a directory name, a heading, a file naming scheme
  treated as if it were universal.
- **Standards whose apparent universality depends on the author's own ML practice** — the most
  serious possible finding, and the one requiring the most evidence before acting.

## Disposition of what is found

The discipline that governed the first three applies unchanged, and is stated here so it is not
re-argued under the pressure of a fresh finding:

**An external repository disagreeing with a standard is not evidence that the standard is wrong.**
A violation is first evidence about the target. Only a case demonstrating that the standard itself is
wrong, incomplete, ambiguous, or incorrectly scoped justifies changing it — and `v1.1.0` changed no
standard for exactly that reason.

Findings are recorded as **post-`1.1` candidates**, not as automatic `1.2` work. Classification and
remediation are separate decisions, taken in that order.

**And if nothing significant is found, that is a result — not a reason to manufacture a development
cycle.** A framework that survives an independent target unchanged has learned something real, and
inventing work to justify the experiment would be the same failure mode this repository exists to
prevent, applied to itself.

## Procedure

1. Record the chosen target, the criteria check, and the provenance evidence, before running anything.
2. Run `v1.1.0` unchanged: `scan`, then `evaluate`, read-only. No `init`, because nothing is written
   into someone else's repository.
3. Record raw output, scope basis, and the tracked-versus-read file counts.
4. Classify every finding: true positive · false positive · scope defect · framework assumption ·
   standard defect. Provide the reasoning per finding, not a summary count.
5. Append the report here. Do not edit the earlier adoption records; the chronology is the evidence.
