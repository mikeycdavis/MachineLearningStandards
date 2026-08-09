# 0003 — Prohibitions and invariants are first-class

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner

## Context

The source brief supplies twenty-three behaviours that must never occur, and states the design
principle directly: must-never rules are first-class standards and must not be buried in
documentation. It also asks for a global integrity rule protecting the standards system itself, and
asks how that rule can be protected and tested.

The default modelling — a boolean flag on a requirement, or a paragraph inside one — fails for a
reason specific to this domain. Every one of the twenty-three describes a way to produce a
confidently wrong result: a model trained on the future, a metric chosen after seeing the numbers,
a test set spent by repeated inspection. These are not degrees of non-compliance with a positive
requirement. They are the failures the entire system exists to prevent, and they need to be
countable, enumerable, and individually traceable to their source sentence.

## Decision

**Three project-facing kinds, plus one system kind.** Catalog entries carry `kind`:
`requirement` (must), `recommendation` (should normally), `prohibition` (must never), and
`invariant` (a meta-rule about the standards system). `kind` is not a synonym for `level` — level
is the obligation's strength as a policy-settable value; kind is what sort of statement the entry
is, and it determines how the entry is reported, whether it can be waived, and what a violation
means.

**Prohibitions get their own catalog entries and their own prose section.** Each of the
twenty-three source statements is reproduced verbatim in exactly one standard, under a
`## Prohibitions` section as a `### P<n>` heading. Twenty prohibition entries cover them: two
entries each carry two source statements, because the pairs are one conceptual prohibition —
tuning against the final test set and repeatedly inspecting it are both `split.no-test-set-tuning`;
letting preprocessing see forbidden information and fitting transformations globally before a split
are both `leakage.no-preprocessing-leakage`. Creating twenty-three ids to match twenty-three
sentences would have manufactured a distinction the domain does not have. What is preserved is
traceability: both statements appear verbatim, both are cited by the entry, and a test asserts
every source statement has a home.

**Seven prohibitions are non-exemptible**, under a criterion stated once so it cannot be argued
case by case: *an exception is refused where granting it would amount to written permission to
deceive.* The three fabrication prohibitions qualify by definition — an approved exception to
fabricating results is an oxymoron. Target leakage and training on the future qualify because a
model built that way is invalid rather than non-compliant; waiving the rule does not make the model
work. Test-set tuning qualifies because a spent test set cannot be unspent, so no waiver can
restore the evidence it destroyed. Falsely claiming reproducibility qualifies because the
exemptible neighbour already exists and is honest: say the work is not reproducible.

Prohibitions not on that list remain exemptible, and one deserves note.
`leakage.no-preprocessing-leakage` is exemptible because the source itself qualifies it — "when
that leaks information" — so legitimate judgement exists, such as fitting a tokenizer on a fixed
public vocabulary.

**Invariants are not project-adjustable.** A policy may not set an invariant's level, declare it
not-applicable, write an exception against it, or attest it. Any invariant id appearing anywhere in
a policy is treated as an attempted weakening, which is itself an invariant violation. Violation
produces `BLOCKED_BY_INVARIANT` and exit 3 — a halt, not a score — because the alternative is to
publish a compliance number derived from a ruler that has been tampered with.

## Alternatives considered

**Prohibitions as requirements at `level: forbidden`, with no separate kind.** The level value
alone would carry the meaning. Rejected: policy can set levels, so the distinction between "must
never" and "we decided this one is optional here" would live in a field the target project
controls. Kind is catalog-owned and unsettable.

**Prohibitions as prose only, with the catalog covering requirements.** This is what the brief
names as the failure to avoid. It also makes the twenty-three uncountable, which means nothing can
assert they all have homes.

**One rule id per source sentence, twenty-three ids.** Symmetrical and traceable, and it would
create two ids that mean the same thing, each with its own detector binding and its own row in
every report. Rejected in favour of conceptual identity plus verbatim traceability.

**Invariants as ordinary required rules.** Simpler, and it would let a project declare the
integrity rule not-applicable. Self-defeating.

## Consequences

The catalog has a shape the sibling framework does not: `kind` as a first-class discriminator, and
a rules file whose entries are never project-adjustable. Reports must therefore distinguish a
prohibition violation from a requirement failure even though both are errors, because remediation
differs — a failed requirement is work not yet done, a violated prohibition is work that must be
undone.

Most prohibitions in this domain cannot be checked mechanically, so most will report
`not-evaluated` and be satisfied, if at all, by attestation. That is honest and is stated in each
standard's implementation section. It also means the value of making them first-class is partly
prospective: they are enumerable, explainable, and attestable now, and checkable later if a
mechanism is found.
