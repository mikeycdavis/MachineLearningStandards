# Standard 12 — Metric Selection

The metric decides what counts as success, and a metric chosen after the results are visible decides
it in favour of whatever happened. This standard prevents the sequence that produces most misleading
evaluation reports: several metrics are computed, one is higher than the others, that one becomes
the headline, and the report is factually accurate throughout. Nothing was falsified. The selection
did the work.

Source: item 12 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every evaluation of a model, and to every claim about model quality made outside the
project. It covers the primary metric the model is selected on, the secondary metrics reported
beside it, and the operating threshold at which threshold-dependent metrics are computed — a metric
reported without its threshold is underspecified, not merely incomplete.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. It is not waived by
the model being exploratory: an exploratory model whose score is quoted in a decision has made a
claim, and the metric that produced the score is in scope.

## Requirements

### R1 — The metric follows from the problem and the cost of error

**The primary metric MUST be justified by reference to the decision the model's output feeds and
the relative cost of each kind of error, and that justification MUST be written down.** The
justification names the decision, states which error is more expensive and roughly by how much, and
explains why the chosen metric is sensitive to that asymmetry.

A metric selected because it is the library default, because it was used on the previous project,
or because it is what the framework's example prints is not justified. Those are all reasonable
starting points and none of them is a reason. The written justification is what makes the choice
reviewable — and reviewable by someone who disagrees, which is the case that matters.

Where the cost asymmetry is genuinely unknown, that is the finding, and it is recorded as such
rather than resolved by picking a symmetric metric and moving on. This is
[Standard 1](01-problem-formulation.md)'s output arriving here; a project that skipped problem
formulation will discover it at this requirement.

### R2 — The metric is fixed before the results that would tempt a different choice exist

**The primary metric MUST be recorded before the evaluation that will be reported against it is
run.** The record is dated, or is committed, or is otherwise fixed in a way that a later reader can
distinguish from a choice made afterwards.

This is not a claim that the metric can never change. Discovering during development that the chosen
metric is wrong for the problem is a legitimate and common finding. What the requirement demands is
that the change be visible as a change: the original choice, the reason for abandoning it, and the
date. A metric that was silently replaced and a metric that was always the plan are indistinguishable
in the final report, and only one of them is honest.

### R3 — Relevant metrics are reported together

**Where several metrics bear on the problem, all of them MUST be reported together, including the
ones that are unflattering.** Reporting precision without recall, recall without precision, or an
aggregate curve summary without the value at the operating threshold gives the reader a partial view
whose gaps are the parts most likely to matter.

The set to report is determined at R1 time, before the values are known, for the same reason the
primary metric is. A set assembled after the fact will be the set that survived inspection.

### R4 — A metric's limitations are stated alongside its value

**Every reported metric SHOULD carry a statement of what it does not capture.** Area under the
receiver operating characteristic curve is insensitive to a class imbalance that dominates the
decision; F1 fixes an equal weighting between precision and recall that few real problems have; a
mean absolute error obscures a tail of catastrophic misses; any threshold-dependent metric describes
one operating point out of a curve.

The obligation is small in effort and large in effect: a number reported with its limitation is a
number a reader can use, and the same number reported bare invites the reader to supply an
interpretation the project would not have endorsed.

### R5 — The threshold and the population are reported with the metric

**A threshold-dependent metric MUST be reported with the threshold that produced it and the
population it was computed over.** Two teams quoting "recall of 0.82" at different thresholds, or on
different segments, are not disagreeing — they are reporting different quantities under one name.

## Prohibitions

### P1 — Metrics are chosen for the problem, not the result

Reproduced verbatim from the source:

> select metrics solely because they make the model look better

The word *solely* is load-bearing and is often misread as an escape. It does not mean that a metric
which happens to favour the model is forbidden; the best metric for a problem will frequently also
be the one the model scores well on, and that coincidence is not a violation. It means that the
model's score MUST NOT be the reason for the selection.

The operational test is temporal and is what R2 exists to make checkable: was the metric fixed
before its value was known? If it was, this prohibition is not in question. If it was chosen or
changed afterwards, the project must be able to state a reason for the change that would have been
just as persuasive had the new metric scored worse.

