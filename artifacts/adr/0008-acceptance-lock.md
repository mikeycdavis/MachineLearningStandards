# 0008 — Lock what a rule accepts, not only how it is classified

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner
- **Amends** [0005](0005-integrity-invariant-enforcement.md) by adding a sixth enforcement route for
  `invariant.standards-integrity`. Supersedes nothing.

## Context

Building the v1.3 normative candidate widened Standard 15 R2 from *dependencies MUST pin exact
versions* to *the resolved environment MUST be recorded, by pins or by a committed lock artifact*.
That change enlarges the set of project states the framework treats as compliant.

`scripts/integrity.mjs` reported nothing, and was right not to by its own definition. It locks each
rule's `kind`, `level`, `severity`, `verification`, `assurance`, `nonExemptible` and `attestable`.
Every one was identical before and after.

The change was authorised. The silence was not:

> **A standards-integrity guard that locks a rule's classification but not its satisfaction
> semantics cannot establish that the rule was not weakened.**

This was found by trying to use the guard on a real change, which is the only way this class of gap
gets found. The catalog baseline has been protecting metadata and reporting it as though it were
protecting standards.

## Decision

**Lock the acceptance predicate behaviourally.** `artifacts/acceptance-baseline.json` records a set
of project states — small, complete, literal file contents — and, for each, the disposition the
evaluator reaches on the rule under test. `scripts/acceptance.mjs` materialises every state, runs the
real evaluator, and compares. Any difference blocks with exit 3 under the new
`invariant.acceptance-locked`.

**Both directions block.** A state that newly passes is a weakening, which is the case that
motivated this. A state that newly fails is caught for a different reason: it makes existing
adopters non-compliant without their having changed anything, and that deserves the same deliberate
review. A move between two dispositions of equal favourability — `insufficient-evidence` to
`not-evaluated`, say — is reported as a reclassification, because those two tell an adopter to do
different things.

**Twenty-six states covering all ten machine-examined rules**, and a test asserts that every rule in
`EVALUATED_RULES` has at least one. A mechanised rule with no locked state can have its acceptance
changed silently, which is the gap this record exists to close.

**Expectations were written from the standards before the checker was first run.** Twenty-five of
twenty-six matched. The one that did not is recorded in the baseline itself rather than overwritten:
seed absence routes to `insufficient-evidence` rather than a `warning`, because a seed can be set
through a configuration file or a framework helper the detector does not read, so the conservative
answer is to ask for evidence. The expectation was wrong and the code was right.

## Alternatives considered

**Add `evidenceExpected` to the catalog baseline.** Rejected, and N10 is the counterexample that
kills it: that rule's `evidenceExpected` **already read** *"or a manifest accompanied by a committed
lockfile"* in `v1.2.0`, while the standard's prose and the detector both disagreed with it. Hashing
that sentence would have locked the one artifact that was already correct and detected nothing.

**Hash the standards documents.** Rejected. Editorial change is not weakening, and a guard that
fires on a reworded paragraph teaches people to relock without reading — which converts a deliberate
transition into a reflex, and a reflexive relock protects nothing. The v1.3 candidate carried five
prose clarifications that must not have tripped anything, and under a text hash all five would have.

**Lock detector source.** Rejected for the same reason one step down: a refactor is not a semantic
change, and the thing worth protecting is the answer, not the implementation that produces it.

**Run the check inside `evaluate`.** Rejected because it recurses — the check drives the evaluator
over fixtures. It is a separate command, and CI runs it as its own gate.

**Enumerate states exhaustively.** Not possible, and pretending otherwise would be the failure this
repository exists to prevent. The states are representative. A behavioural change confined to a
state nobody wrote is invisible, and the gate says so in its own output.

## Consequences

The eight-command gate becomes nine. The acceptance run takes a few seconds, because it spawns a
real evaluation per state; that is the price of locking behaviour rather than text.

**Coverage is ten rules of forty-five.** The other thirty-five rest on human judgement and have no
observable acceptance predicate — there is no state whose disposition would move if their meaning
changed, because no mechanism reads them. Nothing here would detect a semantic weakening of one, and
the gate prints that beside its clean result rather than leaving a reader to infer it.

The v1.3 normative candidate must now be replayed through this gate. Its N10 change is expected to
trip the lock at `deps.ranged-with-lock`, which is the point: the change stays authorised, and it
stops being invisible. The candidate will need a deliberate acceptance relock naming the state that
moved and the direction it moved in, exactly as `invariant.no-self-satisfying-scaffolding` required
of the catalog baseline when it was added.
