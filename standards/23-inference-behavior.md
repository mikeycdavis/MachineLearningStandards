# Standard 23 — Inference Behavior

A model's behaviour in production is defined by the code that surrounds it, and that code is
routinely written twice: once in the training pipeline and once in the serving path. Where the two
differ, the deployed model receives inputs it was never fitted on and returns outputs nobody
evaluated, while every offline number remains excellent. This standard requires the inference
contract to be specified rather than inferred from whichever implementation someone reads first, and
requires failure behaviour to be specified with the same care as success.

Source: item 23 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every path by which a model produces a prediction that leaves the project: a synchronous
API, a batch scoring job, an embedded model, or a notebook a human runs to answer a question. The
subject is the whole path — input validation, preprocessing, the model call, post-processing,
thresholding, and the response — not the model artifact, which by itself specifies almost nothing
about what a caller receives.

Applicability is proposed by the `deployment-surface` trigger. A model whose only consumer is its
own evaluation script has no inference contract to specify, and declaring the rule not-applicable
with that reason is correct until the first external caller appears.

## Requirements

### R1 — The inference contract is written down

**The input contract, the preprocessing applied, the output shape, and the output's meaning MUST be
specified in a document a caller can read.** The input contract names each field, its type, its
units, its permitted range, and whether it may be absent. The output specification says what the
number is: a calibrated probability, an uncalibrated score, a class label, or a ranking position —
four things that are frequently the same float and never the same claim.

Where the output is a score rather than a probability, the contract says so, in the terms
[Standard 13](13-calibration.md) requires. A consumer who multiplies an uncalibrated score by a cost
is making a decision the model does not support, and the contract is the only place that mistake can
be prevented.

### R2 — Training and serving apply the same transformations

**The transformations applied at inference MUST be the same as those applied during training**,
preferably by sharing one implementation rather than by maintaining two that agree today. Skew is
the default outcome of parallel implementations, and it is invisible offline because the offline
path is one of the two implementations.

The characteristic failure is not an obvious mismatch but a subtle one that leaves both paths
running. Consider a categorical feature encoded during training against the categories present in
the training frame, and encoded at serving against the categories present in the current request:

```python
# Training: the encoder learns a category vocabulary and an ordering from the training data.
encoder = OneHotEncoder(handle_unknown="ignore").fit(train_df[["region"]])
X_train = encoder.transform(train_df[["region"]])

# Serving, reimplemented: columns come from whatever this request happens to contain.
features = pd.get_dummies(request_df[["region"]])
prediction = model.predict(features)
```

Both lines run without error. `get_dummies` produces one column for a single-row request, in an
order derived from that request, and the model receives a vector whose positions mean something
different from the positions it was fitted on. No exception is raised, the latency is normal, the
monitoring is green, and the predictions are wrong in a way that varies by input. The compliant
version serialises the fitted `encoder` alongside the model and calls it in both paths.

Skew also arrives through units and defaults rather than through code: a duration in milliseconds at
training and seconds at serving, a null filled with the training mean at training and with zero at
serving, a timestamp parsed in one timezone offline and another online.

### R3 — Behaviour on missing or malformed input is specified, not incidental

**The response to a missing, null, out-of-range, or malformed feature MUST be defined explicitly.**
The permitted responses are to reject the request, to return a prediction accompanied by a stated
degradation, or to substitute a defined value — and if the answer is substitution, the substituted
value and the reason are part of the contract.

A prediction path that silently substitutes a default for a missing feature is making an undisclosed
decision, and it makes that decision on behalf of a caller who believes they received a prediction
about the entity they asked about. Silent imputation at inference is also the most reliable way to
manufacture a training-serving mismatch, because the training pipeline imputed with a statistic and
the serving path imputes with a literal.

### R4 — Latency, throughput, and thresholds are part of the specification

