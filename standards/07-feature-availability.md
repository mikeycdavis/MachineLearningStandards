# Standard 7 — Feature Availability

A feature that exists in the training warehouse and not on the inference path is not a feature; it
is a defect with a good evaluation score. The failure this standard prevents is discovered at
deployment, when a model that performed excellently is asked for a prediction and the value it
needs has not arrived yet, cannot be reached from the serving process, or is computed from a window
that has not closed. By then the model is built, the results are circulated, and the cheapest
remaining option is to substitute a default and hope.

Source: item 7 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every feature consumed by a model that will make predictions outside the training
environment, whether served online, in batch, or through a scheduled job. It covers raw inputs and
derived ones equally, and it covers a feature's *quality* and *latency* as well as its existence —
a value that arrives four hours late is unavailable to a request that must answer in fifty
milliseconds.

Applicability is proposed by the `deployment-surface` and `training-code` triggers. A model built
for a one-off retrospective analysis, with no inference path at all, has no availability question
to answer; declaring the rule not-applicable with that reason, and with a `revisitWhen` naming
deployment, is the correct outcome.

## Requirements

### R1 — Each feature carries a stated availability at prediction time

**Every feature a model requires MUST have a written statement of where its value comes from at
inference, how current that value will be, and what quality it will have.** The three properties
are separate failures. A feature can exist and be stale, be current and be unreachable, or be
reachable and be populated for a fraction of requests that differs sharply from the training
population.

The record belongs with the feature's lineage under [Standard 17](17-feature-lineage.md) rather
than in a separate list, because an availability statement that lives apart from the feature
definition stops being updated the first time the feature changes.

### R2 — Availability is verified before the feature is used, not after the model is built

**Availability MUST be established before a feature enters a model, and the verification MUST be
recorded.** Verification means checking the serving path — the system, the query, the latency, the
population coverage — not reasoning that the value ought to be there because it is in the training
table.

This ordering is the whole requirement. Checking afterwards is not a weaker version of the same
control; it is a different activity, performed under pressure to find the feature acceptable,
against a model whose reported performance already depends on it.

### R3 — Aggregate features state their window relative to the prediction moment

**Any feature computed over a window MUST state that window's boundaries relative to the moment of
prediction, and the window MUST NOT extend to or past that moment.** An average over "the last
thirty days" is compliant when computed from data available before the request and is a violation
when the training-time computation quietly included the day being predicted.

This is the point at which availability and leakage are the same defect seen from two sides. A
window that includes the prediction period is unavailable at inference precisely because the period
has not happened yet, which is why [Standard 6](06-temporal-splitting.md) and
[Standard 8](08-leakage.md) reach the same conclusion by a different route.

### R4 — The inference path can reach every source the model depends on

**The systems supplying each feature MUST be reachable from the inference environment, and any
that are not MUST be resolved before the model is considered deployable.** A feature assembled in
a training notebook from an analytics warehouse, an internal API behind a different network
boundary, and a manually maintained spreadsheet may be trivially available to the person building
the model and unavailable to the process that will serve it.

Where a source is reachable but unreliable, the behaviour when it fails is part of the feature's
specification and belongs in [Standard 23](23-inference-behavior.md). A serving path that
substitutes a default for a missing feature is making an undisclosed decision, and the disclosure
is the requirement.

## Prohibitions

### P1 — Every training feature exists at inference

Reproduced verbatim from the source:

> deploy a model whose required features will not exist at inference time

The prohibited act is deployment, not the exploratory use of a feature that later proves
unavailable. Discovering during development that a promising feature cannot be served is ordinary
and useful work; carrying it into production, or reporting an evaluation that depends on it as
though it described production behaviour, is what this forbids.

The prohibition is exemptible in principle, and an exception would have to say something specific:
which feature, what will be served in its place, what the evaluated performance was with the
feature and what it is expected to be without it, and by when the gap closes. An exception that
does not restate the performance claim is not a waiver of this rule — it is a waiver of
[Standard 25](25-model-limitations.md) as well, granted by omission.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A per-feature record naming the serving source, expected latency, and expected population coverage | Manual review | None — reports `not-evaluated`; remediation is an attestation |
| R2 | A dated verification record produced before the feature entered the model | Manual review | None — `not-evaluated` |
| R3 | Window boundaries stated relative to the prediction moment for every aggregate feature | Manual review | None — `not-evaluated` |
| R4 | A reachability check from the inference environment against each named source | Manual review | None — `not-evaluated` |
| P1 | Attestation that every required feature was confirmed available at inference, with R1's records as supporting evidence | Manual review only | None — `not-evaluated` |

**Why nothing automated applies here.** Availability is a property of the production environment,
and the auditor reads a repository. A column name in a training script carries no information about
whether the serving process can obtain that value, how late it arrives, or how often it is null for
real requests — the same identifier is compliant in one deployment and impossible in another. A
check that compared training feature names against a serving schema would only be as true as the
schema, and would report a confident pass on a feature that is present, reachable, and four hours
stale. Every rule here is satisfied by attestation, and the attestation is worth more when it names
the verification performed under R2 rather than asserting the conclusion.

## Additions this standard makes beyond the source

- The separation in R1 of availability into three independently failing properties — existence,
  latency, and quality. The source names acceptable latency and acceptable quality alongside
  existence; treating them as three separate statements that must each be recorded, rather than one
  judgement of availability, is this standard's structure.
- R2's insistence that verification is recorded and dated *before* the feature is used. The source
  says availability should be verified before the feature is used rather than after the model is
  built; the requirement for a dated artifact, and the observation that a later check is performed
  under pressure to approve, are this standard's additions.
- R4's treatment of network and environment reachability as distinct from the existence of the
  data, and the routing of failure behaviour to [Standard 23](23-inference-behavior.md).
- The content this standard requires of an exception to P1 — the named feature, the substitute,
  the restated performance expectation, and the closing date. The source states the prohibition
  and says nothing about waivers.

## Relationship to other standards

[Standard 17](17-feature-lineage.md) supplies the per-feature derivation records that make R1
answerable; without lineage, availability is established by reading code, which is why it is often
not established at all. [Standard 8](08-leakage.md) and
[Standard 6](06-temporal-splitting.md) describe the same defect from the training side: a feature
computed over a window that includes the prediction period is both leakage and an availability
failure. [Standard 23](23-inference-behavior.md) specifies what the serving path does when a
feature is missing despite this standard, and [Standard 25](25-model-limitations.md) is where a
feature served with degraded quality must appear as a stated limitation.
[Standard 24](24-monitoring.md) is what detects an availability assumption that held at deployment
and stopped holding afterwards.

## Implementation

**Not checked automatically.** No detector is bound to any rule in this standard, and none is
planned. The facts these rules turn on — what the serving environment can reach, how quickly, and
how completely — are not in the repository, and a check built over feature names would report on
the vocabulary of the training code rather than on the availability of anything.

Every rule and the prohibition therefore report `not-evaluated`. That disposition is chosen rather
than `insufficient-evidence` because the difference routes the reader correctly: `not-evaluated`
means no mechanism can establish the rule from repository text and a person must judge it, whereas
`insufficient-evidence` would tell an agent to keep searching the repository for something that is
not in it. The honest boundary of static analysis is recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md), and this standard sits entirely outside it.
