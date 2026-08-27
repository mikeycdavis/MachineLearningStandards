# 0013 — The prose-to-catalog link gets a guard, and it reports rather than adjudicates

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Project owner

## Context

Three links carry a claim from one representation to another in this repository. Until now only
two were mechanical:

| Link | Guard |
| --- | --- |
| spec → prose | `scripts/fidelity.mjs` — every "reproduced verbatim" claim, character for character |
| catalog → baseline | `scripts/integrity.mjs` — `{kind, level, severity, verification, assurance, nonExemptible}` |
| **prose → catalog** | **nothing** |

`integrity.mjs` never opens `standards/` and `fidelity.mjs` never opens `rules/`, so nothing
compared a standard's own normative sentence to its catalog entry's kind. The cost was measured,
not imagined: five rules stated `MUST` in prose while their entries said `recommendation`, from
`1.0.0` until [ADR 0012](0012-three-prose-modals-are-wrong-and-two-catalog-levels-are.md) decided
their repair, and no run ever went red.

[ADR 0011](0011-the-catalog-states-a-rules-level.md) settled which representation governs. That
made a guard possible; it did not make one exist. This record is the guard's design.

## Decision

`scripts/levels.mjs` compares every requirement and recommendation entry against the prose section
it names, and is a pipeline gate. Five design decisions carry it, each with an alternative that was
considered and rejected on measurement rather than taste.

### 1. It walks catalog → prose, never the reverse

Every entry carries `standard` and `requirement`, so the target section is **named and not
inferred**. The rejected alternative is the obvious one — walk the prose and check each section has
an entry. That would report most of the corpus as broken: sections with no catalog entry outnumber
those with one, and their absence is not a defect. The catalog has never been a projection of the
prose, and `frameworkCoverage` exists precisely to report the shortfall beside the verdict rather
than inside it.

The direction is what makes this sound. Unrepresented sections are out of scope **by
construction** — the walk never reaches them — rather than by an exclusion someone could relax.

### 2. It binds to the section's normative sentence, not to modal tokens

A requirement or recommendation section opens with its obligation in bold. That sentence, and
nothing else in the section, states the strength. Everything else — a quoted source block, a
contrasting example, a worked illustration, a cross-reference to a stronger rule — is prose *about*
the obligation and is not evidence of its level.

This was learned the expensive way. When the five disagreements were first measured by hand, a
scan of whole section bodies reported seven, and two were false: the extra modal lived in a
quotation or an aside. The implementation therefore strips fenced blocks and blockquote lines
before looking, and takes the first bold span that survives.

### 3. Prohibitions are excluded by kind, and nothing here is evidence about their level

A `## Prohibitions` section quotes its must-never bullet verbatim and states no bolded modal of its
own. Applying the test to them is not a judgement call — it was measured: **21 of 21 prohibition
entries become findings**, which is not a check but noise that someone eventually switches off.

They are not thereby unguarded. Their prose is held to the source by `fidelity.mjs`, which is a
different mechanism for a different claim. What does not exist is a *level* convention for a
prohibition section, and inventing one inside a gate would be deciding a normative question in the
place least able to explain itself. Establishing one is separate work and has not been done.

The exclusion is by `kind`, before any text is read, so nothing a prohibition's prose happens to
say can be read as level evidence in either direction. A second barrier stands behind it: the
expected-modal table has no prohibition row, so even with the exclusion removed the check reports
`unknown-kind` rather than guessing an expectation.

### 4. An unresolvable anchor is a finding, never a skip

An entry naming a standard or a section that does not exist has lost its subject. Silence about
that is how the previous gap survived, so it is reported — as are a section with no normative
sentence and a normative sentence with no modal. A check that quietly passes what it cannot read
is worse than no check, because it also reports success.

### 5. It reports agreement and never decides which side is correct

The check says the two representations disagree. It does not say which is wrong. That is ADR 0011's
decision for the general rule and ADR 0012's for each individual case, and a gate that picked a
side would be making a normative decision in a place with no room to record its reasoning. A test
asserts the output contains no such adjudication.

### No allowlist

The expected steady state is zero disagreements, and it is presently met: **26 entries checked, 0
disagreements**. A rule permitted to disagree would be a rule whose level depends on which file you
opened, which is the condition this exists to end. There is nowhere to record an exemption, and a
test asserts there is nowhere.

## Where it sits

`levels` runs fifth in `scripts/ci-pipeline.mjs`, immediately after `fidelity`, so the pipeline
walks the provenance chain in its own order: the enumeration, then spec → prose, then prose ↔
catalog, then catalog → baseline, then what the rules accept. `STAGES` remains the single
definition of that order — the GitHub workflow invokes the pipeline rather than re-declaring the
checks, and a test asserts it does not re-declare this one.

It exits 1 on a disagreement, not 3. Exit 3 means `BLOCKED_BY_INVARIANT`, and asserting that a
disagreement is an attempt to weaken a standard would be the adjudication decision 5 refuses.

## Consequences

**The link that let the last defect through is now watched.** It cannot catch the five it was built
because of — they were repaired first — but a sixth cannot appear silently.

**A convention became load-bearing.** "The normative sentence is the first bold span in the
section" was a writing habit; it is now something a gate depends on. A standard that states its
obligation some other way will be reported rather than misread, which is the right failure, but it
is a constraint on how standards may be written and is recorded here as one.

**Prohibitions remain unchecked for level**, and that is a stated limit rather than an oversight.
If a prohibition's level ever drifts from its prose, nothing here would notice.

**Nothing is released by this record**, and no rule, baseline, version file or changelog entry
changes with it.
