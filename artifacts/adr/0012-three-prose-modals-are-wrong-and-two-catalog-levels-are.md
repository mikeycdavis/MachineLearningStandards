# 0012 — Three prose modals are wrong, and two catalog levels are

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** Project owner

## Context

[ADR 0011](0011-the-catalog-states-a-rules-level.md) is fixed input here and is not revisited:

> **The catalog states a rule's normative level. The prose states the rule.**

and, as part of that decision, **authority is not correctness** — it settles which text a reader
consults to learn a level, never whether the level found there is right. ADR 0011 named five rules
whose prose says `MUST` while their catalog entry says `recommendation`, and stopped, because
*"repair is a normative act with a direction to choose per rule."*

This record chooses those five directions. It changes no file: no standard, no catalog entry, no
baseline, no version file, no fixture.

| Standard | Section | Catalog entry | `verification` / `assurance` | In `EVALUATED_RULES` |
| --- | --- | --- | --- | --- |
| 11 | R2 | `evaluation.class-imbalance-addressed` | manual-review / none | no |
| 16 | R1 | `reproducibility.seeds-recorded` | code-analysis / partial | **yes** |
| 18 | R2 | `evaluation.ablation-performed` | manual-review / none | no |
| 19 | R3 | `evaluation.improvement-classification` | manual-review / none | no |
| 20 | R1 | `evaluation.uncertainty-reported` | manual-review / none | no |

### The test that separated them

The five are not alike, and what separates them is a provenance asymmetry the repository already
established. [ADR 0002](0002-the-spec-is-a-derived-enumeration.md) records that the spec is a
*derived* document, and says exactly which of its parts are the brief and which are authored:

> The `## Must-never rules` and `## Evaluation philosophy` sections are byte-identical to the
> prompt's corresponding sections.

> Everything else in the spec — the two to five sentences of normative intent under each item — is
> authored content, and the provenance block says that too.

So the source speaks at two different strengths in two different places, and only one of them is
the brief:

- The brief's **Cover list** names topics and nothing else — *"class imbalance"*, *"random seeds"*,
  *"ablation"*. It carries no modal and assigns no level.
- The brief's **`## Evaluation philosophy`**, reproduced byte-for-byte, is imperative:

  > Require the system to distinguish:
  >
  > * statistical improvement
  > * practically meaningful improvement
  > * production-relevant improvement

  > Require uncertainty around model comparisons where appropriate.

- Each **numbered item's body** — where every one of the five reads *"should"* — is **authored
  derivation**, not the brief.

Two of the five descend from the byte-identical philosophy and quote it under `fidelity.mjs`.
Three descend only from authored item prose. That line, not a preference about strictness, is why
this record splits three one way and two the other. It was not chosen in advance: the measurement
was taken per rule and the same discriminator emerged five times.

## Decision

| Standard | Disposition | Release class of that repair |
| --- | --- | --- |
| 11 R2 | **Soften prose** `MUST` → `SHOULD` | MINOR |
| 16 R1 | **Soften prose** `MUST` → `SHOULD` | MINOR |
| 18 R2 | **Soften prose** `MUST` → `SHOULD` | MINOR |
| 19 R3 | **Raise catalog** to `requirement` / `required` / `error` | **MAJOR** |
| 20 R1 | **Raise catalog** to `requirement` / `required` / `error` | **MAJOR** |

No disposition is `insufficient evidence`. Each rule had a source statement, a catalog entry, a
full prose section and a stated assurance posture available, which is the whole evidence base such
a decision can have.

**Why softening is MINOR and not PATCH.** PATCH is *"corrections that change no conclusion"*, and
that is false here. All three softened rules are `attestable` manual-review rules, satisfied by a
human reviewer reading the prose and recording judgement. Weakening the modal genuinely widens what
that reviewer will accept, which is MINOR's *"widening what is accepted"*. The framework's
mechanical conclusions do not move — but a release class is not allowed to be argued down to the
part of the system that happens to be automated.

---

### 11 R2 — soften the prose

**The exact conflict.** The prose reads **"Metric selection MUST take the measured imbalance as an
input, and the reasoning MUST be recorded."** `evaluation.class-imbalance-addressed` is
`kind: recommendation`, `level: recommended`, `severity: warning`.

