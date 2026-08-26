# N6 — re-disposition under the correct class

**Date:** 2026-08-26 · **Finding:** N6, withdrawn from the `1.4.0` candidate mid-replay ·
**Authorised inputs:** the finding as recorded, its first disposition, the replay that withdrew it,
the current text of Standard 20, the catalog, and the versioning policy. Nothing else.

This record disposes of N6 and nothing else. **No standard, rule, baseline, fixture, version file
or changelog entry is changed by it**, and it authorises no release.

## Method

Applied from [`review-method.md`](review-method.md), which was written after two findings were
produced by classifying normative sentences without their surrounding text. Its second step is the
one that matters here:

> **Read the catalog entry beside it.** `description`, `evidenceExpected`, `remediation` and the
> assurance note are operative text.

The prior attempt did not do that, and the omission is why its class was wrong twice — first as a
clarification, then as MAJOR asserted without the level that claim depends on.

Read in full: `standards/20-uncertainty.md` — Scope, R1 through R5, *Evidence and verification*,
*Relationship to other standards*, *Implementation*; the sole Standard 20 catalog entry; the
increments at the head of `CHANGELOG.md` and its frozen-surface list; the `kind` mapping in
`design/architecture.md`; and Standard 19 R3, which R3 feeds.

## What was found, and what was already killed

**The finding.** From the normative review:

> Standard 20 requires uncertainty to be *measured*. Nothing requires it to be *adequate*, or that
> the evaluation be planned to support the claim before it is run.

Evidence: Riley, Snell, Ensor et al. (2019), *Statistics in Medicine* Parts I and II; Riley, Ensor,
Snell et al. (2020), BMJ. The finding stands and is not revisited here.

**The remedy that was killed, and stays killed.** The review's candidate remedy was *"Require a
minimum evaluation sample size."* Disposition refuted it:

> The Riley criteria are derived for clinical prediction models under specific assumptions and have
> no general ML analogue. Any numeric threshold this corpus invented would be false precision of
> exactly the kind Standard 12 R4 warns about, and many projects have a fixed dataset and no route
> to more data — again an unsatisfiable `MUST`.

That refutation is accepted unchanged. **No sample-size standard is supported, in any release
class.** Nothing below revives it.

## The counterexample that failed the clarification classification

Disposition then narrowed the remedy to extending 20 R3, and classified the narrowed form as a
clarification. The `1.4.0` replay refuted that classification, and this is the counterexample the
present record is required to carry:

> Extending Standard 20 R3 to cover a difference lying inside its measured uncertainty makes
> non-compliant a project that was compliant: one that quantified its uncertainty and called an
> inside-the-interval difference "practically meaningful". That is an added obligation. The
> disposition classified it as a clarification and the disposition was wrong.

**The counterexample is correct and is upheld.** A clarification must have zero semantic delta, and
this one has a witness: a project that quantified an interval, observed a difference inside it, and
described that difference as practically meaningful conforms to Standard 20 as written today and
would not conform after the change. One witness is sufficient, and the replay found it.

What the replay went on to say — *"it re-enters as a candidate change, MAJOR-shaped"* — is the part
this record re-examines. The first half is right. The second was asserted without establishing the
level it depends on.

## The delta that survives, stated exactly

> A difference that **has** been quantified and lies within its measured uncertainty is also not
> described as an improvement.

R3 today closes only the unquantified case. Its normative sentence is:

> **Where uncertainty has not been quantified, a small difference MUST NOT be described as an
> improvement**, in the model card, the comparison document, or any claim made outside the project.

The surviving delta widens the antecedent from *not quantified* to *not quantified, or quantified
and not distinguishable*. The consequent is untouched. Standard 19 R3's `statistical` category
already excludes an inside-the-interval difference; the delta closes the route by which the same
difference reaches `practically meaningful` instead, which asserts a difference not shown to exist.

Scope is universal and already inside Standard 20's subject. No new standard, no new heading, no
sample-size threshold.

## What the prior attempt did not establish

**Standard 20 R3 has no catalog entry of its own.** The whole of Standard 20 is carried by one rule:

| | |
| --- | --- |
| id | `evaluation.uncertainty-reported` |
| `standard` / `requirement` | 20 / **R1** |
| `kind` / `level` / `severity` | **recommendation** / **recommended** / warning |
| `verification` / `assurance` | manual-review / **none** |
| in `EVALUATED_RULES` | **no** |

R3 survives in the machine-readable corpus only as the trailing clause of that rule's
`description`:

> … and an unquantified difference is not described as an improvement.

Three consequences follow, and each bears on the class:

