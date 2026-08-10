# 0007 — Evidence must establish its subject, and silence must be earned

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner
- **Amends** [0004](0004-honest-automation.md) and [0006](0006-scaffolding-and-scope.md). Supersedes
  nothing.

## Context

Three releases have asked progressively harder questions of the same corpus:

```text
v1.0   Can we evaluate ML repositories at all?
v1.1   Are we evaluating the right files, without manufacturing evidence?
v1.2   Does the evidence actually establish the proposition we say it establishes?
```

The fourth adoption — `ultralytics/yolov5`, unrelated owner, six years older than this repository,
containing no scikit-learn at all — produced three findings that the first three targets could not
have produced, because all three shared an owner and a dialect. Recorded in
[`2026-08-09-fourth-adoption.md`](../adoption/2026-08-09-fourth-adoption.md).

All three inflate confidence rather than raise false alarms, which is the direction that has no
complainant.

## Decision

### Owned is not the same as committed

v1.1 solved "which files" by asking git what the project tracks. That equated *owned* with
*committed*, and the two are not the same thing:

```text
owned project content
├── tracked files
└── relevant untracked files
    └── excluding ignored, dependency, environment, generated and ephemeral content
```

Scope becomes **git-aware rather than `git ls-files --cached`-only**: tracked files plus untracked
files git does not consider ignored, with the v1.1 structural filters still applied on top so an
environment nobody remembered to ignore stays out.

The acceptance test is unusually clean, because the adoption isolated it to one variable:

> **Identical completed evidence must receive an identical disposition before and after `git add`.**

That is now a permanent regression test. Under v1.1 a completed model card scored
insufficient-evidence at 80% untracked and passed at 83% staged, with the file unchanged — the
documented adoption workflow (`init`, edit, `evaluate`) telling operators that the documents they
had just written did not exist.

`.gitignore` remains decisive. It is the project's own statement about what it disowns, and asking
the project is still better than guessing.

### Evidence must establish the subject of the rule it is offered for

> **Evidence for a rule must establish the subject of that rule, not merely a structurally similar
> activity.** Versioning a model artifact cannot satisfy a requirement that the *dataset* is
> versioned.

This extends the use/mention discipline rather than replacing it:

```text
mention        ≠ use
use            ≠ relevant use
relevant use   ≠ sufficient evidence
```

The existing rule handles the first line — prose naming scikit-learn is not use of scikit-learn. The
third line is what failed: `wandb.log_artifact(...)` is unambiguously a *use* of an artifact API,
and every call site in the target logged `type="model"`. The subject has to be carried all the way
through, not inferred from the shape of the activity.

Two detectors were corrected. The dataset-versioning check now requires an artifact reference whose
subject is data. The experiment-configuration check now requires a call that records parameters
rather than one that opens a session — a defect found by the audit rather than by the field, and one
that does not change the adoption target's answer, because its `wandb.init(config=opt)` genuinely
does record them.

### Silence is probative only where the detector had a subject to read

Two propositions travel together and only one is always true:

```text
1. No violation was detected.
2. The prohibition was established as satisfied.
```

> **Absence of a detector finding establishes compliance only when the detector has sufficient
> subject coverage to make absence probative.**

A detector that declares a coverage gap and finds nothing now reports `not-evaluated`, with the
reason stated, routing to human judgement. No new disposition was added; the existing two-way split
between "gather the evidence" and "a human must judge this" already had the right shape.

**The audit came before the change.** Fixing only the two prohibitions the adoption exposed would
have concealed whether the problem was general, so all ten machine-examined rules were classified
against the question "when this detector emits nothing, what does that mean?" — recorded in
[`design/negative-evidence-audit.md`](../../design/negative-evidence-audit.md). Seven were sound,
and sound for a common reason: **their silence follows from something they positively saw.** Three
were not. One of the three was found by the audit and not by any target.

## Alternatives considered

**Stop matching `log_artifact`.** Rejected. It fixes one regex and leaves the principle unstated, so
the next detector reintroduces it. The correction is about subject identity, not about a token.

**Add a third "unknown" disposition for coverage gaps.** Rejected. The disposition vocabulary is on
the frozen surface, so this would force a MAJOR release, and it would buy a distinction the existing
`not-evaluated` already carries — no further file will give a detector a dialect it cannot read,
which is exactly what `not-evaluated` means.

**Treat a coverage gap as `insufficient-evidence`.** Rejected for the same reason inverted:
`insufficient-evidence` promises that producing an artifact resolves it, and here nothing an agent
can produce will.

**Infer coverage from "found nothing".** Rejected, and this is the trap the change had to avoid. If
absence of a finding were itself read as absence of coverage, every correct pass would collapse into
a shrug and the checks would be worthless. Coverage is asserted from what the detector *did* see —
the idiom present, the call shape present — and both directions are tested.

**Widen the document checks to match headings loosely.** Deferred. The exact-heading match cannot
see a real results table on the adoption target because its README headings carry emoji. It answered
`insufficient-evidence` rather than reaching a wrong conclusion, which is the correct failure
direction, and loosening it risks accepting a mention as a section. One target is not enough
evidence for that trade.

## Consequences

Scores fell across the frozen corpus with the corpus unchanged: `yolov5` 88% → 80% → 50%, `Numerai`
67% → 67% → 0%. Every point removed was a pass the framework was not entitled to. A release that
lowers scores without touching a standard is the expected shape of this kind of correction, and
[`CHANGELOG.md`](../../CHANGELOG.md) already forbids judging a version by the direction its scores
move.

Evidence requests rose again, 5/36 → 5/38 on `Numerai`, with the increase in the human column. Two
consecutive releases have now moved that ratio upward for the right reason.

Coverage is unchanged: 10 of 45 rules machine-examined, across 25 of 25 standards. **This release
removed confidence and added no reach**, which is what a narrow epistemic-correctness release should
do.

The widened scope creates one new risk, and it is guarded rather than argued away: `--others` will
hand back an environment or a dependency tree that nobody ignored. The v1.1 structural filters apply
to the untracked set for exactly that reason, and the test that proves it uses `test-env-3.11`, the
directory name from the adoption that motivated the filters in the first place.