**Source-spec evidence.** The brief says only *"class imbalance"*. The single normative statement
anywhere in the chain is authored spec item 11: *"The imbalance should be measured and stated, the
metric chosen in light of it, and any resampling or weighting applied to the training portion only
and disclosed."* No must-never bullet touches it and the evaluation philosophy does not reach it.
`should` is the only modal the source chain contains.

**Why the catalog is right, not merely authoritative.** Two of the three links agree, and the third
is the outlier. Beyond the count, R2 disqualifies itself as a requirement in its own text: *"Which
of these is right depends on the cost of each error type, which is
[Standard 1](../../standards/01-problem-formulation.md)'s output and not this standard's to
assume."* An obligation whose satisfying action is determined by another standard's output, and
which the section says it cannot assume, is not something a verdict can adjudicate. The entry's own
`$assuranceNote` says the same from the other side: *"a check could not even tell whether the rule
has a subject here."*

**Counterexample against raising it.** A balanced binary problem at a 50 percent base rate has no
measured imbalance to take as an input. Under `required` the rule can never be satisfied *and*
never be concluded not-applicable, because the auditor does not read the data — so it sits at
`NOT_EVALUATED` while reading to a human as a requirement. Requirements that cannot be met get
waived, and, as [ADR 0009](0009-fairness-is-conditionally-in-scope.md) established for a different
rule, waiving teaches a project that waiving is normal.

**Normative?** Yes. It changes what the document asks of a reviewer. **Release class: MINOR.**

---

### 16 R1 — soften the prose

**The exact conflict.** The prose reads **"Each stochastic component that affects a reported result
MUST be seeded, and the seed MUST be set explicitly rather than left to a library default."**
`reproducibility.seeds-recorded` is `kind: recommendation`, `level: recommended`,
`severity: warning`.

**Source-spec evidence.** The brief says only *"random seeds"*. Authored spec item 16 says *"Seeds
should be set explicitly and recorded"*, and immediately qualifies it: setting a seed *"is not the
same as achieving"* reproducibility, because *"hardware non-determinism, parallel reduction order,
and unseeded library internals can all defeat it"*.

**Why the catalog is right, not merely authoritative.** This is the only one of the five where the
catalog **states its own level as a reasoned choice** rather than merely holding one:

> It is a recommendation rather than a requirement because it neither guarantees determinism nor is
> always achievable, and because the requirement that actually matters is the configuration record
> it forms part of.

That is not drift; it is a decision recorded at `1.0.0`, and it tracks the spec's own caveat. It is
also verifiable: the strength it declines is not lost but placed one level up.
`reproducibility.experiment-config-recorded` is `kind: requirement`, `level: required`,
`severity: error`, and is in `EVALUATED_RULES`. The corpus already carries this obligation at
requirement level, deliberately, at the point where it means something.

**Counterexample against raising it.** Two, and they cut in opposite directions. A project on
non-deterministic accelerator kernels sets every seed correctly and still cannot reproduce a run —
a `required` seeds rule passes it while it fails at the thing the rule exists for. A project that
sets a seed in a script and records nothing also passes, while remaining irreproducible. Raising
`seeds-recorded` would also put a required proxy beside a required substance that subsumes it,
producing the two-definitions defect [ADR 0001](0001-standalone-domain-first-design.md) rejected
when it declined rule inheritance.

**The machine-evaluation consequence, unique to this rule.** It is the only one of the five in
`EVALUATED_RULES` — detector A3, `verification: code-analysis`, `assurance: partial`. Raising it
converts a warning into an **error** on every scanned target with no seed-setting expression, while
its `$assuranceNote` concedes *"Presence is not determinism"*. That is the framework acting more
strongly than its evidence supports, which `CHANGELOG.md` names as a regression rather than an
improvement: *"A rising score is not evidence of a better release."*

**Normative?** Yes. **Release class: MINOR.**

---

### 18 R2 — soften the prose

**The exact conflict.** The prose reads **"Each component whose contribution is claimed MUST be
evaluated by removing it alone and re-running the evaluation, and the resulting score MUST be
recorded beside the full model's."** `evaluation.ablation-performed` is `kind: recommendation`,
`level: recommended`, `severity: warning`.

