# Standard 11 — Class Imbalance

When one class is rare, the familiar metrics keep their names and lose their meanings. A model that
never predicts the rare class can score ninety-nine percent accuracy on a one-percent base rate, and
every default in the tooling — the 0.5 threshold, the accuracy summary, the confusion matrix
rendered without proportions — will agree that it is excellent. This standard prevents a project
from reporting that agreement as a result, and from correcting the imbalance in ways that quietly
change what the model's output means.

Source: item 11 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every classification problem, not only to those already known to be imbalanced —
establishing that the classes are balanced is itself the work this standard requires, and a project
that has not measured the base rate does not know which case it is in. It extends to multi-class
problems, where imbalance is usually confined to a subset of classes and is therefore easier to
miss, and to the segment level, where an overall base rate of thirty percent can conceal a segment
at half a percent.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. Regression problems
are outside it, though the analogous failure — a target whose distribution is dominated by one
region — belongs to [Standard 12](12-metric-selection.md).

## Requirements

### R1 — The class distribution is measured and stated

**The base rate of every class MUST be measured on the training, validation, and test partitions
separately, and MUST be recorded in the model card or evaluation document.**

The test partition's base rate is subject to [Standard 5](05-train-validation-test-separation.md)'s
embargo and MUST be obtained without breaking it: either derived from the split specification, which
a stratified or otherwise determined split fixes by construction, or measured after the model
configuration is final. It is not an exception to the embargo. A team that learns the test partition
sits an order of magnitude below the training partition will reasonably revisit its prior
correction, its threshold, or its calibration — and every one of those is a modelling decision
driven by the test set, which is the thing the embargo exists to prevent. Per-partition, because
a split that leaves the rare class distributed unevenly produces evaluation figures whose variance
has nothing to do with the model.

The record states counts as well as proportions. A test set containing eleven positive cases and one
containing eleven thousand support very different claims, and expressed as a percentage they can
look identical.

### R2 — The metric is chosen in light of the base rate

**Metric selection SHOULD take the measured imbalance as an input, and the reasoning SHOULD be
recorded.** At a low base rate, accuracy is dominated by the majority class and a receiver operating
characteristic curve is dominated by the abundance of true negatives; precision, recall, the
precision-recall curve, and metrics computed at the operating threshold the decision will actually
use are usually more informative. Which of these is right depends on the cost of each error type,
which is [Standard 1](01-problem-formulation.md)'s output and not this standard's to assume.

#### Why accuracy misleads at a low base rate

Take fraud screening on one hundred thousand transactions, of which four hundred are fraudulent — a
base rate of 0.4 percent. A model that predicts "not fraud" for every transaction is correct 99,600
times and wrong 400 times: accuracy 99.6 percent. It catches no fraud whatsoever. Its recall is
zero, its precision is undefined, and its value to the business is exactly the value of switching
the system off.

Now suppose a real model is built and it catches half the fraud while raising two hundred false
alarms. It is right 99,400 times — accuracy 99.4 percent, *lower* than the model that does nothing.
Ranked by accuracy, the useless model wins. Ranked by recall at a tolerable alert volume, which is
the quantity the fraud team actually operates on, the second model is the only one that exists.

The point is not that accuracy is a bad metric. It is that accuracy answers "how often is the label
correct", and at a 0.4 percent base rate that question has a 99.6 percent answer before any
modelling has occurred. A metric whose value is nearly determined by the base rate cannot report
much about the model.

### R3 — Resampling and weighting are applied to the training portion only

**Any oversampling, undersampling, synthetic generation, or class weighting MUST be applied inside
the training portion of each split or fold, and MUST NOT touch validation or test data.** Resampling
before a split places copies or synthetic neighbours of the same observation on both sides of it,
and the resulting evaluation measures the model's ability to recognise records it has already seen.
Synthetic oversampling makes this worse rather than better, because the interpolated points are not
identical to their sources and so evade duplicate detection while carrying the same information.

Evaluation is performed on the real, unresampled distribution. A test set rebalanced to fifty-fifty
reports performance on a population that does not exist, and every threshold derived from it is
wrong for production. This is the same discipline [Standard 8](08-leakage.md) applies to
preprocessing, and the reasoning is identical.

### R4 — Resampling is disclosed, with its effect on the implied base rate

**Where resampling or weighting is used, the technique, the ratio achieved, and its effect on the
model's output scale MUST be recorded.** Training on a rebalanced sample teaches the model a prior
that does not match the world: a classifier trained at fifty-fifty on a one-percent problem emits
scores centred far above the true rate, and those scores are no longer usable as probabilities even
approximately.

That consequence is [Standard 13](13-calibration.md)'s to resolve, either by recalibrating against
the true base rate or by declaring the output a score rather than a probability. What this standard
requires is that the fact be written down, because a downstream consumer who multiplies an
uncalibrated score by a cost has no way to discover the resampling by inspecting the output.

### R5 — Imbalance is examined per segment, not only in aggregate

