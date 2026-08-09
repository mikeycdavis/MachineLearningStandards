Implement a **Machine Learning Standards** pack using the existing standards framework.

The objective is to prevent invalid models, misleading evaluation, leakage, overfitting, irreproducible experiments, and unjustified claims about model quality.

Preserve the existing standards architecture.

## Cover

* problem formulation
* baseline models
* dataset provenance
* dataset versioning
* train/validation/test separation
* temporal splitting
* feature availability
* leakage
* target leakage
* cross-validation
* class imbalance
* metric selection
* calibration
* hyperparameter tuning
* reproducibility
* random seeds
* feature lineage
* ablation
* model comparison
* uncertainty
* drift
* retraining
* inference behavior
* monitoring
* model limitations

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

## Deliverables

Implement standards, prohibitions, applicability, evidence requirements, verification, tests, documentation, and compliant/non-compliant examples.

Automate leakage and reproducibility checks where reasonably possible.

Do not create automated checks that merely provide false confidence.

Run the complete validation suite and report results.
