# Standard 19 — Model Comparison

Two numbers placed side by side make a claim, and the claim is usually stronger than the evidence
behind it. This standard prevents several failures that share one appearance: comparing models that
were never evaluated under the same conditions, mistaking a difference within the noise for a real
one, and treating a real but tiny difference as a reason to ship something more complex. It is also
where the system's most serious prohibition lives, because an evaluation metric that was invented
cannot be corrected by any of the above.

Source: item 19 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every comparison whose outcome informs a decision: candidate model against candidate
model, model against baseline, model against the version currently in production, ablation arm
against full model, and a retrained model against the one it would replace. It covers comparisons
made inside the project and comparisons reported outside it, and the reporting case is the stricter
one, because an external reader cannot inspect the conditions.

Applicability is proposed by the `ml-footprint` and `training-code` triggers. It is not waived by
informality: a comparison made in a message and acted on is a comparison.

## Requirements

### R1 — Compared models were evaluated identically

**Every model in a comparison MUST have been evaluated on the same dataset version, the same split,
the same metric at the same threshold, and under the same preprocessing discipline.** Any difference
in these is a difference in the quantity being measured, and the resulting gap is partly or wholly
an artefact of the protocol rather than of the models.

The condition is exact, not approximate. "The same data" means the same version identifier, as
supplied by [Standard 4](04-dataset-versioning.md); a dataset that was refreshed between the two
evaluations is a different dataset even where nothing about it was intended to change. "The same
split" means the same partition assignment, not the same split ratio produced by a second run of the
same seed-less procedure.

Where identical evaluation is impossible — a competitor's published figure, a legacy model whose
test set no longer exists — the comparison is reported with the incompatibility stated, and no
improvement is claimed from it.

### R2 — The comparison protocol is recorded

**The dataset version, split identifier, metric, threshold, population, and evaluation date MUST be
recorded for every arm of the comparison, in the document that presents it.** R1 is a condition; R2
is what makes it checkable by anyone other than the person who ran it.

A comparison table without this record asks the reader to trust that the conditions matched. That
trust is exactly what the standard exists to replace, and its absence is the ordinary way an
incompatible comparison survives review — not by anyone asserting the conditions matched, but by
nobody being able to ask.

### R3 — Classify every claimed improvement

The source requires the system to distinguish three kinds of improvement.

Reproduced verbatim from the source:

> statistical improvement
> practically meaningful improvement
> production-relevant improvement

**Every claimed improvement MUST be stated as which of these three it is, and one kind MUST NOT be
presented as another.** The three are not degrees of the same thing; they answer different questions
and can hold independently in any combination.

A **statistical improvement** is a difference unlikely to be noise. It is established by the
uncertainty machinery of [Standard 20](20-uncertainty.md) — an interval, a paired test, variance
across folds or seeds — and it says only that the difference would probably reappear if the
experiment were repeated. It says nothing about size.

A **practically meaningful improvement** is one large enough that the decision the model feeds
changes. Its threshold comes from the problem, not the statistics: how many more cases are caught,
how many fewer analysts are needed, how much cost moves. A difference can be overwhelmingly
statistically significant on a large test set and practically meaningless because nothing downstream
behaves differently at that magnitude. This is the kind most often skipped, because significance is
computable and meaningfulness requires knowing what the model is for.

A **production-relevant improvement** is one that survives the conditions of production: the latency
budget, the drift between the evaluation period and the serving period, and the feature availability
that evaluation did not test. A model that wins on held-out data using a feature that arrives two
hours late, or that takes four times the inference time, or that was validated on a period whose
input distribution has since moved, has not improved anything that will happen.

Presenting one kind as another is the violation. "Statistically significant" reported as "better"
implies meaningfulness; a meaningful offline gain reported as "improves the service" implies
production relevance. Where a kind has not been assessed, that is stated rather than assumed.

### R4 — The selected model is named with its reason

**The comparison MUST conclude with a stated selection and the reason for it, in terms of the
classification in R3.** A comparison that ends in a table leaves the inference to the reader, and
the inference the reader draws is "the highest number won" — which is the reasoning P2 forbids,
performed by someone who never saw the standard.

## Prohibitions

### P1 — Comparisons share data and splits

Reproduced verbatim from the source:

> compare models using incompatible datasets/splits

This is R1 stated as a prohibition, and the two are not redundant: R1 obliges a project to construct
comparisons correctly, and this forbids presenting one that was not. The common forms are rarely
deliberate — a candidate evaluated last quarter against one evaluated after a data refresh, a model
scored on the full test set against one scored after dropping records it could not process, a
published benchmark figure quoted beside an in-house result.

The last is worth naming. An external number computed on someone else's split, with their
preprocessing and their exclusions, is not comparable to an internal one, and placing it in the same
table asserts that it is.

### P2 — Complexity must buy something

Reproduced verbatim from the source:

> declare a more complex model better merely because it has a slightly higher score

*Merely* and *slightly* both bind. A more complex model that wins substantially, or that wins by a
margin shown to be meaningful and production-relevant, is not covered — this is not a prohibition on
complexity. It forbids the specific inference from a small score advantage to a verdict of "better",
made without accounting for what the complexity costs.

