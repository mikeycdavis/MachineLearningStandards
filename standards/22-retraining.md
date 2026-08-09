# Standard 22 — Retraining

Retraining is the one operation that changes a production model without anyone deciding to change
it. Where the schedule, the data window, and the promotion criteria have never been written down,
the model in production is whatever last night's pipeline produced, evaluated against nothing, and
the first evidence of a bad retrain is its effect on users. This standard requires that the policy
exist before the pipeline does, and that a gate stand between a newly trained model and the traffic.

Source: item 22 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every mechanism that replaces a deployed model's parameters: scheduled retraining,
drift-triggered retraining, continuous or online learning, and the manual retrain that happens
because someone noticed the model was old. Fine-tuning an existing model and training a replacement
from scratch are both in scope, because both change what production does.

Applicability is proposed by the `deployment-surface` and `training-code` triggers together. A model
trained once and deployed frozen is out of scope, and declaring the rule not-applicable with that
reason is correct — provided the declaration says so, since "we do not retrain" and "we retrain
without a policy" are otherwise written the same way.

## Requirements

### R1 — A written retraining policy exists before retraining is automated

**A retraining policy MUST be recorded before any automated retraining runs**, and MUST state its
trigger, the data window it uses, the evaluation the new model must pass, and the path back if the
new model performs worse. Item 22 of the source names each of those, and each corresponds to a
distinct way an unpoliced retrain fails.

The policy is a document, not a code comment beside a cron expression. A schedule in an orchestrator
records when retraining happens; the policy records why that cadence, what it uses, and what stops
the result from shipping.

### R2 — The trigger is stated and is either time-based or evidence-based

**The retraining trigger MUST be explicit.** A time-based trigger states its cadence and the
reasoning for it — how quickly the domain moves, how quickly labels accumulate. An evidence-based
trigger names the signal and the threshold, which is normally one of the thresholds
[Standard 21](21-drift.md) requires be defined in advance.

Retraining because the model feels stale is not a trigger; it is the absence of one, and it produces
a model whose vintage nobody can reason about. Where both trigger types apply — a regular cadence
with drift-driven interruptions — the policy states how they interact, since a drift retrain that
does not reset the clock produces two retrains in a week for no stated reason.

### R3 — The data window is specified, and its boundaries are justified

**The policy MUST state which data the retrained model is fitted on**, as a rule rather than as
"everything available". The choices are consequential: an expanding window keeps old regimes the
model may no longer need to serve, a rolling window discards seasonal patterns shorter than its
length, and either may include a period the project would exclude if anyone had looked. The window's
boundaries interact directly with the temporal split discipline in
[Standard 6](06-temporal-splitting.md), because a retrain that reuses a fixed evaluation period
eventually trains on it.

The policy also states what happens to the evaluation period as the window rolls forward. A frozen
test set ages into the past and stops measuring the present; a rolling one must be advanced by a
rule rather than by whoever ran the job.

### R4 — No automated retrain reaches production without passing an evaluation gate

**A retrained model MUST NOT replace a deployed model without passing a stated evaluation, and the
gate's criteria MUST be fixed before the retrain runs.** The gate compares the candidate against the
incumbent on the same data, the same split discipline, and the same metric — the comparison
conditions [Standard 19](19-model-comparison.md) requires — and it fails closed: a candidate that
cannot be evaluated does not ship.

Automatic retraining without a gate propagates a data problem into production faster than a human
could notice it. An upstream schema change, a corrupted partition, or a label pipeline that stopped
writing will all produce a model that trains successfully and serves badly, and the gate is the only
place in the sequence where that is catchable.

### R5 — A rollback path exists and has been exercised

**The policy MUST name the path back to the previous model, and that path SHOULD have been tested
rather than assumed.** Rollback requires the previous model's artifact, its preprocessing, and its
configuration to still exist and still load — three things that quietly stop being true when a
feature pipeline moves forward. A rollback path first exercised during an incident is a plan, not a
capability.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A committed retraining policy naming trigger, window, gate, and rollback | Manual review only | None |
| R2 | An explicit cadence with reasoning, or a named signal and threshold | Manual review only | None |
| R3 | A stated data window rule and a stated treatment of the evaluation period | Manual review only | None |
| R4 | Gate criteria fixed in advance, and a record of each retrain's gate result | Manual review only | None |
| R5 | A named rollback path and a record of it having been exercised | Manual review only | None |

**Why nothing automated applies here.** Nothing in this standard is evaluated. A repository can
contain a pipeline definition, and reading it would establish that a schedule exists — not that the
schedule is the policy's, not that the gate in it is enforced, and not that the deployed model came
from it. The facts that matter are operational: which model is serving, what data it saw, whether
the gate ran, and whether anyone has ever rolled back. A detector that inferred a compliant
retraining practice from the presence of a YAML file would be reporting a green result on a question
it never asked, which [ADR 0004](../artifacts/adr/0004-honest-automation.md) rejects by name.
The rules here therefore report `not-evaluated`, and their remediation is a human judgement recorded
as an attestation that names the policy document and the last gate result reviewed.

## Additions this standard makes beyond the source

- R2's distinction between time-based and evidence-based triggers, and the requirement that a policy
  using both state how they interact. The source requires that the trigger be stated; the taxonomy
  and the interaction rule are authored here.
- R3's treatment of the evaluation period under a rolling window. The source requires a stated data
  window; the observation that a frozen test set ages into irrelevance while a rolling one needs an
  advancement rule is this standard's, and it is where retraining most often collides with
  [Standard 6](06-temporal-splitting.md).
- R4's fail-closed requirement — a candidate that cannot be evaluated does not ship. The source
  requires an evaluation gate; specifying its behaviour on evaluation failure rather than on
  evaluation shortfall is this standard's addition, because the corrupted-input case fails the gate
  by being unmeasurable rather than by scoring low.
- R5's requirement that the rollback path be exercised, and the enumeration of what rollback needs
  to still exist: the artifact, its preprocessing, and its configuration.
- The scope note that "we do not retrain" must be declared rather than inferred from silence.

## Relationship to other standards

[Standard 21](21-drift.md) supplies the evidence-based trigger R2 refers to and names retraining as
one of its permitted responses; this standard supplies the gate that stops that response from making
things worse. [Standard 19](19-model-comparison.md) defines the conditions under which the gate's
comparison in R4 is meaningful, and [Standard 20](20-uncertainty.md) is what prevents a candidate
from being promoted on a difference inside the evaluation's noise.
[Standard 6](06-temporal-splitting.md) constrains R3's window arithmetic.
[Standard 4](04-dataset-versioning.md) and [Standard 15](15-reproducibility.md) are what make a
retrain auditable after the fact: without the data version and the configuration, a model that
regressed cannot be compared to the one before it, and R5's rollback becomes a restore of an
artifact nobody can characterise. [Standard 24](24-monitoring.md) is how a bad retrain that passed
the gate is eventually noticed.

## Implementation

**Not checked automatically.** Every rule in this standard reports `not-evaluated`. Compliance is
established by an attestation carrying the reviewer, the date, the retraining policy document, and a
digest of the files reviewed, so that the approval expires when the pipeline definition or the gate
configuration changes.

The absence of automation here is a deliberate outcome rather than an unbuilt feature. This standard
governs the behaviour of a system over time — what ran, on what data, against what gate, and what
happened next — and none of that is present in the text a static auditor reads. Recording it as
`not-evaluated` rather than allowing it to pass unexamined is the mechanism described in section 5
of [`design/architecture.md`](../design/architecture.md): a rule nothing evaluated is never reported
as passing.
