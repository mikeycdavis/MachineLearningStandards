# 0011 — The catalog states a rule's level; prose states the rule

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Project owner

## Context

Review finding N6 was dispositioned `SUPPORTED_FOR_CHANGE` and then could not be given a release
class, because the class turns on a level this repository states twice and differently.
[The re-disposition](../review/2026-08-26-n6-redisposition.md) recorded the mismatch and stopped
there deliberately:

> The prose and the catalog disagree about Standard 20's level today, before N6 changes anything.

Standard 20 R1 and R3 are written as `MUST` and `MUST NOT`. The whole of Standard 20 is carried by
one catalog entry, `evaluation.uncertainty-reported`, at `kind: recommendation`,
`level: recommended`, `severity: warning`. `design/architecture.md` maps `kind: recommendation` to
*"should"* and *"should normally"*. Semantic versioning here names *"raising a rule's level"* as
MAJOR, so a rule with two levels has no release class.

The question is corpus-wide and is settled here as such. It is not a ruling about Standard 20.

### What the corpus actually contains

Measured across all 25 standards and all 46 rules, at `2ee4a11`:

| | |
| --- | --- |
| Prose `### R` / `### P` sections | 135 |
| Sections with a catalog entry | 46 |
| Sections with **no** catalog entry | **89** |
| Entries whose prose modal and catalog `kind` agree | 41 |
| Entries where prose says `MUST` and the catalog says `recommendation` | **5** |

The 89 are not defects. The catalog has never claimed to be a one-to-one projection of the prose —
`frameworkCoverage` exists precisely to report how many rules the catalog carries and how many of
those the evaluator examines, beside the verdict rather than inside it. A standard may state an
obligation the framework does not carry as a rule, and most of them do.

The five are the disagreement, and they are the same shape every time:

| Standard | Section | Catalog entry |
| --- | --- | --- |
| 11 | R2 | `evaluation.class-imbalance-addressed` |
| 16 | R1 | `reproducibility.seeds-recorded` |
| 18 | R2 | `evaluation.ablation-performed` |
| 19 | R3 | `evaluation.improvement-classification` |
| 20 | R1 | `evaluation.uncertainty-reported` |

Five of the seven recommendations in the catalog have `MUST` prose. The other two — Standard 11 R6
(*"resampling SHOULD NOT be applied"*) and Standard 15 R3 (*"SHOULD be runnable top to bottom"*) —
agree with their entries. So the corpus-wide pattern is agreement, and the five are outliers rather
than a convention.

## Decision

**The catalog states a rule's normative level. The prose states the rule.**

Where a standard's prose and its catalog entry disagree about level, **the catalog governs** and the
prose is in error. Where they disagree about anything else — what the obligation means, what
satisfies it, what qualifies it, what it excludes — **the prose governs**, and the catalog's
`description`, `evidenceExpected` and `remediation` are a summary of it rather than a competing
definition.

Three consequences are part of the decision, not commentary on it:

1. **Authority is not correctness.** This settles which text a reader consults to learn a level. It
   does not assert that the level found there is the right one. A rule whose catalog level is wrong
   is fixed by changing the catalog and updating the baseline deliberately — which is MAJOR when it
   raises the level — not by treating the prose as an override.
2. **A prose section with no catalog entry has no level.** It is normative writing the framework
   does not carry as a rule, it produces no verdict, and it is not weakened by anything the catalog
   does or does not say.
3. **Consistency between the two remains an invariant worth holding**, and is not the answer to
   the authority question. See *Alternatives*, option 3.

### Applied to Standard 20 R3

**R3 has no catalog entry of its own.** The single Standard 20 entry is bound to `requirement: "R1"`.
R3's claim survives in the catalog only as a trailing clause of that entry's `description`:

> … and an unquantified difference is not described as an improvement.

So, precisely: R3 is not separately represented; the framework carries R3's claim inside R1's rule;
and the level at which it carries it is **`recommended`**. That is R3's present normative level
under this decision. Its prose `MUST NOT` is the erroneous half of the pair, and correcting it is
not undertaken here.

## Alternatives considered

