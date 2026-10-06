# Standard 5 — Train, Validation, and Test Separation

A test score is a claim about data the modelling process has never adapted to, and the claim is
only worth as much as the separation that produced it. The failure this standard prevents is the
score that is quietly the maximum of many: a team evaluates, adjusts, evaluates again, and reports
the last number as though it were the first. Nothing in the delivered artifact records how many
looks it took, so a reader who was not present cannot correct the estimate, discount it, or even
bound how optimistic it is.

Source: item 5 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every project that reports a performance figure intended to describe behaviour on data
the process has not seen — which includes any figure quoted to justify a deployment, a comparison,
or a claim of improvement. It applies to a single held-out split and to the outer split that
surrounds a cross-validation procedure alike; [Standard 10](10-cross-validation.md) governs what
happens inside that procedure.

Applicability is proposed by the `training-code` and `ml-footprint` triggers, except for R6, which
carries no trigger: it binds only where a performance figure is reported, which no scan can see, and
a project that reports none declares it not-applicable. A project that fits a
descriptive model over a fixed population and makes no claim about unseen data holds no test set in
this sense, and declaring the rule not-applicable with that reason is the correct outcome.

## Requirements

### R1 — Three roles are declared, and no partition holds two of them

**A project MUST state which data serves each role — fitting parameters, guiding choices, and
estimating generalization — and MUST NOT use one partition for two of them.** The three roles are
distinct obligations rather than a convention about proportions: the sizes are a judgement, the
separation is not.

The common collapse is a validation set that is also the test set, arrived at by having only two
partitions and calling the second one whichever name the sentence needs. A model selected on a
partition and reported on that same partition has no generalization estimate at all, only a
training score wearing the vocabulary of one.

### R2 — The test set is separated first and read last

**The test set MUST be separated before modelling begins and MUST NOT be read, summarised,
plotted, or error-analysed until the model configuration is final.** Its entire value is that the
process has not adapted to it, and adaptation does not require a formal tuning loop — a human who
has seen the test set's error distribution carries that information into the next decision they
make.

Splitting after preprocessing, after feature selection, or after an exploratory pass over the whole
dataset means the test set was already visible when those choices were made. The order of
operations is the requirement.

### R3 — Every data-driven choice is made against validation data

**Every decision that adapts the model to data — feature set, architecture, hyperparameters,
threshold, stopping point, or the choice between candidate models — MUST be made against
validation data or an inner cross-validation loop, never against the test set.**
[Standard 14](14-hyperparameter-tuning.md) governs the search itself; this requirement governs
which partition the search is allowed to consult.

The distinction is visible in code. The following selects a model using the test set, and reports
the winning test score as an expectation about production:

```python
best = None
for depth in (3, 5, 8, 12):
    model = GradientBoostingClassifier(max_depth=depth).fit(X_train, y_train)
    score = model.score(X_test, y_test)
    if best is None or score > best[0]:
        best = (score, model)
print("expected production accuracy:", best[0])
```

The same search, with the choice made on validation data and the test set consulted once after the
configuration is fixed:

```python
best = None
for depth in (3, 5, 8, 12):
    model = GradientBoostingClassifier(max_depth=depth).fit(X_train, y_train)
    score = model.score(X_val, y_val)
    if best is None or score > best[0]:
        best = (score, model)
final_model = best[1]
test_score = final_model.score(X_test, y_test)
```

Neither fragment is detectable by the check described below, because neither calls `.fit(` on
test-named data. The difference between them is a difference in which score drove a decision, and
that is not a syntactic property.

### R4 — Test-set use is counted and recorded

**The number of evaluations performed against the test set, and the reason for each, SHOULD be
recorded alongside any reported score.** The estimate degrades with each use and the degradation is
invisible in the number itself, so the count is the only signal a later reader has about how much
to discount.

A recorded count is weak evidence and is deliberately preferred to none: an absent count is
indistinguishable from a count of one and from a count of forty. Where the count is greater than
one, the reason for each additional evaluation belongs beside it, because a re-evaluation after a
data-loading bug was fixed and a re-evaluation after a disappointing result are different events.