The costs are real and are borne after the decision: inference latency, more features to keep
available, more ways to fail, a longer path between a bad prediction and an explanation of it. A
comparison that reports only the score has not measured the thing the decision turns on. Where the
margin is small, the honest conclusion is usually that the simpler model is better, and
[Standard 18](18-ablation.md) exists partly to make that conclusion reachable.

### P3 — No fabricated evaluation metrics

Reproduced verbatim from the source:

> fabricate evaluation metrics

An evaluation metric that was not produced by evaluating the model must never be presented as
though it were. This covers invention outright, and it covers the quieter forms: a figure carried
forward from an earlier run and reported against the current model, a number adjusted after the
fact, a metric reported for a configuration that was never actually evaluated, and a placeholder
written during drafting that was never replaced.

The last is not a lesser case. A fabricated number's harm does not depend on the author's intent,
because every downstream decision inherits it identically, and a reader cannot distinguish an
invention from an oversight by looking at the number.

This prohibition is **non-exemptible**. The exception mechanism exists so that a project may
knowingly and temporarily fall short of a rule that applies to it, with an approver and an expiry.
An approved exception to fabricating results is written permission to deceive, and no project
circumstance changes that. `integrity.no-fabricated-evaluation-metrics` carries `nonExemptible:
true`, and a policy that names it in an exception is itself reported as an attempted weakening under
[ADR 0005](../artifacts/adr/0005-integrity-invariant-enforcement.md).

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1, R2 | A comparison table recording dataset version, split identifier, metric, threshold, population, and date per arm | Manual review, supported by the identifiers [Standard 4](04-dataset-versioning.md) requires | None |
| R3 | Each claimed improvement labelled as statistical, practically meaningful, or production-relevant, with the basis for each label | Manual review | None |
| R4 | A stated selection with its reason expressed in R3's terms | Manual review | None |
| P1 | Attestation that every arm shared the recorded conditions, with the R2 record as supporting evidence | Manual review only | None |
| P2 | Attestation that a complexity increase was justified against its cost, not by margin alone | Manual review only | None |
| P3 | Attestation, naming the reviewer, that every reported figure traces to a recorded evaluation run | Manual review only | None |

**Why nothing automated applies here.** Nothing in a repository distinguishes a real number from an
invented one, which places P3 permanently outside automation — the strongest prohibition in this
standard is also the one with the least mechanical support, and pretending otherwise would be the
false confidence the design forbids. R1 and P1 are barely better: a scanner can read two figures in
a table and has no access to the runs that produced them, so an incompatible comparison and a valid
one are the same text. R3's classification is a judgement about a decision context and a production
environment that the repository does not describe. Every rule and prohibition here reports
`not-evaluated`, with the disposition meaning that no mechanism can establish them from repository
text at all — not that evidence is merely missing.

## Additions this standard makes beyond the source

- R2, requiring the protocol to be recorded in the presenting document. The source requires that the
  conditions match; that they must also be written down where the comparison is read is this
  standard's addition, on the reasoning that an unrecorded condition is not reviewable.
- R4, requiring a stated selection with a reason. The source does not address how a comparison
  concludes; this standard's position is that a table without a conclusion delegates the reasoning
  P2 forbids to the reader.
- The explanations of the three kinds of improvement in R3 — noise, decision change, and survival of
  production conditions — are this standard's interpretation. The source names the three and
  requires they be distinguished; the operational content of each is authored here, as is the rule
  that an unassessed kind must be stated rather than assumed.
- The naming of published external benchmark figures as a form of P1, and of unreplaced drafting
  placeholders as a form of P3.
- The observation in P3 that harm does not depend on intent, which is why the placeholder case is
  not treated as lesser.

## Relationship to other standards

[Standard 20](20-uncertainty.md) is this standard's necessary partner: R3's statistical category is
undecidable without it, and P2's "slightly higher" cannot be assessed against a difference whose
noise is unquantified. [Standard 2](02-baseline-models.md) is the comparison case where one arm is
the simplest thing that works, and its improvement claims are classified under R3 exactly as
model-to-model claims are. [Standard 18](18-ablation.md) is the case where the arms are variants of
one model, and it inherits R1 wholesale. [Standard 12](12-metric-selection.md) supplies the shared
metric R1 requires, and [Standard 4](04-dataset-versioning.md) the shared dataset identity.
[Standard 7](07-feature-availability.md) and [Standard 21](21-drift.md) supply two of the three
production conditions R3's third category tests, and [Standard 22](22-retraining.md) applies this
whole standard to the recurring comparison between an incumbent model and its replacement.

## Implementation

**Not checked automatically.** No rule or prohibition in this standard is bound to a detector, and
none will be. Fabrication of any kind was considered during the design and rejected as undetectable
in principle, and comparison compatibility was rejected with it: both would require the auditor to
know what happened outside the repository. The record is
[ADR 0004](../artifacts/adr/0004-honest-automation.md).

`standards explain integrity.no-fabricated-evaluation-metrics` reports the rule as `not-evaluated`
with the reason that automated verification cannot establish that reported metrics were not
fabricated. That wording is deliberate. It does not say the metrics are fine, and it does not say
the check is pending — it says the question is outside what any static mechanism can answer.
Compliance rests on attestation carrying a reviewer, a date, and a digest of the files reviewed, so
that the approval expires when the evaluation report changes. That is a person putting their name to
it, which is the only mechanism that has ever applied to this question.