**1. Prose is authoritative.** Rejected, and the reason is mechanical rather than aesthetic.
`scripts/integrity.mjs` locks `{kind, level, severity, verification, assurance, nonExemptible}` in
the **catalog** against `artifacts/catalog-baseline.json`. It never opens `standards/`. If prose
were authoritative, that guard would protect a copy: a rule could be weakened by editing one word
of a standard — `MUST` to `SHOULD` — the baseline would not move, `npm run integrity` would exit 0,
and CI would stay green. That is exactly the route the guard exists to close, described in its own
header as *"a required rule fails, a deadline is close, and the cheapest path to green is to edit
the rule rather than the work."* Prose authority reopens it through a door nothing watches.

There is a second, independent objection. The evaluator reads catalog fields and cannot read prose,
so a prose-stated level would be a level nothing acts on. The concept investigation in
`design/architecture.md` rejects exactly that: *"does this concept change what the system concludes,
or is it a label on something another concept already decides?"*

**2. The catalog is authoritative.** Adopted. It is what the architecture already says — *"The
catalog defines rule identity and metadata. The policy defines applicability and local settings.
The evaluator produces evidence. None of the three may redefine the others"* — and `level` is
metadata. It is consistent with three existing rulings that all run the same way: `severity` is
catalog-owned and policy may not override it; every rule **count** is derived from the catalog and
*"never written into prose,"* because *"a number typed into a README or a standard is a second
definition"*; and rule inheritance was rejected because *"rules would then have two definitions."*
This decision adds no new principle. It states one the repository has been applying and had not
been asked to write down.

Its cost is real and is accepted: five standards presently assert `MUST` about claims the framework
will only warn on, and under this decision those five are defects in the prose rather than a
deliberate two-tier design.

**3. Neither alone is authoritative; consistency between them is the invariant.** Rejected **as an
answer**, adopted as a corollary. Consistency is a property, not an authority. When the two texts
disagree — and they do, in five places, today — an invariant that says they must agree reports that
something is wrong without saying which side to change, so it cannot answer a release-class
question. It needs a tiebreaker, and the tiebreaker is option 2. Held as a corollary because the
repository already treats agreement between representations as mechanical rather than hoped-for:
ADR 0001 records *"filename, category field, and id prefix always agree"* as a defect deliberately
not inherited, `assertBindings` exists so *"two files"* cannot *"disagree about what `level` a rule
has"*, and `fidelity.mjs` exists because a document that claims verbatim quotation should be held to
it. Two of the three provenance links — spec to prose, catalog to baseline — already have a guard.
The prose-to-catalog link does not.

**4. Authority differs by concern, with a precise boundary.** The candidate boundary was that prose
owns the obligation on the practitioner while the catalog owns the level at which the framework
acts. Attractive, because it would make the five cases deliberate. **Falsified by measurement.**
Twelve catalog `requirement` entries carry `verification: manual-review` with `assurance: none` —
the identical posture to the five prose-`MUST` recommendations. `framing.problem-documented`
(Standard 1) is manual-review, assurance none, and a **requirement**;
`evaluation.uncertainty-reported` (Standard 20) is manual-review, assurance none, and a
**recommendation**. If the boundary existed, those two would be classified alike. They are not, and
no other line separates the five from the forty-one.

It fails a second test as well. The architecture already assigns "how strongly the framework acts"
to a different field: *"`level` is the obligation's strength as a policy setting, `severity` is how
loudly a finding reports."* Splitting `level` so that prose owns one sense and the catalog another
gives one field two meanings, which is the redundancy the concept investigation rejects.

## Consequences

**N6's release class is now determined.** R3 is carried at `recommended`, so the minimal faithful
implementation of N6 — widening the antecedent of a claim the catalog holds as part of a
recommendation — adds no requirement and no prohibition, raises no level, removes no rule, and
touches nothing on the frozen surface. All four MAJOR clauses are tested and all four fail, so it is
**MINOR**. Writing N6 instead as a new `requirement` remains available and would be MAJOR, but that
would be a larger change than N6 — it would also resolve Standard 20's inconsistency in the prose's
favour — and is not what N6 supports.

**The corpus is internally inconsistent in five places**, and this decision names them without
repairing them. Repair is a normative act with a direction to choose per rule, and choosing five
directions is not something a decision about authority is entitled to do implicitly.

**The unguarded link is now visible.** Nothing compares a standard's modal verb to its catalog
entry's kind. Whether that becomes a mechanical check is not decided here.

**Nothing is released by this record.** No standard, rule, baseline, fixture, version file or
changelog entry is changed by it, and a release class is evidence about a future vehicle rather
than authorisation to cut one.
