# Standard 10 — Cross-Validation

Cross-validation is trusted because it averages, and averaging several wrong estimates produces a
stable wrong estimate with a reassuring standard deviation. The failure this standard prevents is a
fold scheme that ignores the structure of the data: a shuffle over records grouped by subject, so
that every fold evaluates on someone the model already met; a shuffle over time, so that every fold
trains on the future. The resulting figure is more stable than a single split and no more true, and
its stability is what makes it persuasive.

Source: item 10 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies wherever a performance estimate is produced by evaluating over multiple splits — k-fold,
repeated k-fold, leave-one-out, grouped or stratified variants, forward-chaining schemes, and the
inner loop of a nested procedure. It governs the construction of the folds and the discipline
applied inside them.

Applicability is proposed by the `training-code` and `ml-footprint` triggers. Cross-validation is
not itself required by this standard: a project with a single well-constructed temporal split is
compliant by having no folds to misconstruct, and declaring the rule not-applicable with that
reason is correct. Where cross-validation is used, the outer separation of
[Standard 5](05-train-validation-test-separation.md) still applies around it.

## Requirements

### R1 — The fold scheme is derived from the data's dependence structure and recorded

**A project MUST state what dependence structure its observations have — independent, grouped by
some entity, ordered in time, or several at once — and MUST justify the fold scheme against that
statement.** The scheme is a consequence of the data, not a default, and the default in every
common library is the one that is wrong for grouped and temporal data.

Where two structures coexist — sessions grouped by user *and* ordered in time — both constrain
the folds, and the scheme must satisfy both rather than the more convenient one. Recording the
structure is what makes that visible; an unstated structure is satisfied by whichever library call
was typed first.

### R2 — Grouped observations stay wholly within one fold

**Where observations share a grouping — subject, session, entity, document, device — every
member of a group MUST fall in the same fold.** A group split across folds means the model is
evaluated on records whose siblings it was trained on, and the estimate measures how well it
recognises the group rather than how well it generalises to a new one.

The grouping key is a modelling decision and must be named. It is frequently not a column that
exists: near-duplicate documents, repeated submissions, and devices sharing an owner form groups
that have to be constructed before they can be respected, and constructing them is in scope here
and recorded under [Standard 3](03-dataset-provenance.md).

### R3 — Time-ordered observations use forward-chaining folds

**Where observations are ordered in time and predictions concern the future, folds MUST be
forward-chaining: each fold trains only on data preceding its evaluation window.** A standard
k-fold over temporal data trains on the future in every fold but one, which is a violation of
[Standard 6](06-temporal-splitting.md) repeated k times and averaged.

The label-maturation gap required by [Standard 6](06-temporal-splitting.md) applies within each
fold, not only at the outer boundary, and the number of folds is bounded by how many usable
windows the history contains rather than by convention.

**One documented exception exists, and it is narrower than it will be read.** Bergmeir, Hyndman and
Koo (2018) show that for *purely autoregressive* models, standard k-fold cross-validation is valid
**provided the models under consideration have uncorrelated errors** — which holds, for instance,
where the models nest a more appropriate one. Both conditions are load-bearing. A model carrying any
exogenous feature is not purely autoregressive, and the error condition is a property to be
demonstrated on the data rather than assumed from the model class.

This requirement does not become conditional on that result. A project relying on it is claiming an
exception to an applicable rule, which is what the exception mechanism is for: it needs an approver,
a date, and the demonstration of uncorrelated errors recorded as its evidence. The reason for
holding the line is that both conditions are unverifiable by inspection, and a rule that can be
escaped by asserting an unverifiable antecedent is not a rule.

### R4 — Every fitted transformation is fitted inside each fold

**Preprocessing whose parameters are learned from data MUST be fitted separately within each fold's
training portion, never once over the whole dataset before folding.** This is
[Standard 8](08-leakage.md)'s R1 restated at fold granularity, where it is both easier to violate
and harder to notice — the fit is a single line before the loop, and the loop looks correct.

A pipeline object passed to the cross-validation routine, rather than a pre-transformed matrix,
satisfies this structurally. Feature selection, target encoding, resampling for class imbalance,
and imputation are all in scope; each is a fit, and each is routinely performed once before the
folds begin.

### R5 — Fold variance is reported alongside the mean

**The spread of results across folds MUST be reported wherever the mean is reported.** A mean of
0.81 over folds ranging from 0.62 to 0.94 is a different finding from a mean of 0.81 over folds
ranging from 0.80 to 0.82, and the two are indistinguishable once the spread is dropped.

High fold variance is a result in its own right: it usually indicates that the folds differ in
composition in a way that matters, which is information about the data.
[Standard 20](20-uncertainty.md) governs how that spread is used when comparing models.

## Prohibitions

### P1 — The CV scheme matches the data's structure

Reproduced verbatim from the source:

> use cross-validation schemes inappropriate for temporal/grouped data