**Source-spec evidence.** The brief says only *"ablation"*. Authored spec item 18 contains exactly
one modal, and it does not govern whether to ablate: *"Ablations should use the same data, splits,
and metric as the comparison they inform."* The sentence about ablating is descriptive — *"Removing
one component at a time and re-evaluating shows which parts earn their place"*. The source states
what ablation demonstrates and how to run one, never that one must occur.

**Why the catalog is right, not merely authoritative.** R2 relaxes itself in its own second
paragraph: *"Where the full enumeration is too large to ablate exhaustively, the subset actually
tested is stated along with the reason for the selection."* A `MUST` carrying "unless it is
inconvenient, in which case say why" is a recommendation with a disclosure obligation attached, and
naming it a requirement makes the corpus's requirements mean less rather than making this rule mean
more. The corpus also already forbids the actual harm at full strength — R2's own line, *"Silence
about an untested component is acceptable; a contribution claim about one is not"* — so nothing is
left unprotected by leaving R2 at recommendation.

**Counterexample against raising it.** A plain logistic regression on raw features has no separable
component: no engineered feature, no augmentation, no post-processing step, nothing to remove. It
can never produce an ablation arm, and the auditor cannot see the component list to conclude
not-applicable. Identical failure to 11 R2, reached independently.

**Normative?** Yes. **Release class: MINOR.**

---

### 19 R3 — raise the catalog

**The exact conflict.** The prose reads **"Every claimed improvement MUST be stated as which of
these three it is, and one kind MUST NOT be presented as another."**
`evaluation.improvement-classification` is `kind: recommendation`, `level: recommended`,
`severity: warning`.

**Source-spec evidence.** This rule does not descend from spec item 19. Its section opens *"The
source requires the system to distinguish three kinds of improvement"* and then reproduces the
brief's own three terms under a **"Reproduced verbatim from the source"** claim that
`scripts/fidelity.mjs` checks character-for-character on every run. The governing sentence is the
brief's, byte-identical per ADR 0002: **"Require the system to distinguish:"**. Item 19's authored
*"should be stated separately"* is the paraphrase; the imperative is the original. Where a derived
paraphrase and a byte-identical reproduction disagree, the reproduction wins — that is the entire
logic of the provenance chain ADR 0002 built and `fidelity.mjs` enforces.

**Why the prose is right, not merely stronger.** Leaving this at recommendation makes the corpus
internally incoherent, not merely lenient. Standard 19 **P2** is a `prohibition`, `level: forbidden`,
`severity: error`, reproducing the brief's *"declare a more complex model better merely because it
has a slightly higher score"*, and it forbids *"the specific inference from a small score advantage
to a verdict of 'better', made without accounting for what the complexity costs."* Accounting for
those costs **is** R3's classification. The corpus cannot forbid misclassifying an improvement at
error severity while merely recommending that improvements be classified at all: the prohibition is
unenforceable without the thing it depends on. A prohibition resting on a recommendation is a
requirement with its level written in the wrong file.

**Counterexample against softening.** Softening R3's modal would place `SHOULD` immediately beneath
a fidelity-checked verbatim block whose own verb is *Require*, so the section would contradict the
quotation it cites — and `fidelity.mjs` would not catch it, because it compares quoted text and
never the sentence that renders it. It would also leave the brief's only two imperative directives
as two of the weakest entries in the catalog, which inverts the source.

**Normative?** Yes. **Release class: MAJOR** — it satisfies two clauses independently, *"adding a
requirement"* and *"raising a rule's level"*, and requires a deliberate
`artifacts/catalog-baseline.json` update.

---

### 20 R1 — raise the catalog

**The exact conflict.** The prose reads **"Every comparison that informs a decision MUST be
accompanied by an indication of uncertainty sufficient to distinguish a real difference from
noise."** `evaluation.uncertainty-reported` is `kind: recommendation`, `level: recommended`,
`severity: warning`.

**Source-spec evidence.** The strongest of the five. R1 reproduces the brief's own sentence
verbatim, under fidelity check:

> Require uncertainty around model comparisons where appropriate.

Not a paraphrase and not an inference — the imperative itself, carried into the standard and
mechanically verified on every run. Item 20's authored *"Comparisons should carry an indication of
uncertainty"* is the derived restatement.