1. **The delta is invisible to every mechanism this repository owns.** Standard 20 appears in none
   of the ten evaluated rules, so no acceptance state can move and `scripts/acceptance.mjs` would
   report clean through the change. The `1.3.0` acceptance lock exists because N10's widening was
   invisible; here the invisibility is structural rather than a gap, because there is nothing to
   detect. **The class must therefore be argued normatively. A green gate is not evidence about it.**
2. **`level` is a catalog field, and the semver test names it.** MAJOR is *"adding a requirement or
   a prohibition; raising a rule's level; removing any rule; changing anything on the frozen
   surface."* Whether this delta raises a level depends entirely on which catalog form it takes.
3. **The frozen surface is not touched either way.** It is the command names and semantics, the
   policy schema, the canonical rule ids, the rule-entry contract, the output envelope, the status
   and disposition vocabularies, the exit-code meanings, and the score, assurance and coverage
   semantics. A rule's `description` text is on none of that list, and the id does not change.

## The class, and the condition it turns on

The delta can land in exactly two forms, and they do not share a release class.

| Form | What changes | Class | Why |
| --- | --- | --- | --- |
| **(a) At the level R3 is carried at today** | The prose antecedent, and the description clause of the existing `recommendation` | **MINOR** | Nothing is added, no level is raised, the frozen surface is untouched. A recommendation is `severity: warning` and never makes a project non-compliant, so no consumer's verdict can flip |
| **(b) At the level R3's prose claims** | A new `kind: requirement` or `kind: prohibition` entry at `required` / `forbidden` | **MAJOR** | *"adding a requirement or a prohibition"*, verbatim |

The replay's *"MAJOR-shaped"* is form (b), and form (b) is the natural reading, because R3's prose
is a `MUST NOT` and a `MUST NOT` is not a recommendation. But that is an inference about a fact the
corpus states two ways, and it was never written down as one.

**The policy is not silent by accident.** MINOR names *"widening what is accepted"*; this delta
narrows it. PATCH is *"corrections that change no conclusion"*; this changes one, which is exactly
what the replay's counterexample demonstrates. So an unenumerated, conclusion-changing narrowing
falls between the written clauses, and the head of `CHANGELOG.md` says how to resolve that:

> Semantic versioning, with the increments stated so a release cannot be argued into being smaller
> than it is.

Under that instruction the tie does not break toward the smaller class. It breaks toward whichever
class the *level* determines — and that is form (b) unless the level is deliberately (a).

## The prior question this exposes, recorded and not resolved here

Standard 20 states R1 and R3 as `MUST` and `MUST NOT`. `design/architecture.md` maps
`kind: recommendation` to *"should"* and *"should normally"*. The sole catalog entry for Standard 20
is a recommendation. **The prose and the catalog disagree about Standard 20's level today, before
N6 changes anything.**

This is pre-existing. It was not created by N6, it is not caused by the delta, and it is not
dispositioned here — N6's authorised scope is the inside-the-interval case, and adjudicating the
level of an entire standard is a different question with a different evidence requirement. It is
recorded because the class of N6 cannot be finalised while it stands, and because a future attempt
that reads only R3's prose, or only its catalog entry, will reach a confident answer from half the
text. That is the failure `review-method.md` exists to prevent, arriving a third time on the same
finding.

## Disposition

| | |
| --- | --- |
| **Finding N6** | Stands. Evidence unchanged |
| **Sample-size remedy** | **Rejected**, as in the first disposition. Not revived |
| **Surviving remedy** | **`SUPPORTED_FOR_CHANGE`** — it modifies an existing claim, and the replay's counterexample proves it is not a clarification |
| **Release class** | **Not determined.** MINOR in form (a), MAJOR in form (b). Form (b) unless Standard 20's level is deliberately recommendation |
| **Scheduled** | Nothing |

The class this record was opened to correct is the disposition class, and it is corrected:
`SUPPORTED_FOR_CLARIFICATION` was wrong; `SUPPORTED_FOR_CHANGE` is right. The release class is a
separate axis, and this record is honest that it stops one question short of it rather than
supplying a number.

## What this record does not authorise

- No edit to Standard 20, the catalog, either baseline, the acceptance fixtures, `VERSION`,
  `package.json`, or `CHANGELOG.md`.
- No release of any class. A MAJOR classification would be evidence about a future vehicle, never
  authorisation to cut one — and the classification here is not even that.
- No revival of the sample-size standard.
- No adjudication of Standard 20's level. That is its own question, on its own evidence.

## What would resolve the release class

One decision, on evidence this repository already holds: whether Standard 20's `MUST` prose or its
`recommendation` catalog entry is the deliberate one. Resolve that, and N6's class follows without
further argument — MAJOR if the prose governs, MINOR if the catalog does.
