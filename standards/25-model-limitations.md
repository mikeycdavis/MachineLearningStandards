# Standard 25 — Model Limitations

A model's outputs travel further than its authors do. They are quoted in decks, embedded in
products, and relied upon by people who never saw the evaluation and have no way to know which
populations the model has never encountered or which assumptions it silently depends on. The failure
this standard prevents is a correct model used incorrectly — not because anyone was careless, but
because the knowledge required to use it correctly stayed with the team that built it.

Source: item 25 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every model whose output is used by anyone other than its author, including internal
consumers and downstream models. The subject is a document that accompanies the model — a model card
or an equivalent — and the obligation is on its content as much as its existence.

Applicability is proposed by the `ml-footprint` and `deployment-surface` triggers. A model built
solely to answer a question that has now been answered, whose outputs go nowhere, is out of scope;
that is a narrower category than it first appears, since a number quoted in a document is an output
that went somewhere.

## Requirements

### R1 — Limitations are documented and travel with the model

**Every model MUST have a written statement of what it does not do, the conditions under which it
performs worse, the assumptions it depends on, and the ways it is known to fail**, and that
statement MUST be discoverable from the model rather than from the team that built it. A model card
committed beside the artifact satisfies this; a section in a slide deck presented once does not.

"Travels with" is the operative constraint. A limitations document that exists in a wiki nobody
links from the model's registry entry has already failed for the consumer this standard is written
to protect.

### R2 — Segment-level performance is reported, including the weak segments

**Performance MUST be reported by segment, and the segments where the model performs poorly MUST be
among those reported.** The segments are the populations the model will actually be applied to,
including those the training data under-represents — which
[Standard 3](03-dataset-provenance.md)'s exclusion record identifies directly.

An aggregate metric is an average over a population, and the average is compatible with the model
being useless for a subset of it. Reporting only the aggregate is not a summary of the segmented
results; it is the omission of them.

### R3 — The assumptions the model depends on are stated

**The conditions under which the model's estimates hold MUST be recorded**, including the period the
training data covers, the population it represents, the upstream systems whose behaviour it assumes
stable, and any relationship the model treats as fixed. An assumption nobody wrote down is an
assumption nobody can check when it stops holding, and it will stop holding — the drift that
[Standard 21](21-drift.md) monitors is exactly the process of assumptions expiring.

### R4 — Known failure modes are described concretely

**Known failure modes MUST be described in terms a consumer of the output can act on.** "May perform
worse on rare classes" is a category; "predictions for accounts with fewer than thirty days of
history are unreliable, and roughly a fifth of daily requests are such accounts" is a limitation.
The difference is whether a reader can tell when they are in the affected case.

A limitations section that lists only limitations already obvious to its author is not a limitations
section. The productive test is to ask what a competent, sceptical outsider would want to know
before relying on the output, and then to answer that rather than the easier question of what the
team already agrees about.

### R5 — Limitations are updated when evidence changes them

**The limitations document MUST be revised when production evidence reveals a failure mode the
document does not contain.** Monitoring under [Standard 24](24-monitoring.md) produces exactly this
evidence: a segment whose realised performance has degraded is a limitation the model card is
missing, and the correction belongs in the document rather than only in the incident record.

## Prohibitions

### P1 — Weak segments are reported, not hidden

Reproduced verbatim from the source:

> hide poorly performing segments

The prohibited act is selective reporting: computing segment-level results and presenting only the
favourable ones, or defining segments so that a poor-performing population is dissolved into a
larger one. Both produce a document whose every statement is true and whose overall impression is
false.

This is distinguished from R2 by what is known. R2 is failed by a project that never segmented its
evaluation; the omission may be an oversight. This prohibition covers the project that segmented,
saw the result, and chose what to publish. It is also failed by a report whose segmentation was
redrawn after the first cut showed something unwelcome — reaggregating a failing segment into its
parent is hiding it, whatever the resulting table says.

