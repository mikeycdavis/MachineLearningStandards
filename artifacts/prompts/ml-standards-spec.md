<!-- PROVENANCE
     This document is a DERIVED ENUMERATION of artifacts/prompts/original-prompt.md. It is not the
     brief, and it is not a second source of truth. It exists because the brief's topic list has no
     item numbers, so nothing could cite "item N" and nothing could detect a topic silently dropped.
     See artifacts/adr/0002-the-spec-is-a-derived-enumeration.md.

     What is derived, and how to verify it:

       * The twenty-five numbered item TITLES are the brief's `## Cover` bullets, in the brief's
         order, title-cased. Nothing was added, removed, merged, or reordered.
       * The `## Must-never rules` section is BYTE-IDENTICAL to the brief's section of the same
         name — heading, lead-in, and all twenty-three bullets.
       * The `## Evaluation philosophy` section is BYTE-IDENTICAL to the brief's section of the
         same name.

     Both verbatim sections can be checked with a plain diff against the brief. The standards quote
     this document, and scripts/fidelity.mjs verifies those quotations character for character.

     What is AUTHORED, and is therefore this document's own claim rather than the brief's: the two
     to five sentences of normative intent beneath each numbered item. The brief supplies bullet
     titles only. Where a standard reproduces authored text it may cite this specification; it must
     not describe that text as the brief's words.

     The enumeration is locked by artifacts/standards-source-inventory.json, which was reviewed by a
     human against this document and committed. That file is never regenerated from a run.
-->

# Machine Learning Standards — source specification

The objective, from the brief: prevent invalid models, misleading evaluation, leakage, overfitting,
irreproducible experiments, and unjustified claims about model quality.

Twenty-five topics follow. Each becomes one numbered standard. The must-never rules and the
evaluation philosophy are cross-cutting and are reproduced verbatim at the end; they are not
additional items, and the standards that host them are identified in each standard's own text.

## Items

### 1. Problem Formulation

A model cannot be correct or incorrect until someone has written down what it is supposed to
predict, for whom, and what a wrong answer costs. The prediction target, the unit of prediction,
the decision the output feeds, and the cost asymmetry between error types should be recorded before
modelling begins, because each of them silently determines a later choice — the metric, the split,
the threshold, the baseline. A project that skips this step does not avoid making those decisions;
it makes them implicitly and cannot later explain why.

### 2. Baseline Models

An improvement is a comparison, and a comparison needs something to compare against. A baseline
should be established before or alongside the first model and should be the strongest simple thing
that could reasonably work — a constant predictor, the current production rule, a linear model on
the obvious features — not a strawman chosen because it is easy to beat. The baseline is evaluated
on the same data and the same split as everything it will be compared to.

### 3. Dataset Provenance

Where the data came from, how it was collected, what it represents, and what was excluded from it
should be documented and should travel with the dataset. Exclusions matter most and are recorded
least: rows dropped for missing values, outliers removed, records filtered by date or segment. Each
exclusion changes what the model is being asked to predict, and an exclusion nobody wrote down is
one nobody can reason about when the model behaves unexpectedly on the excluded population.

### 4. Dataset Versioning

A dataset that can change without a version changing makes every result unreproducible and every
comparison unsound, because two models "evaluated on the same data" may not have been. Datasets
should carry an identifier that changes when their contents change — a version, a content hash, a
manifest of files and checksums — and experiment records should name the exact version used. The
requirement is that a past result can be tied to the data that produced it.

### 5. Train, Validation, and Test Separation

Three roles, three datasets, and the roles are not interchangeable. Training data fits parameters,
validation data guides choices, and the test set estimates performance on data the process has
never adapted to. The test set's value is entirely in its untouched-ness, and that value is
consumed by use: each look at it, each decision made in light of it, transfers a little information
from the test set into the model and makes the resulting estimate more optimistic than the truth.

### 6. Temporal Splitting

