# Standard 9 — Target Leakage

The most damaging leak is the one that looks like a discovery. A feature that contains, encodes, or
derives from the thing being predicted produces an implausibly strong model, and implausibly strong
results are congratulated rather than investigated. The failure this standard prevents is a project
that ships a model whose headline feature is the answer written in a different notation — often a
field the operational system populates only once the outcome is known, which is empty at every real
prediction and full in every training row.

Source: item 9 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every feature of every supervised model, including features inherited from an upstream
feature store, purchased from a vendor, or copied from a previous project. Scope is per feature
rather than per dataset, because target leakage is a property of one column's relationship to one
label and survives every transformation applied to the table around it.

Applicability is proposed by the `training-code` and `data-artifacts` triggers. Unsupervised work
has no target and is out of scope; a supervised model with few features is not, since the
proportion of leaking columns is irrelevant when one of them is sufficient.

## Requirements

### R1 — Each feature's population time relative to the label is recorded

**For every feature, the project MUST record when its value becomes known relative to the moment
the label becomes known, and MUST identify any feature populated at or after that moment.** This is
the single question that separates target leakage from legitimate predictive strength, and it
cannot be answered by looking at the data — a column populated after the outcome looks exactly
like a column populated before it, once both are in the same row.

A field that is null until a case closes, a status that only takes certain values post-resolution,
a timestamp written by the process that produces the outcome: each is answered by knowing the
operational system, which is why this is a recorded human conclusion rather than a computed
property.

### R2 — Features derived from the target or from its generating process are removed or justified

**Any feature that contains, encodes, or is computed from the target — directly, through an
aggregate whose window includes the label, or through an identifier assigned by the process being
predicted — MUST be removed, or retained only with a written justification establishing that the
same value will be available, with the same meaning, at prediction time.**

The justification is genuinely available in some cases: a feature computed from the target's
history over a strictly prior window is not leakage, provided the window's boundary is enforced
rather than assumed. [Standard 6](06-temporal-splitting.md) governs that boundary, and the
justification should name it.

### R3 — Implausibly strong signal is investigated before it is reported

**Where a single feature, or a very small set, produces performance close to perfect or far above
the established baseline, the project MUST investigate the feature's semantics before reporting the
result.** Near-perfect performance on a problem that is hard for humans is evidence about the
pipeline, not about the model.

The investigation is a specific act: identify the strongest contributors, state what each means in
the operational system, state when each is populated, and record the conclusion — including the
conclusion that the signal is real. The comparison against a baseline comes from
[Standard 2](02-baseline-models.md), which is what makes "far above" a measurable phrase rather
than an impression.

### R4 — The review is performed by someone who understands the data, and is recorded as such

**A named reviewer with knowledge of the source systems MUST examine the feature set for target
leakage, and the review MUST be recorded with the reviewer, the date, and the features examined.**
Detection here requires knowing what a column means and when it is written, which is knowledge held
by people rather than by repositories.

Recording who reviewed and against what matters because the conclusion expires: a feature set that
was clean when reviewed is not clean after an upstream table gains a column, which is why the
attestation mechanism pins the files reviewed and goes stale when they change.

## Prohibitions

### P1 — The target never enters the features

Reproduced verbatim from the source:

> leak target information into features

The prohibition covers the whole family, not just the literal copy: the label under another name,
a transformation of it, an aggregate computed over a window that includes it, a field the outcome
causes to be written, an identifier allocated by the process being predicted, and a proxy so tightly
coupled to the outcome that predicting one is predicting the other.

This prohibition is **non-exemptible**. A model whose features contain the target is invalid rather
than non-compliant — it has learned to read the answer rather than to predict it, and waiving the
rule does not make the model work; it only authorises reporting the score.