The prohibited act is applying a scheme whose independence assumption the data does not satisfy:
a shuffled k-fold over grouped observations, a shuffled or plain k-fold over time-ordered
observations, stratification that ignores grouping, or a nested procedure whose inner loop uses a
different structure from its outer one.

The estimate a mismatched scheme produces is not merely optimistic. It answers a question about
interpolation within known groups or known periods, while being reported as an answer about
generalisation to new ones, and its low variance across folds actively argues for trusting it. An
exception here, if one is ever justified, must restate what the reported figure actually estimates
— which in practice is harder to write than fixing the scheme.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A recorded statement of dependence structure with the fold scheme justified against it | Manual review | None — reports `not-evaluated`; remediation is an attestation |
| R2 | The grouping key named, and a grouped fold generator used over it | Manual review | None — `not-evaluated` |
| R3 | A forward-chaining generator with the per-fold gap stated, per [Standard 6](06-temporal-splitting.md) | Manual review | None — `not-evaluated` |
| R4 | A pipeline object passed to the cross-validation routine rather than a pre-transformed matrix | Detector A1, plus manual review | Partial — an in-file ordering is evidence, never proof |
| R5 | Per-fold results reported, or the mean accompanied by its spread | Manual review | None — `not-evaluated` |
| P1 | Attestation that the scheme was chosen against the recorded structure, with R1's statement as supporting evidence | Manual review only | None — `not-evaluated` |

**What the automated check cannot establish.** Detector A1 touches this standard at one point only.
It reports when a preprocessing `.fit(` or `.fit_transform(` appears, within a single Python file,
before a `KFold(`, `TimeSeriesSplit(`, `GroupKFold(`, or `StratifiedKFold(` call — which is real
evidence for R4 and is not proof, because order in a file is a proxy for order in the dataflow and
the variable being fitted may already be a training subset. It says nothing at all about R1, R2,
R3, R5, or P1: whether `KFold` was the right choice depends on whether the data is grouped or
ordered, and inferring that from column names invites confident wrongness in both directions, which
is why [ADR 0004](../artifacts/adr/0004-honest-automation.md) lists cross-validation scheme
appropriateness among the checks deliberately not built. Notably, the *correct* call for grouped
data and the incorrect one differ by an identifier, and nothing in the repository says which the
data requires.

## Additions this standard makes beyond the source

- R1's requirement that the dependence structure be stated in writing before the scheme is
  justified, including the case where two structures coexist and both constrain the folds. The
  source describes the three data situations and the fold behaviour each demands; requiring an
  explicit recorded determination, and resolving the both-at-once case, is this standard's
  structure.
- R2's extension of grouping to keys that do not exist as columns — near-duplicate documents,
  repeated submissions, shared devices — and the requirement to construct and record such a key.
  The source names subject, session, and entity groupings only.
- R3's statement that the label-maturation gap applies within each fold rather than only at the
  outer boundary, and that fold count is bounded by usable history. Neither is in the source item.
- R5, the requirement to report fold spread alongside the mean, and the reading of high variance as
  a finding about the data. The source describes cross-validation as giving a more stable estimate;
  it does not require the stability to be quantified or disclosed.
- The observation in P1 that a mismatched scheme's low fold variance argues for trusting it, which
  is why the failure is persuasive rather than merely wrong.

## Relationship to other standards

[Standard 5](05-train-validation-test-separation.md) supplies the outer separation this procedure
sits inside; cross-validation replaces the validation partition and never the test set.
[Standard 6](06-temporal-splitting.md) supplies the ordering constraint R3 implements, and
[Standard 8](08-leakage.md) supplies the fitting discipline R4 restates at fold granularity.
[Standard 11](11-class-imbalance.md) matters here because resampling is a fit and belongs inside
the fold, and [Standard 20](20-uncertainty.md) is where the spread R5 requires becomes the basis
for deciding whether a difference between models is real.
[Standard 14](14-hyperparameter-tuning.md) uses the inner loop of a nested procedure as its search
surface.

## Implementation

**Partially checked.** Detector A1 contributes to R4 and to nothing else in this standard: it
reports a preprocessing fit appearing before a fold generator within one Python file, which is a
true and useful observation about that file. It does not examine multi-file flows, does not
interpret notebooks whose cells ran out of order, and cannot see whether the data being fitted was
already a training subset.

Nothing verifies that the fold scheme suits the data. R1, R2, R3, R5, and P1 report
`not-evaluated` — no mechanism can establish from repository text whether observations are grouped
or ordered, so the remediation is human judgement recorded as an attestation rather than more
searching. `leakage.no-preprocessing-leakage` reports `insufficient-evidence` when A1 is silent,
because a mechanism exists and found nothing, which is not the same as finding nothing to find.
Building an appropriateness check later would require amending
[ADR 0004](../artifacts/adr/0004-honest-automation.md), which rejected it on the grounds that a
green tick on a question the checker cannot answer is worse than no answer.