The exemptible case exists and is narrow: a segment that cannot be published for a legitimate
privacy or legal reason may be withheld with an approver, a reason, and an expiry, provided the
existence of the withheld segment is disclosed. Withholding the number is different from concealing
that the number exists, and only the first can be waived.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A `MODEL_CARD.md`, `model-card.md`, `docs/model*card*` file, or a `## Model card` or `## Limitations` heading | Detector A8 searches for those filenames and headings | Partial — see below |
| R2 | A segment-level results table covering the populations the model serves | Manual review only | None |
| R3 | A stated assumptions section naming period, population, and upstream dependencies | Manual review, supported by A8's structural finding | None for content |
| R4 | Failure modes stated with the condition and its prevalence | Manual review only | None |
| R5 | A revision history tying document updates to production findings | Manual review only | None |
| P1 | Attestation that the reported segments are the full set computed, with any withheld segment disclosed | Manual review only | None |

**What the automated check cannot establish.** Detector A8 reports whether a model-card document or
a model-card-shaped heading exists. It matches headings rather than word occurrences deliberately: a
`## Limitations` heading is a structural claim that the document contains a limitations section,
while the word "limitations" appearing in a paragraph is a mention and would make the check fire on
documents that discuss the topic without doing it. The finding is therefore true and narrow — the
document exists, or it does not.

It never establishes whether the limitations stated are the model's actual limitations. A model card
containing one anodyne sentence satisfies A8 completely and satisfies none of R2 through R4.
P1 is beyond automation by construction, and was rejected on that basis in
[ADR 0004](../artifacts/adr/0004-honest-automation.md): the auditor cannot see what was not
reported, so a hidden segment leaves no trace anywhere in the repository. It is among the purest
attestation cases in the system, and `evaluation.segment-performance-reported` is not evaluated for
the same reason — a segment table that exists can be read, and a segment table that should exist and
does not is indistinguishable from a model with no meaningful segments.

## Additions this standard makes beyond the source

- R4's concreteness test — that a limitation names the condition and its prevalence so a reader can
  tell whether they are in the affected case. The source requires that failure modes be documented
  and that a limitations section not restate the obvious; the operational test is authored here.
- R5 in its entirety. The source treats the limitations document as something written; requiring it
  to be revised when production evidence contradicts it is this standard's addition, and it is what
  connects the document to [Standard 24](24-monitoring.md) rather than leaving it as a
  deployment-time artifact.
- The "travels with" constraint in R1 given a discoverability test rather than an existence test.
- The distinction drawn in P1 between never having segmented and having segmented selectively, and
  the treatment of post-hoc reaggregation as a form of hiding. The source names the act; separating
  it from R2's oversight case is this standard's interpretation, without which every incomplete
  evaluation reads as a possible violation.
- The bounded exemption in P1 for segments withheld for privacy or legal reasons, together with the
  requirement that the withholding itself be disclosed.

## Relationship to other standards

[Standard 3](03-dataset-provenance.md) is the upstream source of most real limitations: every
documented exclusion is a population the model has not seen, and an exclusion recorded in provenance
and absent from this document is a known blind spot the model's users never learn about.
[Standard 1](01-problem-formulation.md) supplies the intended use against which "what the model does
not do" is defined. [Standard 13](13-calibration.md) determines whether the output may be described
as a probability, which belongs in the same document.
[Standard 11](11-class-imbalance.md) and [Standard 12](12-metric-selection.md) supply the metric
caveats that R2's segment table must carry, and
[Standard 24](24-monitoring.md) both consumes this standard's segments as monitoring dimensions and
feeds R5 the evidence that revises them.

## Implementation

**Partially checked.** Detector A8 binds to `deployment.model-card` and reports whether a model card
or a model-card-shaped heading exists in the repository. That is a real fact and a useful one: the
absence of the document is the most common failure of this standard, and it is cheaply visible.

Nothing checks the document's content. `evaluation.segment-performance-reported` and
`evaluation.no-hidden-segments` both report `not-evaluated`, and the second is undetectable by
construction rather than merely unbuilt — there is no artifact corresponding to a segment that was
computed and left out. Both are satisfied only by attestation recording that a human compared the
published segments against the segments computed, and what they found. The attestation carries a
digest of the reviewed files so it expires when the results change, which is the mechanism that
stops a review of one release from vouching for the next.
