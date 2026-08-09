# Standard 21 — Drift

Every model is fitted to a distribution that has already begun to move. The failure this standard
prevents is not degradation — degradation is certain — but silent degradation: a model whose inputs
have shifted, whose performance has followed, and whose owners find out from a downstream complaint
rather than from a threshold they set in advance. Evidence of shift that nobody acted on is worse
than no monitoring, because the record shows the system knew.

Source: item 21 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every model serving predictions that influence a decision, from the point of deployment
onward. It covers three distinct things that are commonly collapsed into one word: shift in the
input distribution, shift in the distribution of the model's own outputs, and shift in the
relationship between inputs and outcomes. The first is observable immediately, the second is
observable immediately and is often the earliest usable signal, and the third is observable only
when outcomes arrive — and sometimes never.

Applicability is proposed by the `deployment-surface` trigger. A model that has been trained and
never deployed has no serving distribution to diverge from, and declaring the rule not-applicable
with that reason is correct until the day it ships.

## Requirements

### R1 — Inputs, outputs, and where possible outcomes are monitored for shift

**A deployed model MUST have shift monitoring on its input features and its output distribution,
and MUST have outcome monitoring wherever labels eventually arrive.** Input monitoring catches the
upstream change — a source system altering a unit, a category that stops appearing, a null rate that
climbs. Output monitoring catches the model's response to changes no single input made obvious.
Outcome monitoring is the only one that measures what actually matters, and it is the one most often
absent, because the labels arrive late or not at all.

Where outcomes are unavailable, that gap SHOULD be stated as a monitoring limitation rather than
left implicit, because a project monitoring only inputs is monitoring a proxy and should know it.

### R2 — Thresholds are defined before deployment, not after the first alert

**The threshold at which a shift becomes actionable MUST be defined in advance and recorded.** A
threshold chosen after seeing the drift metric is a threshold chosen to accommodate it. The record
states the statistic, the comparison window, the reference distribution, and the value — a
population-stability index above a stated figure over a rolling window against the training
distribution is a threshold; "we watch the dashboards" is not.

Thresholds are expected to be wrong at first. Revising one deliberately, with a reason and a date,
is compliant; adjusting one because it fired is the weakening that
[`design/architecture.md`](../design/architecture.md) section 6 describes.

### R3 — A response is defined for each threshold, with an owner

**Each defined threshold MUST have a stated response and a named owner.** The response may be
investigate, retrain, roll back, restrict the model's scope, or escalate to a human decision —
what it may not be is unspecified. A threshold with no response produces an alert whose recipient
must decide, under time pressure and without preparation, what the organisation's position is.

The response for a retraining trigger is specified in [Standard 22](22-retraining.md), which owns
the gate the retrained model must pass.

### R4 — Shift findings and their dispositions are recorded

**Every crossed threshold SHOULD be recorded with what was observed, what was decided, and why.**
The common and defensible decision is to take no action: the shift was seasonal, the affected
segment is negligible, the metric was noisy. That is a legitimate response and it is not the same as
ignoring the evidence — the difference is entirely in the record.

Over time this log becomes the most useful drift artifact a project owns, because it distinguishes
the shifts that mattered from the ones that did not, which no threshold set in advance can do.

## Prohibitions

### P1 — Shift evidence obligates a response

Reproduced verbatim from the source:

> ignore distribution shift when evidence indicates it

The prohibited act is inaction in the presence of evidence, not the shift and not the degradation.
Distributions move; that is the domain. What this forbids is holding evidence that the serving
distribution has diverged and neither responding nor recording a decision not to respond.

"Ignore" is doing no work here unless the alternative is specified, so this standard specifies it:
the evidence has been addressed when a named person has assessed it and the assessment is written
down, whatever the assessment concluded. Deciding that a shift is immaterial discharges the
obligation. Not looking at the alert for six weeks does not, and neither does an alert routed to a
channel nobody reads — an unread alert is evidence the project holds and has not addressed.

This prohibition is exemptible, unusually for a prohibition, and the reason is that legitimate cases
exist: a model in a fixed-term pilot with a known end date, or one whose shift response is
deliberately deferred pending a scheduled replacement, may waive it with an approver, a reason, and
an expiry. What the exception cannot do is remove the monitoring — a waiver of the response
obligation over a system that produces no evidence is a waiver of nothing.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A monitoring specification naming the input, output, and outcome signals watched | Manual review only | None |
| R2 | Recorded thresholds with statistic, window, reference distribution, and value | Manual review only | None |
| R3 | A response and a named owner against each threshold | Manual review only | None |
| R4 | A drift log recording observations and their dispositions | Manual review only | None |
| P1 | The R4 log, plus attestation that no crossed threshold went unaddressed | Manual review only | None |

**Why nothing automated applies here.** `monitoring.drift-response-defined` is not evaluated. Every
fact this standard cares about lives outside the repository: the serving distribution, the alerting
configuration, the identity of the person who saw the alert, and what they concluded. A repository
may contain a monitoring configuration file, and its presence would establish that a file exists —
not that the monitor runs, not that it is connected to the deployed model, and not that anyone reads
its output. Building a check on that file would attach a pass to the question of whether drift is
being managed, which is exactly the false confidence
[ADR 0004](../artifacts/adr/0004-honest-automation.md) forbids. P1 is harder still: the evidence
that a threshold was ignored is the absence of a response, and absence is what static analysis
cannot distinguish from a situation that never arose. Compliance rests on attestation, and the R4
log is what makes that attestation something a reviewer can check rather than accept.

## Additions this standard makes beyond the source

- The three-way separation in R1 of input, output, and outcome shift, and the observation that
  output shift is often the earliest usable signal. The source names inputs, outputs, and outcomes
  as things to monitor; the operational distinction between them is authored here.
- R2's specification of what a recorded threshold contains — statistic, window, reference
  distribution, value — and the rule that revising a threshold is compliant while adjusting one
  because it fired is not.
- R4 in its entirety. The source requires a stated response; requiring that each crossed threshold
  and its disposition be logged is this standard's addition, on the reasoning that a decision not to
  act is indistinguishable from inattention unless someone wrote it down.
- The operational definition of "ignore" in P1, including the treatment of an unread alert as
  unaddressed evidence, and the bounded exemption for fixed-term deployments.

## Relationship to other standards

[Standard 24](24-monitoring.md) is the general obligation of which this standard is a
specialisation: monitoring establishes that the model is observable, drift establishes what the
observations mean and what follows from them. The segmentation requirement in Standard 24 applies
with particular force here, because aggregate distributions are stable while a subpopulation's
shifts underneath them. [Standard 22](22-retraining.md) owns the most common response R3 will name,
and supplies the evaluation gate that stops a drift response from shipping a worse model.
[Standard 3](03-dataset-provenance.md) records the population the training data represented, which
is the reference distribution R2's threshold is measured against, and
[Standard 25](25-model-limitations.md) is where the conditions under which the model is known to
degrade must be written for the people who consume its output.

## Implementation

**Not checked automatically.** `monitoring.drift-response-defined` reports `not-evaluated`, and the
remediation is human judgement recorded as an attestation naming the monitoring specification, the
thresholds, the owners, and the drift log.

This is not a gap awaiting a better detector. The subject of this standard is a running system and
an organisation's response to it, and a static reading of source text has access to neither. The
attestation carries a digest of the files reviewed, so the approval expires when the monitoring
configuration changes — which is the mechanism that keeps a one-time review from outliving the thing
it reviewed, described in section 6 of [`design/architecture.md`](../design/architecture.md).
