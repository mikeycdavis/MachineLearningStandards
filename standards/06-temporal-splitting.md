# Standard 6 — Temporal Splitting

A random split over time-ordered data hands the model observations from after the moment it is
pretending to predict, and the score that follows is not optimistic — it answers a question
nobody will ever ask in production. The failure is quiet because the arithmetic is faultless and
the pipeline is conventional: rows were shuffled, a fraction was held out, a number came back. What
the number describes is a world in which the future is already known.

Source: item 6 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies whenever observations carry an order in time and predictions will be made about periods
later than the data they are fitted on. That covers the obvious cases — forecasting, churn, fraud,
demand — and the less obvious ones, where the target is not a time series but the generating
process drifts: a classifier over user behaviour, a pricing model, anything scored on records that
arrive continuously.

Applicability is proposed by the `temporal-signals` and `training-code` triggers. A dataset with a
timestamp column is not automatically in scope: if predictions are made about the same period the
data was drawn from, and the population is not evolving, time is a field rather than a structure.
Declaring the rule not-applicable with that reason is a legitimate outcome, and
[Standard 1](01-problem-formulation.md) is where the reason should already be written down.

## Requirements

### R1 — Whether the data is time-ordered is decided explicitly and recorded

**A project MUST record a decision about whether its observations are time-ordered with respect to
the prediction task, and MUST state the reasoning.** The default in most tooling is a shuffle, so
temporal structure that nobody names is temporal structure nobody respects.

The question is not whether a timestamp exists but whether the prediction is about the future. A
model scoring historical records for an analyst is in a different position from the same model
scoring tomorrow's arrivals, and the split that is honest for one is dishonest for the other.

### R2 — Splits follow time: fit on the past, evaluate on the future

**Where the data is time-ordered, every split boundary MUST be a point in time, with the training
partition entirely before it and the evaluation partition entirely after.** No observation in the
training data may originate later than any observation used to evaluate.

The requirement extends past the row's own timestamp to everything computed from other rows. An
aggregate over a customer's whole history, a target encoding fitted over the full dataset, a
normalisation constant derived from all periods — each carries information from after the boundary
into the training partition even when every individual row is correctly placed.
[Standard 8](08-leakage.md) treats these as the leakage paths they are.

### R3 — A gap covers the label's maturation period

**Where a label takes time to become known, the split SHOULD include a gap between the end of
training and the start of evaluation at least as long as that period.** A ninety-day default
outcome is not observable for ninety days; training on records up to the boundary means training on
labels that, at the boundary, did not yet exist.

The gap's length is a property of the label rather than a tuning parameter, and it should be
derived from how the label is produced and recorded with that derivation. Its cost is real —
periods fall out of both partitions — and paying it is what makes the evaluation correspond to the
information a deployed model would actually hold.

### R4 — Evaluation periods are chosen for representativeness and fixed before results are seen

**The evaluation period MUST be chosen and written down before any result on it is computed, and
the choice MUST be justified by representativeness rather than by convenience or outcome.** A
period containing no promotion, no outage, and no seasonal peak may be the cleanest available data
and the least informative test of a model that will meet all three.

Where several periods are defensible, evaluating on all of them and reporting each is the
compliant response; evaluating on all of them and reporting the best is P2 below. Pre-registration
is what separates the two, and it costs nothing before the fact and cannot be reconstructed after
it.

## Prohibitions

### P1 — No training on the future

Reproduced verbatim from the source:

> train on future information unavailable at prediction time

This covers every route by which post-boundary information reaches the fitted model: rows that sit
on the wrong side of the split, aggregates whose windows extend past it, features backfilled with
values corrected after the fact, and joins against tables that hold only their current state rather
than their state at prediction time. The last is the most common and the least visible, because the
join looks identical in training and in production and returns different data in each.

This prohibition is **non-exemptible**. A model trained on information that will not exist at
prediction time is invalid rather than non-compliant — the estimate it produced measures a task
that cannot be performed, and waiving the rule does not make the model work.

### P2 — Evaluation periods are chosen before results

Reproduced verbatim from the source:

> cherry-pick favorable evaluation periods