The correct response to a genuinely useful post-outcome field is not an exception but a change of
problem. A field available only after resolution can support a different model, formulated under
[Standard 1](01-problem-formulation.md), predicting something later in the process. That model may
be valuable. It is not this one.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A per-feature record of population time relative to the label, flagging any at-or-after feature | Manual review | None — reports `not-evaluated`; remediation is an attestation |
| R2 | Removal of the identified features, or a written justification naming the enforced window boundary | Manual review | None — `not-evaluated` |
| R3 | A recorded investigation of the strongest contributors, with the baseline comparison from [Standard 2](02-baseline-models.md) | Manual review | None — `not-evaluated` |
| R4 | An attestation naming the reviewer, the date, and the feature definitions examined, pinned by digest | Manual review | None — `not-evaluated`, becoming `attested` on a valid, unexpired attestation |
| P1 | The R1 record plus the R4 attestation, together stating that no feature carries target information | Manual review only | None — `not-evaluated` |

**Why nothing automated applies here.** The relationship between a feature and a target is
semantic. A name-similarity heuristic fails in both directions constantly — `outcome_score` may be
an unrelated legacy column and `field_47` may be the label — and a correlation heuristic cannot
distinguish leakage from a feature that is genuinely and legitimately predictive, which is the
distinction the entire standard is about. Worse, either check would produce a pass, and a pass here
reads as "no target leakage", a claim no static scan can make. Deliberately building nothing is
recorded in [ADR 0004](../artifacts/adr/0004-honest-automation.md), which lists target leakage from
feature names or correlations among the checks considered and rejected. Every rule here is
satisfied by attestation, and the attestation's value comes from naming the reviewer and pinning
what they read.

## Additions this standard makes beyond the source

- R1's framing of population time as *the* discriminating question, and the requirement to record
  it per feature. The source describes a field populated only after the outcome is known as one of
  several difficult cases; elevating that timing question to a recorded per-feature obligation is
  this standard's structure.
- R3, the requirement to investigate implausibly strong signal before reporting it. The source does
  not mention suspicious performance as a trigger for review. It is added because the surprising
  result is usually the only symptom target leakage produces before deployment, and because the
  incentive at that moment runs the wrong way.
- R4's requirement that the reviewer be named and the review dated and digest-pinned. The source
  says detection is a human activity; requiring that the activity leave an expiring record is this
  standard's addition.
- The disposal route in P1 — that a genuinely useful post-outcome field indicates a different
  problem formulation rather than an exception. The source states the prohibition only.
- The enumeration of the leakage family in P1 (renamed label, transformation, window-spanning
  aggregate, outcome-caused field, process-assigned identifier, tightly coupled proxy) extends the
  three examples the source gives.

## Relationship to other standards

[Standard 8](08-leakage.md) is the general case; this standard is its sharpest instance and shares
its counterfactual test. [Standard 17](17-feature-lineage.md) supplies the derivation and timing
records that make R1 answerable at all — without lineage, the population-time question is answered
by reading pipeline code, which is why it usually goes unanswered.
[Standard 7](07-feature-availability.md) catches the same defect from the serving side, since a
post-outcome field is typically also unavailable at inference.
[Standard 6](06-temporal-splitting.md) enforces the window boundary that R2's justification depends
on, and [Standard 2](02-baseline-models.md) supplies the reference point that makes R3's
"implausibly strong" a comparison rather than a feeling.

## Implementation

**Not checked automatically.** No detector is bound to this standard, and this is the clearest case
in the catalog where building one would be a mistake rather than an omission. The information that
would settle any rule here — what a column means and when the operational system writes it — is
not in the repository, and a scan over names or correlations would answer a different question
while producing an output that reads as an answer to this one.

Every rule and the prohibition report `not-evaluated`: no mechanism can establish them from
repository text, so the remediation is human judgement recorded as an attestation rather than
further evidence-gathering. The weight this places on the attestation mechanism is deliberate and
is discussed in [ADR 0004](../artifacts/adr/0004-honest-automation.md) — a reviewer, a date,
written evidence, and a digest that expires the approval when the feature definitions change is
where the weight belongs. The alternative was to put it on a regular expression.
