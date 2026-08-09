# Standard 13 — Calibration

A model that outputs 0.9 is not saying that nine in ten such cases are positive unless someone has
checked. The number lies between zero and one, the variable is often named `probability`, and every
downstream consumer will treat it as one — multiplying it by a cost, thresholding it on expected
value, feeding it into another model that assumes a probability scale. This standard prevents a
score from acquiring the authority of a probability by resemblance alone, which is a failure that
produces wrong decisions while every component behaves exactly as built.

Source: item 13 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every model whose output is a continuous score that a downstream consumer might read as a
likelihood — classifier probabilities, ranking scores, risk scores, anomaly scores. The obligation
sharpens where the output is combined arithmetically with anything else: a threshold applied to a
score is a decision about ordering and survives miscalibration, whereas an expected-value
calculation multiplies the score by a cost and inherits the error directly.

Applicability is proposed by the `ml-footprint` and `deployment-surface` triggers. A model whose
output is consumed only as a ranking, and which is documented as such, may declare the calibration
rules not-applicable with that as the reason — but see R1, because establishing that no consumer
treats the output as a probability is work, not an assumption.

## Requirements

### R1 — Determine and record how the output is consumed

**Every model MUST record whether its output is used as a probability, and by whom.** The record
enumerates the consumers — a threshold rule, an expected-value calculation, a human reading a
percentage on a screen, a downstream model — and states for each whether the numeric value or only
the ordering matters.

This is the requirement that decides whether the rest of the standard applies, so it cannot be
skipped on the grounds that the rest does not apply. A human reading "87%" on a screen is treating
the output as a probability regardless of what the specification says, which makes the interface as
much a consumer as the code is.

### R2 — Where the output is used as a probability, calibration is measured and reported

**Calibration MUST be measured on held-out data and reported wherever the model's performance is
reported.** A reliability curve with its binning stated, together with a summary such as expected
calibration error or a Brier score decomposition, is sufficient; a summary statistic alone is not,
because it conceals the shape of the error and a model can be badly miscalibrated in the region
where decisions are made while scoring well overall.

The measurement is made on data the model has not been fitted or tuned on, under the same discipline
[Standard 5](05-train-validation-test-separation.md) imposes. Calibration measured on training data
is a description of memorisation.

Calibration is reported per segment wherever performance is reported per segment. Aggregate
calibration routinely conceals a subgroup for which the model is systematically overconfident, and
that subgroup is the population the decisions harm.

### R3 — Recalibration is fitted on its own data and disclosed

**Where recalibration is applied, the method, the data it was fitted on, and the resulting
calibration measurement MUST be recorded, and the fitting data MUST NOT be the test set.** Platt
scaling, isotonic regression, and temperature scaling are all fitted procedures with parameters, and
a recalibrator fitted on the test set consumes that set exactly as any other tuning does.

The post-recalibration measurement is the one that supports any probability claim; the
pre-recalibration figure is reported alongside it, because the size of the correction is information
about the model. Where training used resampling or class weighting, [Standard 11](11-class-imbalance.md)
requires that be disclosed here, since a model trained on a rebalanced sample has a systematically
displaced output scale that recalibration against the true base rate is the usual remedy for.

### R4 — Absent evidence, the output is called a score

**Where calibration has not been established, the output MUST be described as a score rather than a
probability, in the model card, the API contract, the field names, and the user interface.** The
word travels further than the caveat. A field named `probability` with a note elsewhere saying it is
uncalibrated will be consumed as a probability by the next engineer who reads the schema and not the
note.

This is the requirement that is cheap to satisfy and most often ignored. Renaming a field costs
nothing; the consequence of not renaming it is that every downstream misuse looks like the
consumer's fault when it was licensed by the name.

### R5 — Calibration is rechecked when the population moves

**Calibration SHOULD be re-measured on a schedule and after any event that changes the input
distribution, the base rate, or the model.** Calibration decays faster than discrimination: a model
can continue to rank correctly long after the absolute level of its scores has drifted away from the
observed rate. This makes it a monitoring obligation as much as an evaluation one, and
[Standard 24](24-monitoring.md) is where the ongoing measurement lives.