### P2 — Accuracy is not a default

Reproduced verbatim from the source:

> treat accuracy as sufficient for every problem

Accuracy is a legitimate metric for a balanced problem with symmetric error costs, and this
prohibition does not forbid it. What it forbids is arriving at accuracy without deciding — reporting
it because it is the default output, and treating the resulting number as an adequate summary of
model quality regardless of the base rate or the cost structure.

[Standard 11](11-class-imbalance.md) works through why the number becomes uninformative at a low
base rate. The prohibition applies more widely than the imbalanced case: accuracy is equally
inadequate on a balanced problem where a false positive costs a thousand times what a false negative
does, because it weights the two identically by construction.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A written metric rationale naming the decision and the cost asymmetry | Manual review | None |
| R2 | The rationale committed before the evaluation it governs, or a dated record of the change | Manual review of history | None |
| R3, R5 | An evaluation document reporting the agreed metric set with thresholds and populations | Manual review | None |
| R4 | A limitations note beside each reported metric | Manual review | None |
| P1 | Attestation that the metric was fixed before its value was known, with the R2 record as supporting evidence | Manual review only | None |
| P2 | Attestation that accuracy, where reported, was chosen against the problem's cost structure | Manual review only | None |

**Why nothing automated applies here.** Metric appropriateness was considered as a detector and
rejected. Whether accuracy suffices depends on the class distribution and on the cost of an error,
and neither is visible in a repository — a scanner that flagged `accuracy_score` would be guessing,
and it would be wrong in both directions, failing balanced symmetric-cost problems where accuracy is
correct and passing imbalanced ones where the call is made in a document it cannot interpret.
Metrics found in code are therefore reported descriptively only, by detector D4 at `info` severity
and bound to no rule: the finding says which metric functions appear, not whether they were the
right ones. Every rule and both prohibitions here report `not-evaluated`.

## Additions this standard makes beyond the source

- R5, requiring the threshold and the population beside any threshold-dependent metric. The source
  requires that limitations be stated; that an unqualified threshold-dependent figure is
  underspecified rather than merely incomplete is this standard's position.
- The temporal test for P1 — was the metric fixed before its value was known — and the reading of
  *solely* that makes a favourable-but-correct metric permissible. The source states the prohibition
  without an operational test.
- The requirement in R2 that a metric change be visible as a change rather than forbidden. The
  source requires the metric be chosen before the tempting results exist; treating revision as
  legitimate when disclosed is this standard's interpretation.
- The reading of P2 as covering symmetric-cost failures as well as imbalance — accuracy is
  inadequate on a balanced problem with asymmetric costs, which the imbalance framing alone misses.
- The specific limitation examples in R4, which are illustrative and authored.

## Relationship to other standards

[Standard 1](01-problem-formulation.md) produces the cost asymmetry R1 depends on; without it, R1
cannot be satisfied except by inventing one. [Standard 11](11-class-imbalance.md) supplies the base
rate that determines whether accuracy is informative, and its worked illustration is the concrete
case behind P2. [Standard 13](13-calibration.md) governs the separate question of whether the score
a metric is computed from means what a reader will assume it means.
[Standard 19](19-model-comparison.md) requires that compared models share a metric, which is only
possible if this standard has produced one, and [Standard 20](20-uncertainty.md) attaches the
uncertainty without which a metric difference cannot be read.
[Standard 25](25-model-limitations.md) is the eventual home of R4's limitation statements when they
concern populations rather than the metric's construction.

## Implementation

**Not checked automatically.** No rule in this standard is bound to a detector, and this is a
decision rather than an omission — recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md) under metric appropriateness, which was
considered and rejected because a pass would assert a judgement the scanner has no basis for.

What the tooling does contribute is descriptive: detector D4 reports which metric functions the code
imports or calls, at `info` severity, bound to no rule. A reviewer can use it to notice that a
project computing only `accuracy_score` has an unstated position on this standard, and an agent can
use it to phrase a precise evidence request. Neither is a verdict. Nothing verifies that a metric
was appropriate, that it was fixed before its value was known, that the reported set is complete, or
that an unflattering metric was not quietly dropped — the last of these being undetectable by
construction, since the auditor cannot see what was not reported.
