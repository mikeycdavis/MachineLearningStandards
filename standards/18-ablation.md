# Standard 18 — Ablation

A model that works is not evidence that its parts work. Engineered features, an architectural
choice, an augmentation scheme, a post-processing rule — each was added because someone believed it
helped, and belief accumulates faster than evidence. This standard prevents a project from carrying
components that contribute nothing, defending them as though they did, and paying their cost in
latency, fragility, and maintenance for the life of the model.

Source: item 18 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to any model composed of separable parts whose individual contribution is claimed, assumed,
or relied upon. A part is separable if the model can be built and evaluated without it: a feature
group, a preprocessing step, an augmentation, a loss term, an architectural block, an ensemble
member, a post-processing correction.

It applies with particular force where a component carries an ongoing cost — a feature requiring a
real-time lookup, an augmentation multiplying training time, an ensemble member doubling inference
latency. A component that is free to keep still deserves an ablation; a component that is expensive
to keep and unexamined is a standing bill nobody has read.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. A single unmodified
off-the-shelf estimator with no engineered features has no separable parts, and declaring the rule
not-applicable with that reason is the correct outcome.

## Requirements

### R1 — The separable components are enumerated

**The model's separable components MUST be listed before any claim is made about what contributes
to its performance.** The list is the object the rest of this standard operates on, and its absence
is why ablation is so often skipped: without an enumeration there is nothing to remove one at a
time, and the model presents as a single indivisible thing that either works or does not.

The enumeration is written where the model is documented, not derived on demand from the code. A
list reconstructed from source at review time reflects what a reader could identify, which is
systematically less than what is there — the augmentation buried in a data loader and the clipping
rule in a post-processing function are exactly the components that escape.

### R2 — Components are removed one at a time and re-evaluated

**Each component whose contribution is claimed SHOULD be evaluated by removing it alone and
re-running the evaluation, and the resulting score SHOULD be recorded beside the full model's.**
Removing several at once measures their combined effect and cannot attribute it. Where components
are believed to interact, the interaction is a separate, stated hypothesis tested by its own removal
pair — not an excuse for removing the group.

Where the full enumeration is too large to ablate exhaustively, the subset actually tested is stated
along with the reason for the selection, and no contribution claim is made about the components not
tested. Silence about an untested component is acceptable; a contribution claim about one is not.

### R3 — Ablations use the same data, splits, and metric as the comparison they inform

**Every ablation MUST be run on the same dataset version, the same split, and the same metric as the
comparison it supports, under the same preprocessing discipline.** An ablation run on a convenient
subset, an older data version, or a faster proxy metric produces a number that cannot be placed
beside the full model's, and placing it there anyway is the failure
[Standard 19](19-model-comparison.md) prohibits, committed against a variant of the same model
rather than against a competitor.

Ablation is a comparison and inherits every condition that applies to comparison. The one
relaxation this standard permits is deliberate: where the full model's evaluation is expensive, a
reduced but *identically constructed* evaluation may be used for all arms including the full model,
so that the arms remain comparable to each other even though the absolute figures are not comparable
to the headline result. Where this is done, the reduced protocol is stated and the figures are not
quoted as performance.

### R4 — A component that does not earn its place is removed, or its retention is justified

**Where an ablation shows a component's contribution is within the uncertainty of the evaluation,
the component SHOULD be removed, and if it is retained the reason MUST be recorded.** Legitimate
reasons exist — a component may guard against a failure mode the evaluation set does not contain, or
may be required for a downstream contract, or may matter on a segment the aggregate metric hides.
Each of those is a statement that can be examined. "It seemed to help" is not.

The resulting simplification is usually the more valuable finding. A project that ablates and
removes ships a smaller model with fewer dependencies and a shorter list of things that can break,
and it has learned something true about its problem. A project that ablates and retains everything
has run the experiment and declined the result.

### R5 — Ablation results are reported, including the ones that found nothing

**Every ablation run MUST be reported, not only those showing a positive contribution.** An
ablation table containing only the components that helped is a selected sample, and the reader
cannot tell whether the absent components were untested or tested and unhelpful. The distinction is
the whole informational content of the table.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A component list in the model card or experiment record | Manual review | None |
| R2 | An ablation table with one row per removed component and the full model's score | Manual review | None |
| R3 | Dataset version, split identifier, and metric recorded identically across all arms | Manual review, supported by the identifiers [Standard 4](04-dataset-versioning.md) requires | None |
| R4 | For each retained low-contribution component, a recorded reason | Manual review | None |
| R5 | The ablation table showing every run, including null results | Manual review only — an unreported run is invisible by construction | None |

**Why nothing automated applies here.** Nothing in a repository distinguishes a model with an
unexamined component from one whose components were all tested; nothing distinguishes an ablation
table that is complete from one that is a selection. A detector could observe that a document
contains a heading named Ablation, which would establish that the word appears — not that any
component was removed, not that the arms shared a split, and not that the table shows every run.
That check was not built, for the same reason the metric-appropriateness check was not: a green
result on a question the mechanism cannot answer is worse than no result. Every rule here reports
`not-evaluated`.

## Additions this standard makes beyond the source

- R1, the requirement that components be enumerated in documentation before contribution claims are
  made. The source describes ablation as removing one component at a time; that the enumeration is
  itself a required and separately failing artefact is this standard's addition, on the observation
  that ablation is most often skipped for want of a list to ablate from.
- R5, requiring null results to be reported. The source requires ablation; the reporting obligation
  and the reasoning that a partial table is indistinguishable from a complete one are this
  standard's.
- The relaxation in R3 permitting a reduced but identically constructed protocol across all arms,
  with the condition that its figures not be quoted as performance. The source requires the same
  data, splits, and metric without addressing cost.
- The scope note that a component carrying an ongoing production cost has a stronger claim on
  ablation than a free one.
- R4's treatment of "within the uncertainty of the evaluation" as the removal threshold, which
  imports [Standard 20](20-uncertainty.md)'s machinery into a decision the source leaves qualitative.

## Relationship to other standards

[Standard 19](19-model-comparison.md) supplies the conditions R3 inherits and hosts the evaluation
philosophy that governs how an ablation's outcome may be described — a component's measured
contribution is a claimed improvement like any other, and must be stated as statistical, practically
meaningful, or production-relevant rather than left as an unqualified difference in score.
[Standard 20](20-uncertainty.md) supplies the uncertainty R4's threshold depends on; without it,
"contributes nothing" and "contributes less than the noise" cannot be told apart, and a project will
retain components on the strength of differences it cannot measure.
[Standard 4](04-dataset-versioning.md) makes R3's "same data" checkable.
[Standard 7](07-feature-availability.md) and [Standard 17](17-feature-lineage.md) benefit directly
from R4's removals: every feature ablated away is one fewer availability risk at inference and one
fewer lineage chain to maintain. [Standard 25](25-model-limitations.md) is where a component
retained under R4 for a reason the evaluation could not test belongs as a stated assumption.

## Implementation

**Not checked automatically.** No rule in this standard is bound to a detector. The reason is the
same one that governs most of the evaluation cluster and is recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md): the auditor cannot see what was not
reported. An ablation that was never run and an ablation that was run, produced a null result, and
was omitted from the table are the same repository.

Nothing verifies that the component enumeration is complete, that ablations shared a split with the
model they inform, that the reported table is the whole table, or that a retained component's
justification is anything more than habit written down. All of it is satisfied by attestation
recording which components were examined, by whom, and what the runs showed — including the runs
that showed nothing.