The prohibited act is selection informed by the result: computing performance across candidate
windows and reporting the window that flattered the model, or quietly extending, trimming, or
shifting a period after seeing what it produced. The reported figure is then the maximum of a
search whose other draws are invisible, and a reader cannot discount what they cannot see.

This is undetectable by construction — an auditor sees the period that was reported and never the
periods that were not, which is why
[ADR 0004](../artifacts/adr/0004-honest-automation.md) names it among the checks deliberately not
built. Compliance rests on R4's pre-registration, which is why R4 asks for a written choice with a
date rather than a defensible one.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A recorded determination of temporal structure with its reasoning, or a not-applicable declaration carrying the same | Manual review | None — reports `not-evaluated`; remediation is an attestation |
| R2 | A split record naming the boundary timestamp and the range covered by each partition | Manual review | None — `not-evaluated` |
| R3 | The label maturation period, its derivation, and the gap applied | Manual review | None — `not-evaluated` |
| R4 | The evaluation period recorded with a date preceding the first result on it | Manual review | None — `not-evaluated` |
| P1 | Attestation that every feature's window ends at or before the boundary, supported by the lineage records of [Standard 17](17-feature-lineage.md) | Manual review only | None — `not-evaluated` |
| P2 | Attestation that the evaluation period was fixed in advance, with R4's dated record as supporting evidence | Manual review only | None — `not-evaluated` |

**Why nothing automated applies here.** Whether information was available at prediction time is a
property of data values and join semantics, not of source text: the same expression is compliant
against a point-in-time table and a violation against a table holding current state, and nothing in
the repository distinguishes them. Flagging date-column usage would produce a finding on every
correct temporal pipeline while missing every incorrect one that does not mention a date, which is
the false confidence [ADR 0004](../artifacts/adr/0004-honest-automation.md) forbids. P2 is worse
still: the auditor can only ever see what was reported. Every rule in this standard is satisfied by
attestation, and the attestation should name the boundary, the gap, and the date the period was
fixed, so that a later reader can check the claim against the artifacts rather than accept it.

## Additions this standard makes beyond the source

- R1's requirement that the temporal determination be made *explicitly and recorded*, including
  when the answer is no. The source describes what to do when observations are ordered in time; it
  does not require the ordering question to be asked in writing. The addition exists because the
  default tooling behaviour is a shuffle, so an unasked question resolves to the wrong answer
  silently.
- The extension of R2 beyond row placement to aggregates, encodings, and normalisation constants
  computed across the boundary. The source names the gap and the direction of the split; treating a
  correctly placed row with a future-spanning feature as a violation of the same requirement is
  this standard's reading.
- The identification of point-in-time joins in P1 — a join against a table holding current state
  rather than historical state — as the most common and least visible route. The source does not
  name this case.
- R3's statement that the gap length is derived from the label's production process rather than
  chosen, and R4's rule that evaluating several periods and reporting all of them is compliant
  while reporting the best is not.

## Relationship to other standards

[Standard 5](05-train-validation-test-separation.md) requires three separated roles; this standard
determines where their boundaries fall, and a correct three-way separation drawn randomly over
temporal data satisfies that standard while violating this one.
[Standard 10](10-cross-validation.md) applies the same ordering constraint to folds through
forward chaining. [Standard 7](07-feature-availability.md) asks the same question from the serving
side — a feature that violates P1 in training is usually a feature that will be unavailable at
inference. [Standard 17](17-feature-lineage.md) supplies the per-feature windows that make P1
answerable, and [Standard 21](21-drift.md) addresses what happens when the future the model was
evaluated on stops resembling the future it serves.

## Implementation

**Not checked automatically.** No detector is bound to any rule in this standard. Nothing examines
whether a split boundary is a timestamp, whether a gap covers label maturation, or whether an
aggregate window crosses the boundary, and nothing could establish those facts from repository text
without inferring the semantics of data it cannot see.

Every rule here therefore reports `not-evaluated` rather than `insufficient-evidence`: the
distinction is that no mechanism exists, so no amount of evidence-gathering by an agent will move
the result, and the remediation is a human judgement recorded as an attestation. This is a
deliberate position rather than a backlog item —
[ADR 0004](../artifacts/adr/0004-honest-automation.md) records temporal leakage beyond in-file
ordering and cherry-picked evaluation periods as checks considered and rejected, and building
either later requires amending that record.