**Why the prose is right, not merely stronger.** The one qualifier that could argue for
recommendation is *where appropriate*, and the corpus already decided what it governs, in R1 and
again in Standard 20's *Additions* section: *"The qualifier where appropriate is about the form,
not about whether."* That reading makes the rule **always satisfiable** — a deterministic
evaluation over a fixed exhaustive population satisfies it with a statement to that effect — which
removes the unsatisfiability that defeated raising 11 R2 and 18 R2. This is the sharpest evidence
that the five are genuinely different: the same counterexample was tested against all five and it
only lands on three.

R1 is also load-bearing across the corpus in a way a recommendation cannot be. Standard 18 R4 uses
its estimate as the threshold for whether a component earns its place; Standard 19 P2's *"slightly"*
has no meaning without it; Standard 2 needs it to know whether a baseline was beaten; Standard 19
R3's first category is *"definitionally a claim about uncertainty that only R1's measurement can
support"*. Four rules — one of them a prohibition at error severity — depend on a rule the catalog
holds as advice.

**Counterexample against softening.** Softening would leave the same self-contradiction as 19 R3,
and worse: the sentence directly beneath a quoted *Require* would read `SHOULD`. It would also
weaken the rule that three other standards and one prohibition are built on top of, without any of
those four moving — the corpus would keep enforcing consequences of a rule it had stopped asking
for.

**Normative?** Yes. **Release class: MAJOR**, on the same two clauses.

## Standard 20 R3 gets a catalog entry of its own

R3 has no entry; its claim survives only as a trailing clause of `evaluation.uncertainty-reported`'s
`description`. It should be given one, and the reason is now sharper than representational tidiness:
**raising R1's entry to `requirement` would silently raise R3's claim with it**, because R3 rides
inside that entry. Splitting R3 out is what prevents the repair from relevelling a rule nobody
decided to relevel.

Its level follows the same test applied to the other five, run independently. R3 derives from the
authored last sentence of spec item 20 — *"Where uncertainty has not been quantified, a small
difference should not be described as an improvement"* — and the evaluation philosophy does not
reach it. `should not` is the only modal in its source chain, so **R3 enters the catalog as a
`recommendation`, and its prose `MUST NOT` softens to `SHOULD NOT`**, by the same reasoning as
11 R2, 16 R1 and 18 R2.

Adding the entry is *"adding a recommendation"*, MINOR on its own, and it travels in the vehicle
below regardless.

## Aggregate consequence

Two of the five require a catalog-level raise that both adds a requirement and raises a rule's
level. **The combined repair vehicle is therefore MAJOR**, and the five cannot be split across
vehicles: 20 R1's raise and 20 R3's separation touch the same entry, and 19 R3's raise is what
makes 19 P2 enforceable, so shipping the softenings alone would weaken three standards while
leaving the two incoherences in place.

**This is not authorisation to cut that release.** A class is evidence about a future vehicle,
never permission to create one — the boundary [ADR 0009](0009-fairness-is-conditionally-in-scope.md)
and ADR 0011 both closed under. No `VERSION`, `package.json`, `CHANGELOG.md` or tag is touched by
this record, and the repair itself is not performed here.

## Consequences

**Three standards presently ask more than the corpus supports, and two catalog entries presently
ask less than the brief does.** Both are now defects with a decided direction rather than an
undifferentiated inconsistency.

**N6's class is unchanged by this record.** N6 was classified MINOR *at the level R3 is carried at
today*, and R3 is carried at `recommended` today; nothing here alters that, and
[FE-25](../backlog/items/FE-25.md) is not reopened. What changes is sequencing: N6 modifies R3's
claim, and R3's separation and R1's raise touch the same entry, so N6's natural vehicle is the
MAJOR release above. N6's class should be re-derived against the catalog as it stands when that
vehicle is drawn up, not inherited from today's measurement.

**The mechanical check now has a target state.** Before this record it was unknown whether any of
the five disagreements were deliberate. None are. After the repairs, all twenty-five requirement
and recommendation entries agree with their sections, so a prose-to-catalog check needs no
allowlist of permitted exceptions — see [FE-33](../backlog/items/FE-33.md).

**The repairs are not scheduled by this record.** Deciding a direction is not performing it, and
nothing here edits a standard or the catalog.
