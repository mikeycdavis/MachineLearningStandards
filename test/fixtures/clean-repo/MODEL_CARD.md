# Model card — example classifier

## Intended use
Ranking review queues. Not used as a calibrated probability.

## Training data
See DATASET.md.

## Evaluation

| Model | AUC |
| --- | --- |
| Baseline (majority class) | 0.500 |
| Logistic regression | 0.712 |

## Baseline
A majority-class predictor, evaluated on the same split and metric.

## Limitations
Performs worse on accounts under thirty days old; see the segment table.