When observations are ordered in time and predictions will be made about the future, a random split
gives the model access to information that will not exist at prediction time, and the resulting
estimate is meaningless. Splits should respect time: train on the past, evaluate on the future,
with a gap where the label takes time to materialise. Evaluation periods should be chosen for their
representativeness and fixed before results are seen.

### 7. Feature Availability

Every feature a model requires must exist, with acceptable latency and acceptable quality, at the
moment a prediction is made in production. Features computed from data that arrives later, from
aggregates that include the prediction period, or from systems the inference path cannot reach are
not features — they are reasons the model will fail on deployment while having looked excellent in
evaluation. Availability should be verified before the feature is used, not after the model is
built.

### 8. Leakage

Leakage is any path by which information unavailable at prediction time reaches the model during
training, and it is the most common cause of a model that performs beautifully in evaluation and
worthlessly in production. It enters through preprocessing fitted on data the model should not have
seen, through features derived from the future, through duplicate records spanning a split, and
through identifiers that encode the outcome. Preprocessing should be fitted within the training
portion of each split, using the same discipline that will apply at inference.

### 9. Target Leakage

The specific and most damaging case: a feature that contains, encodes, or is derived from the thing
being predicted. It is difficult to detect because the feature is often legitimate-looking and its
relationship to the target is semantic rather than syntactic — a field populated only after the
outcome is known, an identifier assigned by the process being predicted, an aggregate computed over
a window that includes the label. Detection requires understanding what each feature means and when
it is populated, which is a human activity.

### 10. Cross-Validation

Cross-validation gives a more stable estimate than a single split by evaluating on several, but
only when the folds respect the structure of the data. Independent and identically distributed
observations may be shuffled; observations grouped by subject, session, or entity must keep each
group entirely within one fold or the model is evaluated on data it has effectively seen;
time-ordered observations require forward-chaining folds. Any preprocessing must be fitted inside
each fold, not once over the whole dataset.

### 11. Class Imbalance

When one class is rare, most metrics stop meaning what they appear to mean and most default
thresholds stop being appropriate. The imbalance should be measured and stated, the metric chosen
in light of it, and any resampling or weighting applied to the training portion only and disclosed.
Resampling changes the base rate the model implies, which matters when the output is interpreted as
a probability.

### 12. Metric Selection

The metric should follow from the problem, the cost of each kind of error, and the decision the
output feeds — and should be chosen and recorded before the results that would tempt a different
choice are available. Where several metrics are relevant, report them together rather than
selecting whichever is highest. A metric's limitations should be stated alongside its value.

### 13. Calibration

A score between zero and one is not a probability merely because it lies between zero and one. If
downstream decisions treat the output as a probability — thresholding on expected value, combining
with costs, feeding another model — then calibration should be measured and reported, and
recalibration applied where required. Where calibration has not been established, the output should
be described as a score rather than a probability.

### 14. Hyperparameter Tuning

Tuning is a search over model choices, and every choice made in light of a dataset's results adapts
the model to that dataset. The search should be conducted against validation data or an inner
cross-validation loop, never against the final test set, and the search space, the procedure, the
number of trials, and the selection criterion should be recorded. A reported test score is only an
honest estimate if the test set played no part in reaching the configuration being tested.

### 15. Reproducibility

Someone else, or the same person later, should be able to obtain the same result from the same
inputs. That requires the experiment's configuration to be recorded in enough detail to rerun it:
code version, data version, hyperparameters, environment and dependency versions, and random seeds.
Reproducibility is a property that is demonstrated, not asserted, and the honest position when the
configuration is incomplete is to say the result is not reproducible.

### 16. Random Seeds

Seeds should be set explicitly and recorded, for every source of randomness that affects the result
— data shuffling, initialisation, dropout, augmentation, and the split itself. Setting a seed is
the cheapest step toward reproducibility and is not the same as achieving it: hardware
non-determinism, parallel reduction order, and unseeded library internals can all defeat it, so
determinism should be verified rather than assumed. Where results vary across seeds, that variance
is itself a result and should be reported.

### 17. Feature Lineage

