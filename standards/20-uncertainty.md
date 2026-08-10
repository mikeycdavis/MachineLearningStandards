# Standard 20 — Uncertainty

A reported score is one draw from a process that would have produced a different number had the
split fallen differently or the seed been another integer. A single figure hides that entirely, and
the comparison built on it inherits the concealment: two models differing by half a point may be
indistinguishable, and nothing in the two numbers says so. This standard prevents a project from
reading noise as progress, and from being unable to tell the difference because it never measured
how much its own evaluation moves.

Source: item 20 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every reported evaluation figure that will be compared to another — against a baseline,
a competitor model, an ablation arm, a previous version, or a target. It applies to the comparison
rather than to the number in isolation: a single descriptive figure with no comparative use carries
a weaker obligation, though the reader will usually supply the comparison whether or not the project
intended one.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. It is not waived by
the evaluation being expensive; where variance genuinely cannot be estimated, R4 governs, and the
result is a stated limitation rather than an exemption.

## Requirements

### R1 — Comparisons carry an indication of uncertainty

The source states the obligation directly.

Reproduced verbatim from the source:

> Require uncertainty around model comparisons where appropriate.

**Every comparison that informs a decision MUST be accompanied by an indication of uncertainty
sufficient to distinguish a real difference from noise.** Any of several forms satisfies this: a
confidence interval on each arm's metric, the variance or standard deviation across cross-validation
folds, the spread across random seeds, a bootstrap distribution over the test set, or a paired test
on per-example results.

The qualifier *where appropriate* is about the form, not about whether. A deterministic evaluation
on a fixed exhaustive population has no sampling uncertainty and the appropriate indication is a
statement to that effect; almost every other case has uncertainty from at least one of the split,
the seed, and the finite test set, and the appropriate indication is a measurement of it.

### R2 — The method is stated and matched to the source of variation

**The uncertainty method MUST be recorded, and MUST address the source of variation that the
comparison is exposed to.** The forms in R1 measure different things and are not interchangeable.
Variance across seeds measures training instability and says nothing about how much the estimate
depends on which examples landed in the test set. A bootstrap over the test set measures the
opposite and says nothing about seed sensitivity. Fold variance conflates both and, on a small
dataset, is dominated by fold size.

There is a property here that is easy to miss and that no choice of test repairs: **an interval
computed from resamples whose training sets overlap understates the true variance, and the amount of
the understatement is not estimable in general.** Every fold of a k-fold shares most of its training
data with every other fold, so the fold results are positively correlated and treating them as
independent observations produces an interval narrower than the truth — Bengio and Grandvalet (2004)
show that no universal unbiased estimator of that variance exists. This is stated as a property
rather than as a list of prohibited procedures, because a project can apply a property to whatever
it actually did, and a list only catches the procedures on it.

Where two models are evaluated on the same examples, a paired analysis is markedly stronger than
comparing two independent intervals, because it removes the example-difficulty variation common to
both arms. Overlapping intervals on paired data routinely conceal a difference that a paired test
resolves cleanly, and reading non-overlap as the test is a common way to under-detect a real effect
while feeling rigorous.

### R3 — An unquantified difference is not described as an improvement

**Where uncertainty has not been quantified, a small difference MUST NOT be described as an
improvement**, in the model card, the comparison document, or any claim made outside the project.
The permitted description states the observed difference and the absence of an uncertainty estimate,
in that order and in the same sentence, so the qualification cannot be dropped in a summary.

"Small" is not defined numerically here and cannot be, since it depends on the metric, the test set
size, and the variability of the problem — which is the argument for measuring rather than
adjudicating. In the absence of any estimate, the honest default is to treat every difference as
potentially noise until something establishes otherwise.

This is the requirement that feeds [Standard 19](19-model-comparison.md)'s classification: its
statistical category is exactly the claim that a difference has been shown unlikely to be noise, and
without R1's measurement that category cannot be entered and must not be implied.

### R4 — Variance across seeds and folds is reported as a result in its own right

**Where results vary materially across seeds, folds, or resamplings, that variance MUST be reported
alongside the central estimate rather than summarised away.** A model whose test metric ranges over
several points across seeds is a different proposition from one that reproduces to within a fraction
of a point, and the mean alone presents them identically.

The variance is information about the model, not noise in the report. High seed sensitivity predicts
that the deployed instance may not be the instance evaluated, which is a production risk, and it
belongs in [Standard 25](25-model-limitations.md) as well as here. Where the number of runs is too
small to characterise the spread — and two is too small — the count is stated so the reader can
discount accordingly.

