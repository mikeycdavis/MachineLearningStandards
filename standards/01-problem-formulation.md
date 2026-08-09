# Standard 1 — Problem Formulation

A model cannot be correct or incorrect until someone has written down what it is supposed to
predict, for whom, and what a wrong answer costs. Every later decision — the metric, the split, the
threshold, the baseline, what counts as an improvement — follows from those answers. A project that
skips this step does not avoid making the decisions; it makes them implicitly, in scattered places,
and can never afterwards explain why any of them are what they are.

Source: item 1 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every modelling effort before modelling begins, and applies again whenever the intended
use changes. A model repurposed for a different decision is a new problem wearing an old model's
weights: the target may still be predicted accurately while the costs, the population, and the
acceptable error profile have all changed underneath it.

Applicability is proposed by the `training-code` trigger. Exploratory analysis that will not
produce a deployed or reported model is out of scope, though the honest declaration of that is a
scope decision worth recording rather than assuming.

## Requirements

### R1 — The prediction target is defined precisely

**The record MUST state exactly what is being predicted, in terms that make a label unambiguous for
any given observation.** "Churn" is not a target. "Whether an account with no billable activity for
thirty consecutive days closes within the following sixty days, measured from the account's local
midnight" is one.

The precision matters because the definition determines the labels, and the labels determine what
the model learns. Two reasonable people given "churn" will construct different label sets from the
same data, and their models will not be comparable — nor will either be comparable with the
business's own understanding of the word.

### R2 — The unit of prediction and the population are stated

**The record MUST state what a single prediction is about and which population the model will be
asked to serve.** One row per customer, per customer-month, or per session are three different
problems with three different leakage risks and three different split strategies.

The population is the half more often omitted. A model trained on existing customers and deployed
on applicants is being asked a question it has never seen, and the mismatch is invisible in every
evaluation metric because the evaluation data shares the training population.

### R3 — The decision the output feeds is named

**The record MUST name the decision or action the prediction informs, and who or what makes it.** A
score displayed to an analyst, a score that triggers an automated hold, and a score that ranks a
queue impose different requirements on the same number — the first tolerates miscalibration, the
second does not, and the third cares only about ordering.

This is the requirement that makes [Standard 13](13-calibration.md) answerable. Whether a score
must be a calibrated probability is not a property of the model; it is a property of what the
output is used for, and it cannot be determined until that is written down.

### R4 — The cost asymmetry between error types is recorded

**The record MUST state the relative cost of the different ways the model can be wrong**, at least
qualitatively. A false positive that wastes a reviewer's minute and a false negative that misses a
safety event are not interchangeable, and a system that treats them as interchangeable has made a
decision about their relative cost — the decision that they are equal — without anyone choosing it.

Qualitative is sufficient where quantitative is unavailable: "a missed case is far worse than a
false alarm, roughly by an order of magnitude" constrains the metric and the threshold usefully,
and is honest about its own precision. What is not sufficient is silence, because silence is
read downstream as symmetry.

### R5 — Formulation precedes modelling and is revisited when use changes

**The record MUST exist before the first model is trained, and MUST be revisited when the target,
population, decision, or cost structure changes.** Written afterwards, it becomes a description of
what was built rather than a specification of what was needed, and it will rationalise every choice
it was supposed to govern.

This is the requirement most often violated without anyone noticing, because a formulation written
after the fact is indistinguishable in the finished repository from one written before. It is
therefore attestation territory, and the attestation should say when the record was written
relative to the work.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1–R4 | A problem-definition document, or a model card whose intended-use and target sections carry this content | Manual review | None |
| R5 | Attestation stating when the formulation was written relative to the first model, with commit history as supporting evidence | Manual review | None |

**Why nothing automated applies here.** A scanner can find a document with a heading. It cannot
determine whether a target definition is precise enough to label an observation unambiguously,
whether the stated population matches the deployment population, or whether the cost asymmetry
described is the real one. A check that confirmed the heading exists and reported the rule as
passing would establish that someone wrote something under the right title — and would be read as
establishing that the problem was well formulated. That gap is the definition of false confidence,
and the check is deliberately not built. See
[ADR 0004](../artifacts/adr/0004-honest-automation.md).

The one nearby fact that *is* mechanically visible — whether a model card exists at all — belongs
to [Standard 25](25-model-limitations.md) and is reported there. This standard does not borrow it,
because a model card's existence says nothing about whether the problem behind it was formulated.

## Additions this standard makes beyond the source

- The worked contrast in R1 between "churn" and a fully specified target definition. The source
  requires that the prediction target be recorded; the illustration of what precision means is this
  standard's.
- R2's separation of the unit of prediction from the population, and the observation that a
  population mismatch is invisible in every evaluation metric because evaluation shares the
  training population. The source names the unit of prediction; the population argument is added.
- R3's argument that calibration requirements derive from the decision rather than the model.
- R4's acceptance of qualitative cost statements, and the position that silence about asymmetry is
  read downstream as a claim of symmetry. The source requires cost asymmetry to be recorded; both
  refinements are this standard's.
- R5 in full. The source states that formulation should happen before modelling begins; the
  revisit obligation, and the observation that a retrospective formulation is indistinguishable in
  a finished repository, are added here.

## Relationship to other standards

This standard is upstream of most of the others, and several are unanswerable without it.
[Standard 12](12-metric-selection.md) requires that a metric follow from the problem and the cost
of each error type — both defined here, in R1 and R4. [Standard 2](02-baseline-models.md) requires
a baseline appropriate to the problem, which presupposes the problem is stated.
[Standard 13](13-calibration.md) depends on R3 for whether calibration is required at all, and
[Standard 5](05-train-validation-test-separation.md) and
[Standard 6](06-temporal-splitting.md) both depend on R2, since the unit of prediction determines
what a leak-free split looks like. [Standard 25](25-model-limitations.md) closes the loop: the
population stated in R2 is the population against which "where does this model not work" is
answered.

## Implementation

**Not checked automatically.** No detector is bound to this standard. Its requirements describe the
content and the timing of a document, and neither is reachable by static analysis — the content
because precision and correctness of a definition are semantic, the timing because a repository
shows what exists, not when it was decided.

The requirements report `not-evaluated` rather than `insufficient-evidence`: no mechanism can
establish them from repository text, so the remediation is human judgement recorded as an
attestation, not the production of more files. An attestation here is most useful when it pins
`reviewedAgainst` to the formulation document itself, so that a material edit to the problem
definition retires the approval automatically — which is exactly the event R5 says should trigger a
revisit.
