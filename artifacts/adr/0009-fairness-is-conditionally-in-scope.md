# 0009 — Fairness and protected-group performance are conditionally in scope

- **Status:** Accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner

## Context

Review finding N4 observed that this corpus says nothing about disparate performance across
protected or vulnerable groups, and that the silence had never been decided. The line was drawn
implicitly by what the source prompt happened to enumerate. Its disposition was `DEFERRED`, with
the record explicit that a scope decision about the corpus's subject must precede any drafting:
*not a drafting task.*

Until now the absence was **neither an accepted exclusion nor an identified gap** — it was
undetermined, which is the one state that cannot be acted on. A reader could not tell whether
fairness was out of scope on purpose or missing by accident, and both readings had support.

The counterexample the review established is what makes the naive answer wrong. A universal
`MUST report performance across protected groups` is:

- **unsatisfiable** where the attributes are not collected;
- **irrelevant** where the system affects no people;
- **sometimes a privacy harm to satisfy**, because collecting a protected attribute in order to
  measure fairness against it is itself a real cost.

Unsatisfiable requirements get waived. A corpus that routinely produces waivers teaches the
projects adopting it that waiving is normal, which damages every other requirement in it. So the
scope question could not be answered by drafting the obvious rule and seeing whether it survived.

Note what is already settled and is not at issue here: Standard 25 P1 prohibits **hiding** a known
poorly performing segment. What was undetermined is whether the corpus requires a disparity to be
**constructed and looked for** in the first place.

## Decision

**Fairness and protected-group performance are within the normative scope of
MachineLearningStandards, conditionally** — where the system affects people and relevant group
analysis is lawful, meaningful, and supported by available data.

The recorded boundary:

- **In scope** when an ML system makes, informs, ranks, allocates, denies, recommends, or
  materially influences outcomes affecting people or identifiable groups.
- **Potentially applicable** when performance differences across meaningful groups could alter
  the interpretation of model quality or safety.
- **Not automatically applicable** to ML systems with no meaningful human or group impact.
- **Never** require collecting protected attributes solely to satisfy the standard where doing so
  would be unlawful, inappropriate, privacy-invasive, or otherwise unjustified.
- **Absence of group attributes is not evidence that fairness is irrelevant.** The two are
  routinely confused, and the confusion runs in the direction that makes the question disappear.
- Standard 25 P1 continues to carry the narrower integrity rule: a known poorly performing
  segment must not be hidden.

## What this decision does not do

It authorises no normative text. No requirement, prohibition, or recommendation enters the catalog
because of it, and the catalog baseline and acceptance lock are unchanged. This is a statement
about what the corpus is *for*, not about what it *says*.

In particular it does not authorise `MUST report performance for protected groups`. That rule
fails every counterexample above, and shipping it would convert this decision into the drafting
task the disposition record said it was not.

## Consequences

The absence of fairness standards is now an **identified gap** rather than an unexamined one.
That is a change in epistemic state, not in the corpus, and it is the whole of what was decided.

The hard work now sits where it belongs: **the applicability and evidence model, not the
normative sentence.** A future requirement must be able to distinguish a high-impact human-facing
system from one where protected-group analysis is irrelevant, unavailable, or itself harmful — and
it should govern whether relevant disparities must be *looked for and reported*, not merely
whether observed ones may be concealed. Standard 25 P1 already covers concealment; a rule that
only restated it would add nothing.

Any such requirement is a separately justified candidate with its own evidence. It is deliberately
not filed as work by this decision: the justification for drafting it is not established by having
decided that the subject is in scope, and filing it now would turn "this is in scope" into "this
is scheduled" without anything having been demonstrated in between. This record is the trigger's
home until that evidence exists.

Because no normative text changed, this carries no release. Under the policy in `CHANGELOG.md` a
MAJOR release is triggered by adding a requirement or prohibition; a scope decision that adds
neither is not a version of anything.

## Alternatives considered

**Out of scope.** Legitimate, and it would have completed the decision equally well — the absence
would have become an accepted exclusion and the corpus would have been honest about its edges. It
was rejected because the exclusion could not be justified on the merits: an ML corpus that
governs leakage, calibration, drift, and model limitations, and that already prohibits concealing
a bad segment, is plainly in the business of how a model behaves for the people it affects.
Drawing the line just short of that would have been drawing it where the source prompt's
enumeration happened to stop.

**In scope, unconditionally.** Rejected on the counterexamples. It is the version that produces
routine waivers, and the damage a waived requirement does is not confined to itself.

**Leave `DEFERRED`.** Rejected because deferral had stopped doing work. The question was ready to
be decided and the only thing being preserved was the ambiguity.