### R5 — Separation is over the unit of prediction, not over rows

**Where observations are duplicated or grouped — repeated measurements of one subject, several
sessions from one user, near-identical records — the separation MUST place every member of a group
on one side of the split.** A row-wise split of grouped data produces partitions that are formally
distinct and informationally overlapping, and the resulting estimate describes memorisation.
[Standard 10](10-cross-validation.md) applies the same reasoning to folds and
[Standard 8](08-leakage.md) treats duplicates spanning a split as the leakage path they are.

### R6 — External validation is stated rather than implied

**Where performance is reported, the record MUST state whether it was measured on data collected
independently of the training data — a different site, population, or period, and not a partition of
the same collection — and MUST NOT present internal-holdout performance as if it established
performance on a population the model was not evaluated on.**

The distinction is about where the data came from, not about how the split was drawn. A holdout is a
partition of one collection: the same instruments, the same period, the same selection into the
dataset, divided. That is what makes it a sound estimate of performance on that collection, and
protecting the soundness of that estimate is what R1–R5 are for. What it cannot do on its own is
carry to a population that was never in the collection, because nothing about the split varied the
thing that would differ.

**Internal evidence is still evidence.** This requirement does not say a holdout estimate is
uninformative elsewhere. It usually is informative, and it is the reasonable starting point for an
expectation. It says the estimate does not by itself establish the further claim, and that the
difference must be visible to whoever reads the number. Recht et al. (2019) rebuilt an ImageNet test
set by the original protocol and found accuracy fell substantially across every model examined, with
task, protocol and population held as close as anyone could hold them.

Two answers satisfy this. "Externally validated on <population>, <period>, collected independently
of the development data" is one. "Not externally validated; the reported figures describe held-out
data from the development collection" is the other, and it is entirely respectable — the same move
[Standard 15](15-reproducibility.md) R4 makes about reproduction and
[Standard 13](13-calibration.md) R4 makes about calibration. What is not available is silence, which
a reader fills in with the stronger claim.

A split drawn on an arbitrary column and described as an external population satisfies neither
answer. It reports transportability with nothing behind it, which is worse than reporting none.

## Prohibitions

### P1 — The test set is spent by looking at it

Reproduced verbatim from the source:

> repeatedly inspect the test set until model choices fit it

The prohibited act is a process, not a line of code. No single evaluation violates it; a sequence
of them, each informing the next choice, converts the test set into a second validation set while
leaving every artifact looking the same. The model has been fitted to the test set by a slow method
that no configuration file records.

This prohibition is **non-exemptible**. A spent test set cannot be unspent, and no waiver restores
the evidence that repeated inspection destroyed — an exception would authorise reporting a figure
whose inflation is known to the reporter and unavailable to the reader.

The companion source statement about tuning hyperparameters against the final test set is the same
rule, `split.no-test-set-tuning`, and is hosted by
[Standard 14](14-hyperparameter-tuning.md). The two statements describe the deliberate search and
the informal drift toward the same outcome.

### P2 — Training metrics are not generalization claims

Reproduced verbatim from the source:

> report training performance as expected production performance

A training score measures fit to data the model has already absorbed. Presented as a production
expectation, it is not an optimistic estimate but a different quantity entirely, and the gap
between the two is largest exactly where it matters most — for the flexible models whose training
error can be driven arbitrarily low.

