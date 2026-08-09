# Standard 3 — Dataset Provenance

A dataset is a claim about the world, and the claim cannot be assessed without knowing how the data
was obtained, what population it represents, and what was left out of it. Provenance is the record
that makes those questions answerable later, by someone who was not there. Its absence is not
neutral: a model trained on data whose exclusions nobody recorded is a model whose blind spots
nobody can enumerate.

Source: item 3 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every dataset used to train, validate, evaluate, or calibrate a model, including
datasets assembled by joining or filtering others. A dataset obtained wholesale from a third party
is in scope — provenance then includes the acquisition and what the supplier documented.

Applicability is proposed by the `data-artifacts` and `training-code` triggers. It is not proposed
by the presence of a data file alone: a repository containing a fixture CSV used by tests holds no
dataset in this sense, and declaring the rule not-applicable with that reason is the correct
outcome.

## Requirements

### R1 — Provenance is recorded and travels with the dataset

**Every dataset MUST have a written record of its origin, and that record MUST be discoverable from
the dataset rather than only from the memory of whoever built it.** At minimum the record states
where the data came from, when it was obtained or generated, what real-world population or process
it represents, and what each row is.

A dataset card committed alongside the data, or a manifest the loading code names, both satisfy
this. A description in a chat log, a notebook cell that has since been re-run, or an author's
recollection do not, because none of them survives the author leaving.

### R2 — The collection process is described, not just the result

**The record SHOULD describe how the data was collected**, because the collection mechanism
determines the biases the dataset carries. Data gathered from users who completed a flow excludes
those who abandoned it. Data logged only when a downstream system was available excludes the
periods it was down — which are frequently the periods that matter.

The practical test: could a reader predict which populations are under-represented without
inspecting the data? If not, the description is a summary rather than a provenance record.

### R3 — Exclusions are documented, never silent

**Every exclusion applied to a dataset MUST be recorded with its rule and its effect.** An
exclusion is any operation that removes observations: dropping rows with missing values, filtering
outliers, restricting to a date range, removing a segment, deduplicating.

Each exclusion changes what the model is being asked to predict. Dropping rows with missing values
does not remove noise; it removes the population for whom that field is missing, and produces a
model that has never seen them and will nonetheless be asked about them. The record states the
rule, the count removed, and the proportion — the proportion because a rule that removes one
percent and a rule that removes forty percent are different decisions wearing the same sentence.

The record is required whether or not the exclusion was reasonable. Most are. The failure this
requirement prevents is not unreasonable exclusion but undisclosed exclusion, which is
indistinguishable from an oversight and cannot be reasoned about when the model behaves strangely
on the excluded population.

### R4 — Derived datasets inherit and extend provenance

**A dataset built from other datasets MUST identify its inputs by version and record the
transformation that produced it.** Provenance that stops at the first join is provenance for a
dataset nobody trained on. This connects to [Standard 4](04-dataset-versioning.md), which supplies
the identifiers, and [Standard 17](17-feature-lineage.md), which extends the same reasoning to
individual features.

## Prohibitions

### P1 — No fabricated datasets

Reproduced verbatim from the source:

> fabricate datasets

Data that was not collected must not be presented as though it were. This prohibits inventing
records, and it equally prohibits the quieter forms: presenting synthetic or simulated data as
observed without saying so, filling gaps by generation and describing the result as measured, and
reporting a dataset size that includes rows never obtained.

Synthetic data is legitimate and often necessary. What makes it fabrication is the description, not
the generation — synthetic data disclosed as synthetic is a documented methodological choice, and
the same data described as collected is a false claim about the world that every downstream
conclusion inherits.

This prohibition is **non-exemptible**. An approved exception permitting fabricated data is written
permission to deceive, and no project circumstance changes that.

### P2 — No silent removal of difficult observations

Reproduced verbatim from the source:

> silently remove difficult observations to improve metrics

The prohibited act is the combination: removal, driven by the metric, undisclosed. Removing hard
cases raises every score while removing exactly the population the model most needs to handle, and
the resulting number describes performance on a problem nobody has.

This is distinguished from R3 by intent and disclosure. R3 requires that exclusions be recorded;
this prohibits exclusions selected because of what they do to the result. An exclusion applied
before results were seen, justified by a stated rule, and recorded with its effect is a
methodological decision. The same exclusion applied after a disappointing evaluation, and not
mentioned, is this prohibition.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1, R2 | A dataset card or provenance document naming origin, collection, population, and unit of observation | `scan` looks for `DATASET.md`, `DATA_CARD.md`, or a document carrying `## Provenance` / `## Collection` headings | Partial — presence of the document, never the truth of its contents |
| R3 | An `## Exclusions` section listing each rule with counts and proportions | Same document scan | Partial — the heading's presence is structural; whether it lists *every* exclusion cannot be established from the repository |
| R4 | Input dataset versions named in the derived dataset's record | Manual review | None |
| P1 | Attestation that the data is what its documentation says it is | Manual review only | None |
| P2 | Attestation that exclusions were rule-driven and pre-specified, with the record from R3 as supporting evidence | Manual review only | None |

**What the automated check cannot establish.** The absence of a documented exclusion is
statically indistinguishable from the absence of an exclusion. A scan can confirm an exclusions
section exists; it cannot confirm the section is complete, and it can never detect the exclusion
that was applied and not written down — which is precisely the case P2 describes. Compliance with
R3 and P2 rests on attestation, and the scan's contribution is to make the missing document
visible.

## Additions this standard makes beyond the source

- The requirement in R3 to record the *count and proportion* removed, not merely the rule. The
  source requires documentation of provenance and prohibits silent removal; the proportion is this
  standard's addition, on the reasoning that a rule removing one percent and a rule removing forty
  percent are materially different decisions expressed identically.
- The distinction in P2 between a pre-specified exclusion and a metric-driven one. The source
  prohibits silent removal to improve metrics; separating intent from disclosure is this
  standard's interpretation, made explicit because otherwise every legitimate filter reads as a
  possible violation.
- R4's extension of provenance to derived datasets, and the treatment of synthetic data in P1.
  Both are this standard's reasoning about cases the source does not name.
- The observation that dropping rows with missing values removes a population rather than noise.

## Relationship to other standards

[Standard 4](04-dataset-versioning.md) supplies the identifiers that make R4's references to input
datasets stable. [Standard 17](17-feature-lineage.md) applies the same reasoning at feature
granularity, and the two together are what make the availability question in
[Standard 7](07-feature-availability.md) answerable. [Standard 25](25-model-limitations.md) is
where the populations excluded here must reappear as stated limitations — an exclusion recorded in
provenance and omitted from the limitations is a known blind spot that the model's users never
learn about.

## Implementation

**Partially checked.** `standards scan` reports `data-card-missing` when no provenance document or
provenance-shaped heading is found in a repository whose data artifacts trigger the rule. That
finding is structural: it establishes that documentation is absent, which is a real fact and a
useful one.

Nothing checks that a present document is accurate, complete, or current. Nothing detects an
undisclosed exclusion — no mechanism could, since the evidence of the removal is precisely what was
removed. P1 and P2 therefore report `not-evaluated` rather than passing, and are satisfied only by
attestation recording that a human examined the data pipeline and what they found. This is not a
gap awaiting a better scanner; it is the honest boundary of static analysis, recorded in
[ADR 0004](../artifacts/adr/0004-honest-automation.md).