### R5 — The uncertainty estimate does not inherit a broken evaluation

**An uncertainty estimate MUST be computed under the same discipline as the point estimate it
qualifies.** Bootstrap resampling that crosses group boundaries, fold variance from folds that share
entities, or seed variance measured while the split is held fixed all produce intervals that are
narrower than the truth and therefore more confident than the truth.

A tight interval around a leaked result is not reassurance; it is the leak measured precisely. This
requirement exists because an uncertainty figure carries an air of rigour that can survive problems
in the evaluation it summarises, and a reader who sees an interval is less likely to ask what it
was computed over.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | Intervals, fold or seed variance, a bootstrap distribution, or a paired test reported beside each compared figure | Manual review | None |
| R2 | The method named, with the source of variation it addresses | Manual review | None |
| R3 | Comparison language that states the absence of an estimate wherever one is absent | Manual review | None |
| R4 | Per-seed or per-fold results, or their spread, with the number of runs | Manual review; the seed records required by [Standard 16](16-random-seeds.md) are supporting evidence | None |
| R5 | The resampling or fold construction described, showing it respects the same grouping and temporal structure as the split | Manual review, alongside [Standard 10](10-cross-validation.md) | None |

**Why nothing automated applies here.** The presence of a `±` in a document establishes that a
symbol was typed. Whether the interval was computed, what it was computed over, whether the
resampling respected the data's grouping, and whether a difference was described as an improvement
without one are all questions about the relationship between a document and runs the auditor never
saw. A detector could report that a statistics library appears among the imports, which is
descriptive context at `info` severity and bound to no rule. Every rule in this standard reports
`not-evaluated`, meaning no mechanism can establish it from repository text — the remediation is
human judgement recorded as an attestation, not a search for evidence that exists somewhere.

## Additions this standard makes beyond the source

- R2's insistence that the method match the source of variation, and the specific observation that
  seed variance, test-set bootstrap, and fold variance measure different things and are not
  interchangeable. The source requires an indication of uncertainty and names three forms without
  distinguishing what each addresses.
- The preference for paired analysis over comparing independent intervals on shared examples, and
  the note that reading interval non-overlap as a test under-detects real effects. This standard's
  addition.
- R3's prescription of the permitted wording — observed difference and absent estimate in the same
  sentence — rather than only prohibiting the word "improvement". The source states the prohibition
  on describing a small unquantified difference as an improvement; the constructive form is this
  standard's.
- R5 in full. The source does not address the case of a correctly computed interval around an
  incorrectly computed point estimate; that a tight interval around a leaked result reads as
  reassurance is this standard's reasoning.
- R4's requirement to state the number of runs, and the position that two runs is too small to
  characterise a spread.
- The reading of *where appropriate* as governing the form of the indication rather than whether one
  is required.

## Relationship to other standards

[Standard 19](19-model-comparison.md) is where this standard's output is consumed: its evaluation
philosophy requires every claimed improvement to be classified as statistical, practically
meaningful, or production-relevant, and the first of those categories is definitionally a claim
about uncertainty that only R1's measurement can support. Its prohibition on declaring a more
complex model better on a slightly higher score is likewise unenforceable without a measure of what
"slightly" means relative to the noise. [Standard 18](18-ablation.md) uses R1's estimate as the
threshold for deciding whether a component earns its place, and [Standard 2](02-baseline-models.md)
needs it to know whether a model has actually beaten its baseline.
[Standard 16](16-random-seeds.md) produces the multi-seed evidence R4 reports and states the
converse obligation from the reproducibility side.
[Standard 10](10-cross-validation.md) supplies the fold construction R5 depends on, and
[Standard 25](25-model-limitations.md) is where high seed sensitivity becomes a stated limitation.

## Implementation

**Not checked automatically.** No rule in this standard is bound to a detector. Uncertainty is a
property of an evaluation procedure and of runs the auditor does not perform, and every static proxy
available — an interval-shaped string in a table, a bootstrap function in the imports, a column
named `std` — reports a typographical or lexical fact rather than the property the standard is
about. Building one would produce a green result on a question it cannot answer, which is the
failure mode [ADR 0004](../artifacts/adr/0004-honest-automation.md) exists to prevent.

Nothing verifies that a reported interval was computed rather than estimated by eye, that its method
suits the comparison, that resampling respected grouping, that the reported spread came from more
than a couple of runs, or that a difference reported without an interval was described in the
guarded language R3 requires. All of it rests on attestation naming the reviewer, the runs examined,
and the date.
