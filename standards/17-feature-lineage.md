# Standard 17 — Feature Lineage

For any feature a model uses, three questions have to be answerable: what raw data it derives from,
what transformation produced it, and when that data becomes available. Lineage is the record that
answers them. Without it, the questions are answered by reading code — which is why, in practice,
they are usually not answered at all, and why leakage and inference-time failures are typically
discovered after deployment rather than before it.

Source: item 17 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every feature supplied to a model, including features that appear to be raw columns —
a column in a table is itself the output of some upstream process, and whether that process runs
before or after the prediction moment is exactly what lineage records.

Applicability is proposed by the `training-code` trigger. A project consuming a third-party model
without engineering features is out of scope for the recording requirements, though R4 still
applies to whatever features it must supply at inference.

## Requirements

### R1 — Each feature's derivation is recorded

**For every feature, the record MUST state the raw sources it derives from and the transformation
applied.** A feature register, a schema with per-column documentation, or a feature-store
definition all satisfy this. A transformation function whose body is readable satisfies it only
where the sources are visible in the same place — a function taking a dataframe and returning a
column documents the arithmetic while hiding where the input came from, which is the half that
matters here.

The record does not need to restate the code. It needs to name the inputs, because the inputs are
what determine the two questions lineage exists to answer.

### R2 — Each feature's availability time is recorded

**The record MUST state when each feature's underlying data becomes available relative to the
prediction moment.** This is the field that turns lineage from documentation into a control. A
feature computed from a column populated by a batch job that runs after the event is a feature that
will not exist at inference, and recording its timing is what makes that visible before the model
is built rather than after it is deployed.

Three timings are worth distinguishing: available before the prediction, available only after it,
and available before it but with a latency that the inference path may not tolerate. The third is
the one most often missed, because it is correct in a training pipeline and wrong in a serving one.

### R3 — Lineage is current

**The record MUST be updated when a feature's derivation changes**, and a feature whose lineage is
known to be stale MUST be treated as undocumented rather than documented. A lineage record that
describes a previous version of a transformation is worse than none, because it invites the
conclusion that the question has been checked.

Where lineage is maintained by hand this requirement is a real burden, and the honest response
where it cannot be met is to say the record is unmaintained rather than to let it decay silently.

### R4 — Lineage supports the availability and leakage reviews

**The lineage record MUST be sufficient to answer, for each feature, whether it derives from
information unavailable at prediction time and whether it derives from the target.** This is the
requirement that gives the record its purpose: it exists to make the reviews in
[Standard 7](07-feature-availability.md) and [Standard 9](09-target-leakage.md) possible.

A record that lists feature names and dtypes does not meet this. A record that names sources and
timings does, because target leakage and future information are both properties of *where a value
comes from and when* — never of the value itself.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A feature register, documented schema, or feature-store definition naming sources and transformations | Manual review | None |
| R2 | Availability timing recorded per feature | Manual review | None |
| R3 | Evidence the record was updated alongside the last transformation change | Manual review | None |
| R4 | A completed availability and target-leakage review citing the lineage record | Attestation under Standards 7 and 9, with the record as its `reviewedAgainst` evidence | None |

**Why nothing automated applies here.** Lineage is a claim about meaning and timing, and neither is
present in repository text. A scanner can see that a function consumes one column and produces
another; it cannot see that the source column is populated by a nightly job, that the job runs
after the event being predicted, or that a field named `score_v2` is assigned by the very process
the model is meant to replace. Building a check that guessed at these from column names was
considered and rejected — it would fail in both directions constantly, and a passing result would
imply lineage had been verified when nothing had been. See
[ADR 0004](../artifacts/adr/0004-honest-automation.md).

This standard is therefore satisfied by attestation, and it is unusually well suited to it: the
lineage record is a durable artifact, so an attestation can pin `reviewedAgainst` to it and go
stale automatically when it changes. That mechanism turns a one-time review into one that expires
when the material it examined is edited.

## Additions this standard makes beyond the source

- R2's three-way distinction between available-before, available-after, and available-but-late.
  The source requires that lineage record what a feature derives from and when; separating the
  latency case from the ordering case is this standard's addition, made because a feature that is
  merely slow passes an ordering check and still fails in production.
- R3 in full, including the position that a stale record is worse than none. The source does not
  address currency.
- R4's framing of lineage as infrastructure for the availability and leakage reviews rather than
  as documentation with independent value, and the accompanying statement that a name-and-dtype
  listing does not satisfy it.
- The observation that a transformation function documents its arithmetic while concealing its
  inputs.

## Relationship to other standards

This standard exists largely to serve two others. [Standard 7](07-feature-availability.md) asks
whether each feature will exist at inference, and [Standard 9](09-target-leakage.md) asks whether
any feature encodes the target; both questions are answered from the record R1 and R2 require, and
neither can be answered reliably without it. [Standard 3](03-dataset-provenance.md) records the
same kind of information one level up, at dataset rather than feature granularity, and
[Standard 4](04-dataset-versioning.md) supplies the identifiers a lineage record uses to refer to
its sources. [Standard 23](23-inference-behavior.md) depends on R2 in particular: the inference
contract cannot be specified without knowing what will be available when it runs.

## Implementation

**Not checked automatically.** No detector is bound to this standard, and none is planned. The
rules describe a record whose value lies in its semantic content, and no static check can
distinguish a lineage document that answers R4 from one that lists column names under the same
heading.

What the system does provide is the attestation path described above, and the two standards this
one serves report their own findings. The honest summary: this standard's requirements report
`not-evaluated`, meaning no mechanism can establish them from repository text — not
`insufficient-evidence`, which would wrongly suggest that supplying more files would let a scanner
conclude something.
