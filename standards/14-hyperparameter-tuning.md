# Standard 14 — Hyperparameter Tuning

A tuned model is the output of a search, and a search adapts to whatever data scores it. When that
data is the final test set, the number reported at the end is not an estimate of future performance;
it is a measurement of how well the search fitted the last dataset anyone had left. This standard
keeps the search and the estimate apart, and makes the search itself a recorded object rather than a
sequence of runs whose survivor is the only thing anybody remembers.

Source: item 14 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every model choice made in light of measured results: learning rate, regularisation
strength, tree depth, architecture, optimiser, feature set, early-stopping point, and the decision
threshold applied to a score. Scope follows the activity, not the tool — a `GridSearchCV` object and
a person editing a constant and re-running are the same activity, and only one of them leaves a
record by default.

Applicability is proposed by the `training-code` and `ml-footprint` triggers. A repository that
loads a published configuration and never varies it is genuinely outside this standard, and
declaring the rule not-applicable with that reason is the correct outcome. A repository whose
training script has been run more than once with different numbers in it is not.

## Requirements

### R1 — Selection scores against validation data, never against the final test set

**The search MUST be conducted against a validation set or an inner cross-validation loop, and the
final test set MUST NOT appear anywhere in the selection path.** The test set is scored once, after
the configuration is fixed, and its result is reported rather than acted upon.

Where data is scarce enough that a held-out validation split is wasteful, nested cross-validation
supplies the same separation: an inner loop selects, an outer loop measures a selection procedure
rather than a selected model.

```python
inner = KFold(n_splits=5, shuffle=True, random_state=0)
outer = KFold(n_splits=5, shuffle=True, random_state=1)

search = GridSearchCV(estimator=model, param_grid=SPACE, cv=inner, scoring="average_precision")

# The outer loop estimates how well the whole search generalises.
generalisation = cross_val_score(search, X_trainval, y_trainval, cv=outer,
                                 scoring="average_precision")

# The configuration is fixed here, using only train+validation data.
final = search.fit(X_trainval, y_trainval).best_estimator_

# The test set is read once, and nothing downstream of this line changes the model.
reported = average_precision_score(y_test, final.predict_proba(X_test)[:, 1])
```

### R2 — The search is recorded in enough detail to be reconstructed

**The search space, the search procedure, the number of trials, and the selection criterion MUST be
recorded alongside the resulting configuration**, as item 14 of the source requires. A recorded
best configuration without its search is a number with no provenance: a reader cannot tell whether
it was chosen from four candidates or forty thousand, and those two facts imply very different
amounts of optimism in the score that follows.

The record also states which data version the search ran against, which is what makes it comparable
to a later search. [Standard 4](04-dataset-versioning.md) supplies that identifier and
[Standard 15](15-reproducibility.md) is where the record as a whole belongs.

### R3 — Manual iteration is a search and is counted as one

**Choices made by editing values and re-running SHOULD be recorded with the same discipline as an
automated sweep.** The statistical effect of trying twenty configurations by hand is the same as
trying twenty in a loop; the difference is that the loop writes them down.

The practical test for whether an activity is in scope: did a measured result influence the next
value tried? If it did, the sequence is a search, and its length belongs in the record even when no
search library was imported.

### R4 — A reported test score names the selection that preceded it

**Any reported test-set result MUST be accompanied by a statement of what selection occurred before
it and against what data.** This is what allows a reader to judge the score rather than merely
receive it. A score reported with "selected by inner five-fold cross-validation over a grid of
sixty configurations, test set scored once" is an estimate. The same score reported alone is a
claim whose optimism cannot be bounded.

## Prohibitions

### P1 — The final test set is not a tuning signal

Reproduced verbatim from the source:

> tune hyperparameters against the final test set

The prohibited act is using the test set's response to choose anything: a hyperparameter, a
threshold, a feature set, a stopping point, or which of several trained models to report. It does
not matter whether the model was refitted afterwards — the information moved when the choice was
made.

The direct form is easy to recognise and is what the non-compliant example below shows. The
indirect forms are more common: selecting the best of several runs by test score, tuning a
threshold on test predictions, or restoring an earlier configuration because the test number was
better. Each is the same transfer wearing different clothes.