For each feature, it should be possible to say what raw data it derives from, what transformation
produced it, and when. Lineage is what makes it possible to answer whether a feature leaks, whether
it will be available at inference, and what breaks when an upstream source changes. Without it,
those questions are answered by reading code, which is why they are often not answered at all.

### 18. Ablation

When a model has several components — engineered features, an architectural choice, an
augmentation, a post-processing step — a claim that the whole is good does not establish that each
part contributes. Removing one component at a time and re-evaluating shows which parts earn their
place, and the resulting simplification is usually the more valuable finding. Ablations should use
the same data, splits, and metric as the comparison they inform.

### 19. Model Comparison

A comparison is only meaningful when the things compared were evaluated identically: the same data,
the same split, the same metric, the same preprocessing discipline. A difference in score is not
automatically an improvement — it may be within the noise of the evaluation, or real but too small
to matter, or real and meaningful but irrelevant to production behaviour. These three are different
claims and should be stated separately.

### 20. Uncertainty

A single number hides how much it would move if the experiment were repeated. Comparisons should
carry an indication of uncertainty — confidence intervals, variance across folds or seeds, or a
paired test — sufficient to tell a real difference from noise. Where uncertainty has not been
quantified, a small difference should not be described as an improvement.

### 21. Drift

The distribution a model was trained on will diverge from the distribution it serves, and the
model's performance will degrade in ways its evaluation cannot anticipate. Inputs, outputs, and
where possible outcomes should be monitored for shift, with thresholds defined in advance and a
stated response when they are crossed. Evidence of shift is information that obligates action, not
a metric to be observed.

### 22. Retraining

When, on what data, and under what approval a model is retrained should be decided deliberately
rather than emerging from habit. A retraining policy should state its trigger, the data window it
uses, the evaluation the new model must pass before replacing the old one, and the path back if it
performs worse. Automatic retraining without an evaluation gate propagates a data problem into
production faster than a human could.

### 23. Inference Behavior

The model's behaviour at prediction time — input contract, preprocessing, output shape and
meaning, thresholds, latency, and what happens when a feature is missing or malformed — should be
specified and should match training. Training and serving that apply different transformations
produce a model that is correct in neither. Failure behaviour deserves the same specification as
success: a prediction path that silently substitutes a default for a missing feature is making an
undisclosed decision.

### 24. Monitoring

A deployed model should be observable in production: prediction volumes and distributions,
input health, latency and error rates, and — where outcomes eventually arrive — realised
performance against the metric it was selected on. Monitoring should be segmented, because
aggregate health routinely conceals a population for which the model has stopped working.
Alerting thresholds and owners should be defined before deployment.

### 25. Model Limitations

What the model does not do, the populations and conditions under which it performs worse, the
assumptions it depends on, and the ways it is known to fail should be documented and should
accompany the model wherever its outputs are used. Segment-level performance belongs here,
including the segments that perform poorly. A limitations section that lists only limitations
already obvious to its author is not a limitations section.

## Must-never rules

Never:

* train on future information unavailable at prediction time
* leak target information into features
* tune hyperparameters against the final test set
* repeatedly inspect the test set until model choices fit it
* report training performance as expected production performance
* cherry-pick favorable evaluation periods
* hide poorly performing segments
* compare models using incompatible datasets/splits
* claim improvement without an appropriate baseline
* select metrics solely because they make the model look better
* treat accuracy as sufficient for every problem
* treat confidence scores as calibrated probabilities without evidence
* fabricate training results
* fabricate evaluation metrics
* fabricate datasets
* claim reproducibility without sufficient experiment configuration
* deploy a model whose required features will not exist at inference time
* ignore distribution shift when evidence indicates it
* silently remove difficult observations to improve metrics
* allow preprocessing to see information it should not see
* fit scalers/encoders/imputation globally before a split when that leaks information
* use cross-validation schemes inappropriate for temporal/grouped data
* declare a more complex model better merely because it has a slightly higher score

## Evaluation philosophy

Require the system to distinguish:

* statistical improvement
* practically meaningful improvement
* production-relevant improvement

Require uncertainty around model comparisons where appropriate.