## Prohibitions

### P1 — Scores are probabilities only with evidence

Reproduced verbatim from the source:

> treat confidence scores as calibrated probabilities without evidence

The prohibited act is the treatment, not the output. A model may emit any score it likes. What is
forbidden is a downstream use — an expected-value threshold, a cost multiplication, a reported
percentage, a composition with another model's probability — that depends on the score being
calibrated, in the absence of a measurement establishing that it is.

The evidence must be current and must concern this model on this population. A calibration
measurement taken on a previous version, or on a different segment, or before a change to the
training distribution, is not evidence about the model now in service. Nor is the presence of a
softmax layer, a sigmoid output, or a method named `predict_proba` — those establish the range of
the output and nothing about its meaning.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A consumer inventory in the model card stating, per consumer, whether the value or only the ordering is used | Manual review | None |
| R2 | A reliability curve and calibration summary on held-out data, reported per segment where segments are reported | Manual review | None |
| R3 | The recalibration method, its fitting data, and pre- and post-correction measurements | Manual review | None |
| R4 | Model card, schema, and interface using the word "score" where no calibration evidence exists | Manual review | None |
| R5 | A recheck schedule, and the drift and monitoring hooks required by [Standard 24](24-monitoring.md) | Manual review | None |
| P1 | Attestation that every consumer depending on a probability scale is supported by a current measurement | Manual review only | None |

**Why nothing automated applies here.** Calibration verification requires running the model against
data, which is outside a static auditor's contract — the auditor reads repository text and does not
execute the target's code. There is no weaker version worth building: the presence of a
`calibration.py` or a section heading establishes that someone wrote something about calibration,
not that a model is calibrated, and a passing result on that basis is precisely the false confidence
the design forbids. Every rule here reports `not-evaluated` and is satisfied by attestation
recording what was measured, on which data, and when.

## Additions this standard makes beyond the source

- R1's consumer inventory. The source conditions the calibration obligation on whether downstream
  decisions treat the output as a probability; requiring that this determination be made explicitly
  and recorded per consumer is this standard's addition, on the reasoning that the condition is
  otherwise assessed implicitly and usually optimistically.
- The extension of R4's naming requirement to field names, API contracts, and user interfaces rather
  than to prose alone. The source requires the output be *described* as a score.
- The requirement in R2 that calibration be reported per segment, and the observation that aggregate
  calibration conceals overconfident subgroups.
- R5 and the claim that calibration decays faster than discrimination. Not in the source; this
  standard's reasoning about why the measurement is a monitoring obligation.
- The clarification in P1 that a sigmoid, a softmax, or a `predict_proba` method is not evidence.
- The requirement in R3 to report the pre-recalibration figure beside the corrected one.

## Relationship to other standards

[Standard 11](11-class-imbalance.md) creates the most common cause of miscalibration by requiring
resampling to be disclosed here. [Standard 12](12-metric-selection.md) governs which metric a score
is judged by; calibration is orthogonal to it, and a model can top every discrimination metric while
being unusable in an expected-value calculation. [Standard 23](23-inference-behavior.md) is where
the output contract R4 constrains is specified, and where a score-versus-probability naming decision
becomes binding on consumers. [Standard 24](24-monitoring.md) carries R5's ongoing measurement, and
[Standard 21](21-drift.md) names the events that trigger it. [Standard 25](25-model-limitations.md)
is where an established miscalibration on a known segment must be stated.

## Implementation

**Not checked automatically.** No detector is bound to any rule in this standard. Calibration
verification was considered during the design and rejected outright: establishing it requires running
the model against data, which the auditor does not and will not do, and every static proxy — a
heading, a library import, a filename — reports the existence of an artefact rather than the
property the standard is about.

`standards scan` may note descriptively that a calibration library or a `predict_proba` call appears
in the code. That is `info` severity, bound to no rule, and it is context rather than compliance.
Nothing verifies that calibration was measured, that a measurement is current, that a recalibrator
was fitted off the test set, or that an output named `probability` has earned the name. All of it
rests on attestation, which is the honest boundary recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md).
