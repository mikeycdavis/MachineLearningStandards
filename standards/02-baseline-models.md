# Standard 2 — Baseline Models

An improvement is a comparison, and a model reported without one is a number with nothing behind
it. This standard prevents two specific failures: the claim that a model is good made against
nothing at all, and the claim that it is better made against a strawman chosen because it was easy
to beat. Both produce the same artefact — a percentage that sounds like an achievement and cannot
be shown to be one — and the second is worse, because it looks like diligence.

Source: item 2 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to any project that will state how well a model performs, or that a model performs better
than something else. That includes the first model of a project, where the temptation to skip the
baseline is strongest because there is nothing yet to compare against — which is precisely the
condition the baseline exists to remedy.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. A repository that
holds only inference code for a model trained elsewhere may reasonably declare the rule
not-applicable, provided the reason names where the baseline comparison does live.

## Requirements

### R1 — A baseline exists before a comparison is claimed

**A baseline MUST be established before or alongside the first model, and MUST be recorded with
its definition, its data, and its result.** The record states what the baseline predicts, how it
was constructed, and what it scored — not merely that one existed.

Establishing it first matters for a reason that is easy to lose: a baseline chosen after the model's
score is known is chosen in the presence of the answer, and the choice will drift towards whatever
makes the difference look largest. A baseline defined in advance is a commitment; a baseline defined
afterwards is a framing.

### R2 — The baseline is the strongest simple thing that could reasonably work

**The baseline SHOULD be the strongest simple alternative that could plausibly be deployed instead
of the model, not the weakest thing that produces a number.** Candidates, in rough order of how
often they are the right one: the rule or heuristic currently in production, a constant predictor
of the majority class or the mean, the target's historical rate for the relevant segment, and a
linear or single-tree model on the obvious features.

The current production behaviour deserves particular emphasis. If a project is replacing something,
that something is the baseline that matters, because beating a constant predictor while losing to
the rule already deployed is not an improvement to anyone outside the project.

A baseline is a strawman when it was selected for its weakness. The test is counterfactual: had the
baseline scored higher than the model, would the team have accepted that result as informative? If
not, the baseline was scenery.

### R3 — The baseline is evaluated identically to what it is compared against

**The baseline MUST be evaluated on the same data, the same split, the same metric, and the same
preprocessing discipline as every model it is compared to.** A baseline scored on a different
period, a different sample, or a different metric is not a baseline; it is a second unrelated
result placed next to the first.

This is the same identity condition [Standard 19](19-model-comparison.md) imposes on model-to-model
comparison, applied to the model-to-baseline case. It is stated in both places deliberately, because
teams that maintain the discipline between two candidate models routinely relax it for the baseline,
whose evaluation is treated as a formality.

### R4 — The baseline is reported wherever the model's performance is reported

**The baseline's score MUST appear alongside the model's score in the model card, the evaluation
report, and any external claim about performance.** A baseline that exists in a notebook and not in
the document a reader sees does not prevent the failure this standard is about, because the reader
is still given a number with nothing behind it.

Where the model does not beat the baseline, that is the result, and it is reported as such. A
baseline is not a hurdle to be cleared before publication; it is the context that makes the model's
number mean something, including when the meaning is unwelcome.

## Prohibitions

### P1 — No improvement claims without a baseline

Reproduced verbatim from the source:

> claim improvement without an appropriate baseline

The prohibition has two halves and both bind. The absence of any baseline is the obvious violation.
The subtler one is the word *appropriate*: a comparison against a baseline that nobody would have
deployed, or that was evaluated on different data, satisfies the letter of R1 while leaving the
claim exactly as unsupported as it was.

"Improvement" here covers more than a stated percentage gain. A model card that reports a single
figure in a context where the reader will infer it represents progress is making the claim, whether
or not the word appears. The remedy is not to soften the language but to supply the comparison.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A `## Baseline` section, or a baseline row in the results table, in the model card or evaluation document | `evaluation.baseline-exists` — detector A10 looks for the heading or the table row | Partial — establishes that a baseline is documented, never that it is appropriate |
| R2 | A written justification of why this baseline is the strongest simple alternative | Manual review | None |
| R3 | The evaluation record showing baseline and model on the same dataset version, split, and metric | Manual review, supported by the dataset identifiers required by [Standard 4](04-dataset-versioning.md) | None |
| R4 | The baseline's score present in every document that states the model's performance | Manual review | None |
| P1 | Attestation that every performance claim made outside the repository carries its baseline | Manual review only | None |

**What the automated check cannot establish.** Detector A10 finds a heading named Baseline or a row
labelled as one. A heading named Baseline is not an appropriate baseline. Whether the comparator was
the strongest simple alternative, whether it was chosen before the model's score was known, and
whether it was evaluated on the same data are all judgements about intent and about facts that live
outside the text — appropriateness is a human question, and the detector's assurance is `partial`
for exactly that reason. Its contribution is narrow and real: it makes the wholly absent baseline
visible, which is the most common form of this failure.

## Additions this standard makes beyond the source

- The counterfactual test for a strawman in R2 — would the team have accepted the result had the
  baseline won? The source requires a baseline that is not a strawman; the operational test for
  distinguishing one is this standard's.
- R4, requiring the baseline to travel into the reporting document rather than merely to exist. The
  source requires that a baseline be established; that it must be visible where the claim is read is
  this standard's inference from the prohibition it enforces.
- The emphasis in R2 on the current production rule as the baseline that matters most. The source
  lists it among several candidates without ranking them.
- The reading of "improvement" in P1 as covering implied claims, not only stated percentage gains.
- The observation that a baseline defined after the model's score is known is a framing rather than
  a commitment.

## Relationship to other standards

[Standard 19](19-model-comparison.md) governs comparison between models and hosts the evaluation
philosophy that classifies any claimed improvement as statistical, practically meaningful, or
production-relevant — a baseline comparison is subject to that classification exactly as a
model-to-model comparison is, and beating a baseline by an amount within the noise of the evaluation
is not an improvement. [Standard 20](20-uncertainty.md) supplies the uncertainty that makes the
distinction decidable. [Standard 1](01-problem-formulation.md) determines what a reasonable baseline
even is, because the decision the output feeds is what identifies the alternative worth beating, and
[Standard 12](12-metric-selection.md) fixes the metric both sides are scored on.

## Implementation

**Partially checked.** `standards scan` reports whether a model-card or evaluation document contains
a `## Baseline` heading or a baseline row in a results table, and `evaluation.baseline-exists`
carries assurance `partial` with a note stating what the presence of that heading does not
establish.

Nothing verifies that the baseline is appropriate, that it was fixed before the model's result was
seen, that it was evaluated on the same split, or that any external claim of improvement was
accompanied by it. Those rest on attestation. The boundary is deliberate and recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md): a detector that judged appropriateness would
be inferring a deployment context and a cost of error that the repository does not contain, and a
green result on that question would be worth less than no result at all.