```python
# Selection scored on the test set: the reported number is now a training metric
# for the search, and no honest estimate of production performance remains.
search = GridSearchCV(estimator=model, param_grid=SPACE, scoring="average_precision")
search.fit(X_test, y_test)
reported = search.best_score_
```

This prohibition shares one conceptual boundary with
[Standard 5](05-train-validation-test-separation.md), which hosts the source's other statement of
it — repeatedly inspecting the test set until model choices fit it. The two source statements
describe one prohibition from two directions: this
standard's is the deliberate optimisation loop, Standard 5's is the accumulation of informal looks.
Both spend the same resource, and both are carried by the rule id `split.no-test-set-tuning`.

This prohibition is **non-exemptible**. A spent test set cannot be unspent, so no waiver can restore
the evidence the tuning destroyed.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A split or CV construction in which the search's `cv` and scoring data are drawn from train/validation only | Detector A2 flags a `.fit(`-family call whose arguments name conventionally test-named identifiers | Partial — a positive finding is real; the absence of one establishes nothing |
| R2 | A recorded search space, procedure, trial count, and selection criterion in the experiment record | Manual review, supported by the experiment-configuration check in [Standard 15](15-reproducibility.md) | None for the search's completeness |
| R3 | An experiment log or tracking record covering manually initiated runs | Manual review only | None |
| R4 | A results document stating the selection procedure beside the test score | Manual review only | None |
| P1 | Detector A2 reporting no finding, plus attestation that no indirect selection on test results occurred | Code analysis, then attestation | Partial — see below |

**What the automated check cannot establish.** Detector A2 fires an error when a fitting call's
arguments contain identifiers matching the conventional test-set names — `X_test`, `y_test`,
`test_df`. When it fires, it has found something true and serious. When it does not fire, it has
found nothing at all: the detector reads a naming convention, and a test set held in a variable
called `holdout2`, loaded inside a helper, or passed positionally through a wrapper is invisible to
it. Nor can any static reading see the indirect forms described in P1, where the code is
unremarkable and the violation is in which run a human decided to report.
`split.no-test-set-tuning` therefore
reaches `passed` only through attestation, and A2's contribution is to catch the version of the
mistake that is written down.

## Additions this standard makes beyond the source

- R3's treatment of manual iteration as a search. The source addresses tuning as a procedure with a
  recordable space and trial count; extending the same obligation to hand-edited re-runs is this
  standard's reasoning, on the grounds that the statistical effect does not depend on whether a
  library was involved.
- R4's requirement that a reported test score carry its selection history. The source states that a
  test score is only honest if the test set played no part in reaching the configuration; making
  the disclosure explicit and mandatory is this standard's addition.
- The enumeration of indirect selection paths in P1 — best-of-N by test score, threshold tuning on
  test predictions, reverting a configuration because the test number was better. The source names
  the act; the list of its disguises is authored here.
- The observation in R2 that a best configuration without its trial count cannot be interpreted,
  because the optimism in a search's winner grows with the number of candidates it beat.

## Relationship to other standards

[Standard 5](05-train-validation-test-separation.md) establishes the three roles this standard
depends on and hosts the other half of the shared prohibition. [Standard 10](10-cross-validation.md)
governs the inner loop R1 relies on, including the fold structure that makes nested cross-validation
valid for grouped and temporal data. [Standard 12](12-metric-selection.md) supplies the selection
criterion R2 requires be recorded, and requires it be fixed before results are visible — a criterion
chosen after the search is a second, undisclosed search. [Standard 15](15-reproducibility.md) is
where the search record lives, and [Standard 20](20-uncertainty.md) is what prevents a search from
declaring a winner that lies inside the noise of its own evaluation.

## Implementation

**Partially checked.** Detector A2 examines fitting calls for conventionally test-named arguments
and reports an error when it finds one. That finding is worth acting on immediately, and it is the
only part of this standard a static reading can reach.

Everything else here — whether the recorded search is complete, whether manual runs were counted,
whether the reported score was the first one read from the test set or the best one — depends on
facts that exist in a person's sequence of actions rather than in the repository's text. Those rules
report `insufficient-evidence` where the missing artifact is a record someone can still write, and
`not-evaluated` where no repository content could settle the question. The distinction is the one
drawn in [ADR 0004](../artifacts/adr/0004-honest-automation.md): a check is built when it
establishes a fact, and a green result on a question the checker cannot answer is worse than no
check.
