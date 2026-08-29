# 0002 — The specification is a derived enumeration

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner

## Context

The repository's only input is `artifacts/prompts/original-prompt.md`: a brief listing twenty-five
topics to cover, twenty-three behaviours that must never occur, and an evaluation philosophy. It is
prose, not a specification. The standards need something they can cite by item number, and the
tooling needs something whose enumeration can be locked so that a coverage claim is mechanical
rather than a memory exercise.

Writing the standards directly against the prompt was tried in planning and rejected: the prompt's
bullets have no numbers, so "item N" could not be cited, and nothing could detect a skipped topic.
The failure mode is concrete and has happened before in the sibling repository — a standard was
silently skipped and the wrong count propagated into three documents before anyone noticed.

## Decision

Author `artifacts/prompts/ml-standards-spec.md` as an explicitly **derived** enumeration of the
prompt, and record the derivation so each link in the chain is verifiable by a different mechanism:

1. **Prompt to spec.** The twenty-five item titles are the prompt's Cover bullets, in the prompt's
   order, title-cased. The `## Must-never rules` and `## Evaluation philosophy` sections are
   byte-identical to the prompt's corresponding sections. A reader verifies this link with a plain
   diff; the spec's provenance block says so and names the sections. Everything else in the spec —
   the two to five sentences of normative intent under each item — is authored content, and the
   provenance block says that too.
2. **Spec to inventory.** `artifacts/standards-source-inventory.json` is reviewed by a human once
   and committed with `expectedCount: 25`. `scripts/inventory.mjs` extracts the enumeration from
   the spec and compares it *against* the inventory. The inventory is never regenerated from a run,
   so a change to the extraction regex can disagree with the series but can never redefine it.
3. **Spec to standards.** Each standard carries `Source: item N of ml-standards-spec.md`, and
   `scripts/fidelity.mjs` verifies that every block a standard claims is verbatim from the source
   matches character for character. What counts as such a claim, and what must follow it, is stated
   for authors in `design/architecture.md` §14 rather than left to the checker: a claim announces
   with a colon and must be followed immediately by a fenced block, blockquote or bullet list. A
   claim with no such block is a finding — it was formerly passed over in silence, which let a
   document assert that a paragraph was source text and still report success.

The prompt is never edited. It is the source of truth and is preserved exactly as received.

## Alternatives considered

**Treat the prompt itself as the specification.** No item numbers, no lockable enumeration, no
fidelity target. Rejected.

**Generate the spec from the prompt with a script.** Superficially attractive because it makes the
derivation reproducible. Rejected: the item titles need title-casing and the items need authored
normative intent, so a generator would either produce something unusable or would be a place where
authored content is silently regenerated away. Human derivation, disclosed and diff-verifiable,
is more honest than a generator that appears to remove the human.

**Number the prompt's bullets in place.** Would edit the source of truth. Rejected.

## Consequences

There are two documents where a naive reading expects one, and the relationship between them must
be stated wherever a reader might mistake the spec for the brief — hence the provenance block.

The human review of the spec against the prompt is the single most consequential act in the
project. Nothing downstream can detect a topic dropped at that step: the inventory locks whatever
the spec says, and every check below it verifies consistency with the spec rather than with the
prompt. Recounting both lists against the prompt before committing the inventory is therefore a
named step in the plan, not an implied one. The counts are twenty-five and twenty-three; earlier
drafts of the plan miscounted both, which is the demonstration of why the step exists.
