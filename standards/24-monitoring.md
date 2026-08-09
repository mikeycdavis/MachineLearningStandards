# Standard 24 — Monitoring

An unmonitored model in production is a component whose failures arrive as user complaints. The
specific failure this standard prevents is the one aggregate dashboards are worst at showing: a
model that is healthy on average and has stopped working for a population, while volume, latency,
and error rate all sit within their normal bands because that population is a small share of the
traffic. Observability is not a deployment afterthought; it is the only mechanism by which anyone
learns that the model still works.

Source: item 24 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every deployed model from the moment it serves its first prediction, whether it serves
synchronously, in batch, or embedded in another product. It covers the model's operational health,
the health of the inputs reaching it, the distribution of what it emits, and — where outcomes
eventually arrive — its realised performance against the metric it was selected on.

Applicability is proposed by the `deployment-surface` trigger. A model that has not been deployed is
outside this standard, and a model deployed to a small internal audience is not: audience size
changes what monitoring is proportionate, not whether it is required.

## Requirements

### R1 — The model is observable in production

**A deployed model MUST emit prediction volume, prediction distribution, input health, latency, and
error rate**, and those signals MUST be retained long enough to compare a present period against a
past one. A signal with no history answers "is it broken now" and cannot answer "when did this
start", which is the question every investigation actually asks.

Input health covers null rates, out-of-range values, unseen categorical levels, and the volume of
requests rejected under [Standard 23](23-inference-behavior.md)'s malformed-input contract. A rising
rejection rate is one of the earliest signals available and is often visible before any distribution
metric moves.

### R2 — Realised performance is measured wherever outcomes arrive

**Where ground-truth outcomes eventually become available, realised performance against the
selection metric MUST be measured and monitored.** This is the only monitoring signal that observes
what the model is for. Everything else is a proxy, and proxies stay green through failures that
matter.

The measurement carries its own delay, and that delay is part of the specification: a label that
materialises after ninety days means realised performance describes the model of three months ago,
and the monitoring must say so rather than implying currency. Where outcomes never arrive, or arrive
only for the subpopulation the model acted on, that limitation SHOULD be recorded — outcome data
conditioned on the model's own decisions is a biased sample, and treating it as a performance
measurement produces a flattering and false number.

### R3 — Monitoring is segmented

**Monitoring MUST be reported by segment as well as in aggregate**, using the segments that matter
for the problem: the populations named in [Standard 25](25-model-limitations.md), the classes named
in [Standard 11](11-class-imbalance.md), and any group whose treatment carries regulatory or ethical
weight. Aggregate health routinely conceals a population for which the model has stopped working,
and the concealment is arithmetic rather than negligence — a segment at five percent of volume can
fail completely while the overall metric moves by less than its own noise band.

The segments are chosen before deployment and recorded, for the same reason evaluation periods are
fixed in advance: segments selected after the numbers are visible are selected to avoid showing
something.

### R4 — Thresholds, alerts, and owners are defined before deployment

**Every monitored signal that warrants a response MUST have an alerting threshold and a named owner,
both defined before the model is deployed.** An owner is a person or a rota, not a team name that
resolves to nobody at three in the morning. A signal with no threshold is a chart, and a chart is
consulted after someone already suspects a problem.

Defining thresholds before deployment also forces the question of what the response is, which is
where [Standard 21](21-drift.md) and [Standard 22](22-retraining.md) attach.

### R5 — Monitoring is verified to be working

**The monitoring pipeline SHOULD itself be monitored**, because a silent monitor is
indistinguishable from a healthy model. Staleness checks on each signal, and an alert that fires
when a metric stops arriving, convert an absence of alerts into weak positive evidence rather than
no evidence at all.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A monitoring specification naming each signal, its source, and its retention | Manual review only | None |
| R2 | A realised-performance metric with its label delay stated | Manual review only | None |
| R3 | Segment definitions recorded before deployment, and per-segment reporting | Manual review only | None |
| R4 | Thresholds and named owners recorded against each alerting signal | Manual review only | None |
| R5 | Staleness or heartbeat checks on the monitoring signals themselves | Manual review only | None |

**Why nothing automated applies here.** `monitoring.production-monitoring-defined` is not evaluated.
Every subject of this standard is outside the repository: the running service, the metrics backend,
the alert routing, and the person on the rota. A repository may contain a dashboard definition or an
alert rule, and reading it would establish that a file exists — not that the alert is deployed, not
that it is wired to this model, and not that its recipient exists. Reporting a pass on that basis
would put a green result against the question of whether the model is being watched, which is the
category of check [ADR 0004](../artifacts/adr/0004-honest-automation.md) declines to build. The
honest disposition is `not-evaluated`, and the remediation is human judgement recorded as an
attestation that names the monitoring specification and the on-call arrangement it reviewed.

## Additions this standard makes beyond the source

- R2's treatment of label delay as part of the monitoring specification, and its warning that
  outcome data conditioned on the model's own decisions is a biased sample. The source requires
  realised performance to be monitored where outcomes arrive; the delay and the selection-bias
  caveat are authored here.
- R3's requirement that segments be chosen and recorded before deployment, with the reasoning
  borrowed from the pre-specification of evaluation periods. The source requires segmented
  monitoring; the timing obligation is this standard's addition.
- The arithmetic observation in R3 that a small segment can fail completely while the aggregate
  moves less than its own noise band, which is why aggregate monitoring cannot be a substitute.
- R5 in its entirety. The source does not mention monitoring the monitor; the requirement is added
  because without it, an absence of alerts carries no information, and an absence of alerts is what
  most projects treat as evidence of health.
- The inclusion of the malformed-input rejection rate from [Standard 23](23-inference-behavior.md)
  among R1's input-health signals.

## Relationship to other standards

[Standard 21](21-drift.md) is the specialisation of this standard that deals with distributional
change and what obligations follow from observing it; this standard establishes that the
observations exist at all. [Standard 23](23-inference-behavior.md) supplies the contract whose
violations R1 counts, and is where training-serving skew originates — skew reaches this standard as
an input or output distribution that does not match training.
[Standard 22](22-retraining.md) is the most common response to what monitoring finds, and the place
where a retrained model's effect must be observed after promotion.
[Standard 12](12-metric-selection.md) determines what R2 measures, and the choice must be the same
metric the model was selected on or the monitoring answers a different question from the evaluation.
[Standard 25](25-model-limitations.md) supplies R3's segments and receives, in return, the
production evidence that turns a predicted limitation into an observed one.

## Implementation

**Not checked automatically.** `monitoring.production-monitoring-defined` reports `not-evaluated`,
along with every other rule this standard hosts. Compliance is established by an attestation
carrying the reviewer, the date, the monitoring specification, the segment definitions, and the
alert-and-owner mapping, with a digest of the reviewed files so the approval expires when they
change.

Recording this as `not-evaluated` rather than letting it pass unexamined is the safe default the
system is built around, described in section 5 of
[`design/architecture.md`](../design/architecture.md): there is no path by which a rule nothing
examined is reported as passing. Coverage is reported beside the verdict for exactly this reason, so
that a compliant project is never read as a fully checked one.