The rule is about labelling, not about computing. Training scores are useful diagnostics and should
be reported; what this forbids is reporting one without the partition it came from, or letting a
figure travel into a slide, a README, or a model card where the qualifier has fallen away.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1, R2 | A split record naming each partition, its role, its size, and the point in the timeline at which it was created | Manual review | None — reports `not-evaluated`; remediation is an attestation |
| R3 | Tuning and selection records showing a validation partition as the selection criterion, per [Standard 14](14-hyperparameter-tuning.md) | Manual review | None — `not-evaluated` |
| R4 | A recorded count of test-set evaluations with the date and reason for each | Manual review | None — `not-evaluated` |
| R5 | A grouping key named in the split record, with the split performed over it | Manual review | None — `not-evaluated` |
| R6 | A statement beside the reported figures naming the collection they were measured on, and whether any evaluation population was collected independently of the development data | Manual review | None — `not-evaluated` |
| P1 | Attestation that the test set was read once, supported by the R4 count | Detector A2: a `.fit(`-family call whose arguments contain conventionally test-named identifiers (`X_test`, `y_test`, `test_df`) | Partial — an error when it fires; absence proves nothing, so a clean run reports `insufficient-evidence` rather than passing |
| P2 | Every reported figure carrying the partition it was computed on | Manual review | None — `not-evaluated` |

**What the automated check cannot establish.** Detector A2 recognises a naming convention and
nothing more. It fires on `model.fit(X_test, y_test)` and is silent on the same call whose data is
named `holdout`, `df2`, or `final_eval` — so a run with no finding establishes only that the
convention was not used in that form. It is also blind to the behaviour P1 actually describes:
repeated inspection leaves no `.fit(` call at all, because the fitting happens in the analyst's
choices between runs. That half of the prohibition is not code and is satisfied by attestation
only. The check's contribution is to catch the blunt case, and its silence is not a clean bill.

## Additions this standard makes beyond the source

- R4's requirement to record the *count* of test-set evaluations and the reason for each. The
  source states that value is consumed by use; it does not ask for a tally. The tally is this
  standard's addition, on the reasoning that an unrecorded count cannot be distinguished from a
  count of one, which is how a spent test set passes for a fresh one.
- R6 in full. The source provides an internal holdout and item 6 requires a representative
  evaluation period; neither is a transportability claim, and neither asks the project to say which
  it has. The obligation to state validation provenance, and the refusal to turn that into a
  requirement for a second site, are this standard's.
- R2's extension of "use" to reading, summarising, plotting, and error analysis. The source speaks
  of decisions made in light of the test set; treating inspection itself as consumption is this
  standard's interpretation, made explicit because the informal look is the common route to P1.
- R5, the requirement that separation be over the unit of prediction rather than the row. The
  source item does not mention grouping; the reasoning is drawn from item 10 and applied here
  because a grouped row-wise split defeats the separation this standard exists to establish.
- The reading of P2 as a labelling obligation rather than a prohibition on computing training
  metrics, and the observation that the qualifier is usually lost in transit rather than omitted at
  source.
- The worked comparison in R3, which is authored illustration rather than source text, and the
  accompanying observation that neither fragment is detectable by the automated check.

## Relationship to other standards

[Standard 14](14-hyperparameter-tuning.md) hosts the other source statement of
`split.no-test-set-tuning` and specifies the search this standard confines to validation data.
[Standard 6](06-temporal-splitting.md) determines how the partitions are drawn when observations
are ordered in time; a correct three-way separation drawn randomly over temporal data satisfies
this standard and violates that one. [Standard 10](10-cross-validation.md) replaces the single
validation partition with folds and inherits every requirement here.
[Standard 8](08-leakage.md) governs what may cross the boundary once it is drawn, and
[Standard 19](19-model-comparison.md) depends on this separation being identical across everything
compared.

## Implementation

**Not checked automatically.** Detector A2 exists and is bound to `split.no-test-set-tuning`, but
it establishes one narrow fact — that a fitting call names an identifier following the test-set
convention — and everything else in this standard is outside what repository text can settle. No
mechanism reads how many times a test set was evaluated, which partition a reported number came
from, or whether the split preceded the exploration.

R1 through R5 and P2 therefore report `not-evaluated`: no mechanism can establish them from
repository text, and the remediation is human judgement recorded as an attestation. P1 reports
`insufficient-evidence` when detector A2 finds nothing, because a mechanism exists and its silence
is not evidence. The distinction matters to whoever picks the work up — one asks for a reviewer,
the other asks for evidence that could still be produced. Neither is a pass, which is the position
[ADR 0004](../artifacts/adr/0004-honest-automation.md) requires.
