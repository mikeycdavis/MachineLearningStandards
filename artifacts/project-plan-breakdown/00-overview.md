# Plan — MachineLearningStandards

**This is not a reconstructed plan.** It was written before the work and updated as each milestone
completed, and it records what was decided rather than what can be inferred from the result.

## What this project is

An auditable standards system for machine-learning work, standalone, with no dependency on any
other standards repository. See [PROJECT.md](../../PROJECT.md) for the manifest and
[design/architecture.md](../../design/architecture.md) for the entity model and the reasoning
behind it.

## Current state

| | |
| --- | --- |
| Branch | `main` |
| Status | COMPLETE for `1.0.0` |
| Standards | written, and locked against the enumeration |
| Catalog | written, and locked against a reviewed baseline |
| Tooling | five commands, ten detectors, eight CI gates |
| Platform | Node ≥ 18, zero third-party dependencies |

## Sections

| File | Covers | Status |
| --- | --- | --- |
| [01-source-spec-and-inventory.md](01-source-spec-and-inventory.md) | The derived specification and the locked enumeration | COMPLETE |
| [02-standards.md](02-standards.md) | The twenty-five normative documents | COMPLETE |
| [03-catalog-and-policy.md](03-catalog-and-policy.md) | The catalog, invariants, schema, and verdict engine | COMPLETE |
| [04-cli-and-detectors.md](04-cli-and-detectors.md) | The commands and the scanner | COMPLETE |
| [05-documentation-and-dogfood.md](05-documentation-and-dogfood.md) | Guides, templates, and the self-evaluation | COMPLETE |

## Decisions on record

Full reasoning in the ADRs; the decisions themselves are:

1. **Standalone, domain-first.** The entity model, conclusion vocabulary, CLI, and all content were
   designed for this domain. Five domain-independent scripts were vendored with provenance headers.
   Vendoring is not a dependency. ([0001](../adr/0001-standalone-domain-first-design.md))
2. **The specification is a derived enumeration** of the source brief, with two sections
   byte-identical to it. ([0002](../adr/0002-the-spec-is-a-derived-enumeration.md))
3. **Prohibitions and invariants are first-class kinds**, not flags on requirements.
   ([0003](../adr/0003-prohibitions-and-invariants-are-first-class.md))
4. **Automation is bounded by honesty**, and eight checks were deliberately not built.
   ([0004](../adr/0004-honest-automation.md))
5. **The integrity invariant is enforced along five routes**, each closing a specific bypass.
   ([0005](../adr/0005-integrity-invariant-enforcement.md))

## The ordering, and why it was not negotiable

```text
architecture → specification → standards → catalog → tooling → documentation
```

Each layer binds to the one before it: standards cite specification item numbers, catalog entries
bind to standard numbers and heading anchors, and the evaluated set binds to rule ids. Two
consequences were the reason for the sequence rather than the result of it.

**Standards before catalog.** Had the catalog come first, the rule set would have been whatever the
detectors could find, and in this domain that is a small fraction of what matters. Writing the
normative content first meant the catalog formalises an already-reviewed standard rather than the
prose being retrofitted around what a regular expression happens to match.

**Catalog before tooling.** Automation serves the standard. A standard does not exist because
something was easy to detect.

**Both invariant checks green before the first standard was written.** The inventory and fidelity
checks were built over zero standards, which is the only moment they are cheap. Adding them
afterwards means auditing every document that already exists.

## Constraints that applied to all work here

1. **Never fabricate history.** Where the source brief is silent, the specification says so and the
   standard discloses the addition in its own `## Additions` section.
2. **A negative discovery result is not a durable fact until the discovery mechanism has been
   validated for the input shape.** The plan's first drafts miscounted both source lists — twenty-five
   topics and twenty-three prohibitions — which is exactly why the recount before locking the
   inventory is a named step rather than an implied one.
3. **Never write a count into prose.** Counts are derived from the catalog at run time, and a test
   enforces it.
4. **Never weaken a standard, a rule, or a test to complete an implementation.** This one is not a
   convention here; it is `invariant.standards-integrity`, and it will stop the build.

## Scope changes

None. The work delivered is the work planned, with two additions that emerged during
implementation and were adopted deliberately: the split of "nothing is known" into
`insufficient-evidence` and `not-evaluated`, because the remediation differs; and deriving
`attestable` from the verification method, after writing the tests exposed that an assertion could
otherwise stand in for an artifact.
