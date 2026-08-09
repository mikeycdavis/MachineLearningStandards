# 0005 — How the integrity invariant is enforced

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner

## Context

The brief specifies a global rule and then asks the question that matters:

> A human or AI must never bypass, weaken, remove, reclassify, reinterpret, falsify evidence for,
> or manipulate a standard, test, applicability determination, evidence requirement, or
> verification mechanism solely because it prevents the desired implementation or conclusion.
>
> Determine how this invariant can itself be protected and tested.

An invariant stated only as a sentence is a sentence. Worse, it is a sentence that reads as
protection, which makes the gap harder to see than no statement at all. The pressure it guards
against is real and ordinary: a required rule fails, a deadline is close, and the cheapest path to
green is to edit the rule rather than the work. An AI agent under instruction to "make the checks
pass" will find that path immediately, and will find it faster than a human.

The design question is therefore not whether to state the rule but to enumerate the routes by which
it would be broken and close each one mechanically.

## Decision

Adopt `invariant.standards-integrity` as a first-class invariant whose violation produces
`BLOCKED_BY_INVARIANT` and exit 3, and protect it along five routes. Each route below is a way
somebody actually gets to a false green; the mechanism is what makes that route visible.

**1 · The catalog baseline.** *Route closed: editing the catalog so a failing rule stops failing.*
`artifacts/catalog-baseline.json` is a committed, human-reviewed lock of every rule's `kind`,
`level`, `severity`, `verification`, and `nonExemptible`. `scripts/integrity.mjs` compares the live
catalog against it and reports five specific drifts: a rule removed, a level lowered, a kind
reclassified, `nonExemptible` turned off, or a verification method weakened. The point is not that
the catalog can never change — it must, as the framework grows — but that it cannot change
invisibly. A legitimate change updates the baseline deliberately and records the reason in
`CHANGELOG.md`, which turns a silent edit into a reviewable one.

**2 · Policy weakening detection.** *Route closed: leaving the catalog alone and neutering the rule
locally.* A target's policy may configure, but not redefine. `scripts/policy.mjs` reports
`policy.weakened-standard` when a policy sets any rule below its catalog level, names an invariant
id anywhere at all, or declares a prohibition not-applicable without a reason. The checks live in
both the policy command and the evaluator, so skipping one command does not bypass them.

**3 · Attestations cannot override automated evidence.** *Route closed: writing "reviewed, it's
fine" over a detector that found the opposite.* When a rule has an adverse finding, an approving
attestation on it yields `contradicted-attestation` and the rule still fails. An attestation
records human judgement where no mechanism exists; it is not a veto over one that does. This also
means non-exemptibility survives attestation without needing a second prohibition: the finding
simply persists.

**4 · Evidence digests.** *Route closed: reviewing a file once and letting the approval outlive
what it approved.* An attestation may pin `reviewedAgainst.paths`; the evaluator hashes their
contents and, on mismatch, treats the attestation as stale — the rule falls back to
`not-evaluated`, never to passed. Content-based rather than commit-based deliberately: invalidating
every attestation on every commit would make the mechanism unusable, and an unusable mechanism gets
abandoned rather than obeyed.

**5 · Mutation tests.** *Route closed: a guard that quietly stopped working.* For each mechanism
above, a test reintroduces the defect it guards against and asserts the guard fires. This is not
redundant with the ordinary tests: a guard can pass its own unit test while failing on the real
edit it exists to catch, which is exactly how a freshness checker in the sibling repository
reported clean for months by comparing only first lines.

Three supporting invariants carry the same treatment: `invariant.no-silent-pass` (nothing
unevaluated is ever reported passing), `invariant.coverage-outside-verdict` (how much is checked
never inflates the verdict), and `invariant.honest-evidence-labels` (a heuristic's output is
`INFERRED`, never `OBSERVED`).

## Alternatives considered

**State the rule in documentation and rely on review.** The stated intent with no mechanism. It is
what the brief is asking to improve upon.

**Cryptographically sign the catalog.** Stronger against a determined adversary, and the wrong
threat model. The realistic actor is an agent or a person with legitimate write access taking the
cheapest path to green; a signature they can also produce stops nothing, while adding key
management to a zero-dependency repository.

**Make the catalog read-only and require an out-of-band process to change it.** Rejected as
unworkable in a single repository, and it would push edits into workarounds rather than preventing
them. Visibility beats prohibition where the actor has legitimate access.

**Treat integrity violations as ordinary non-compliance (exit 1).** Rejected. Non-compliant means
the work does not meet the standard; blocked means the standard is not currently trustworthy as a
measure. Reporting the first while the second is true publishes a number derived from a tampered
ruler. The separate status and exit code also make refusal machine-visible to a CI job or an agent
that sees only an exit code.

## Consequences

The baseline is a second file that must be updated when the catalog legitimately changes, and
forgetting to update it fails the build. That friction is the feature: it converts an invisible
edit into a visible one, at the cost of one deliberate step per intentional change.

An agent operating in this repository can be blocked by its own tooling, which is the intended
behaviour. `BLOCKED_BY_INVARIANT` is a supported conclusion, exit 3 is a documented outcome, and
neither is an error state to be worked around. The system is never forced to produce a positive
recommendation, and this is the mechanism that makes that guarantee more than a claim.