**Segment-level base rates SHOULD be reported wherever the model's performance is reported per
segment.** A metric that looks stable across segments while the base rate varies by an order of
magnitude between them is describing the base rate, not the model. This connects to
[Standard 25](25-model-limitations.md), where the segments with too few positive cases to support
any claim must be named as such rather than reported with a number that implies precision.

### R6 — Resampling is not the default response to imbalance

**Where a proper scoring rule and a strong learner are in use, resampling SHOULD NOT be applied
merely because the classes are imbalanced, and where it is applied its necessity SHOULD be
recorded.** Imbalance is a property of the problem before it is a defect of the data, and the
reflex to correct it is stronger than the evidence for correcting it.

The evidence is specific about where it applies. Van den Goorbergh and colleagues (2022) found that
random undersampling, random oversampling and SMOTE all produced worse Brier scores and marked
calibration distortion in clinical risk models, while leaving rank-based performance essentially
unchanged — the correction moved the probabilities and bought nothing. Elor and Averbuch-Elor (2022)
found across seventy-three datasets that with gradient-boosted forests and a proper metric,
balancing is not beneficial; it helped mainly with weaker learners, or where unusually good
oversampler hyperparameters were known in advance.

**The boundary matters as much as the finding.** This is a recommendation and not a prohibition
because the evidence does not reach everywhere. Balancing does help weak learners. Loss reweighting
in deep learning is routine and uncontroversial. Extreme rare-event regimes, where a minority class
may not appear in a batch at all, are a different problem from a ten-percent base rate. A
prohibition would be wrong in named, common cases, and a standard that is wrong in named cases
teaches a reader to discount the ones it gets right.

Where resampling is applied under this recommendation, R4's disclosure obligation is what makes the
choice inspectable, and [Standard 13](13-calibration.md) is where its consequence for the output
scale is resolved.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | Per-partition class counts and proportions in the model card or evaluation document | Manual review | None |
| R2 | A recorded metric rationale referring to the measured base rate | Manual review; the rationale is the same artefact [Standard 12](12-metric-selection.md) requires | None |
| R3 | Resampling applied within a pipeline fitted per fold, and evaluation reported on the unresampled distribution | Manual review; the preprocessing-ordering detectors under [Standard 8](08-leakage.md) may incidentally observe a resampling call before a split | None |
| R4 | A disclosure of technique, ratio, and effect on output scale | Manual review | None |
| R5 | Segment base rates alongside segment performance | Manual review | None |

**Why nothing automated applies here.** The class distribution is not in the repository. It is a
property of data the auditor does not read, and every requirement here is conditioned on it: whether
accuracy is inadequate, whether the base rate was stated correctly, whether a resampling ratio was
disclosed accurately. A scanner could observe that a resampling library is imported, which
establishes nothing about where in the pipeline it is applied, and it could observe that a document
contains a number described as a base rate, which establishes nothing about whether that number is
true. Every rule in this standard reports `not-evaluated`, and each is satisfied only by an
attestation recording what a reviewer measured and where.

## Additions this standard makes beyond the source

- R1's requirement that base rates be measured *per partition* and reported as counts as well as
  proportions. The source requires that the imbalance be measured and stated; the partition
  breakdown and the count are this standard's, on the reasoning that eleven positives and eleven
  thousand positives are different evidence expressed identically as a percentage.
- The worked fraud-screening illustration, which is authored for this document. The figures are
  constructed to make the arithmetic checkable, not drawn from any real system.
- R5, extending the measurement obligation to segments. The source addresses imbalance at the
  dataset level only.
- The observation in R3 that synthetic oversampling defeats duplicate detection precisely because
  the generated points are not exact copies.
- The framing in R2 that a metric whose value is nearly determined by the base rate cannot report
  much about the model.

## Relationship to other standards

[Standard 12](12-metric-selection.md) is where the metric decision this standard constrains is
actually made and recorded; imbalance is one of its inputs, and its prohibition on treating accuracy
as sufficient for every problem is the enforcement mechanism for R2.
[Standard 13](13-calibration.md) inherits R4's consequence — a model trained on a rebalanced sample
has an output scale that is not a probability until something is done about it.
[Standard 8](08-leakage.md) and [Standard 10](10-cross-validation.md) supply the fold discipline
that R3 depends on. [Standard 25](25-model-limitations.md) is where segments too rare to evaluate
must be declared rather than silently reported.

## Implementation

**Not checked automatically.** No detector is bound to any rule in this standard, and none is
planned. The determining fact — how rare the rare class is — exists only in data the auditor does
not open, and every judgement here follows from it.

`standards scan` may report, descriptively and bound to no rule, that a resampling or
class-weighting library appears among the project's imports. That finding is `info` severity and is
context for a reviewer, not evidence of compliance or of violation: it distinguishes a project that
has thought about imbalance from one that has not mentioned it, and nothing more. Everything this
standard requires is satisfied by attestation, which is the honest position recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md) rather than a gap awaiting a better scanner.