**The operating thresholds and the latency and throughput budgets MUST be stated**, because each
changes what the model does. A decision threshold is a modelling choice as consequential as any
hyperparameter: it converts a score into an action, it embodies the cost asymmetry recorded under
[Standard 1](01-problem-formulation.md), and when it is a constant in the serving code it is a
choice nobody reviewed. A latency budget determines which features can be fetched in time, which
connects this standard directly to [Standard 7](07-feature-availability.md).

Where the threshold differs between environments, or was changed after deployment, the contract
records the current value and the change, because an evaluation performed at one threshold does not
describe behaviour at another.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | An inference contract document naming inputs, preprocessing, output shape, and output meaning | Manual review only | None |
| R2 | A shared preprocessing implementation, or a test asserting parity between the two paths | Manual review only | None |
| R3 | A stated response for each malformed-input case, and matching serving behaviour | Manual review only | None |
| R4 | Recorded thresholds and latency budgets, with the current threshold value | Manual review only | None |

**Why nothing automated applies here.** Nothing in this standard is evaluated. Whether two
transformations are equivalent is a question about behaviour on data, not about text: the encoder
example above is two correct-looking lines in two files that a static reading has no basis for
comparing, and detecting it would require executing both paths over representative inputs, which is
outside the auditor's contract. Whether a document's stated contract matches the deployed service is
equally unreachable, since the deployed service is not in the repository. A check that looked for a
contract document could establish that a file exists — and that fact, reported against a rule about
inference behaviour, would be read as evidence that inference behaves as specified, which it is not.
The rules here therefore report `not-evaluated`, and the useful compliance mechanism is the one R2
names: a parity test the project owns and runs, which is evidence a reviewer can inspect.

## Additions this standard makes beyond the source

- R1's insistence that the output's *meaning* — calibrated probability, uncalibrated score, label,
  or rank — be part of the contract, and its link to the score-versus-probability language of
  [Standard 13](13-calibration.md). The source names output shape and meaning; the four-way
  distinction is authored here.
- The specific skew mechanisms enumerated in R2: a refitted versus a serialised encoder, unit
  mismatches, differing null-fill values, and timezone parsing. The source states that training and
  serving must not apply different transformations; the failure catalogue is this standard's.
- R2's preference for one shared implementation over two that currently agree, and its nomination of
  a parity test as the practical evidence.
- R4 in its treatment of the decision threshold as a reviewable modelling choice rather than a
  serving constant, and the requirement that a post-deployment threshold change be recorded. The
  source lists thresholds among the things to specify; the reasoning about their status is added
  here.
- The enumeration in R3 of the three permitted responses to malformed input.

## Relationship to other standards

[Standard 7](07-feature-availability.md) is the precondition: a contract cannot require a feature
the inference path cannot obtain within R4's latency budget, and a model deployed in that state
fails before the contract is ever consulted. [Standard 8](08-leakage.md) shares R2's mechanism from
the training side — preprocessing fitted with the wrong scope is both a leakage source and a skew
source, and one shared implementation addresses both.
[Standard 13](13-calibration.md) determines what R1 may claim the output is.
[Standard 24](24-monitoring.md) is how a violation of R2 is eventually detected in production, since
skew usually surfaces as an input or output distribution that does not match the training
distribution — which [Standard 21](21-drift.md) will report as drift, and which will not be drift.
[Standard 25](25-model-limitations.md) is where R3's degraded-prediction cases must be disclosed to
the people relying on the output.

## Implementation

**Not checked automatically.** Every rule in this standard reports `not-evaluated`, and compliance
is established by attestation naming the inference contract document, the shared preprocessing
implementation or parity test, and the reviewed threshold values.

This is a boundary rather than a backlog item. The question this standard asks — does the deployed
path behave as the training path did — is answered by running both, and the auditor does not execute
the target repository's code. What a project can do is make the answer cheap for a human reviewer:
one preprocessing implementation, one serialised artifact used by both paths, and a test that fails
when they diverge. That test is the evidence this standard is looking for, and a project that owns
it has converted an unverifiable claim into a checkable one on its own side of the boundary.
