# 0001 — Standalone, domain-first design

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner

## Context

A working standards framework already exists in a sibling repository for the engineering domain. It
carries proven machinery: policy-as-code, evidence-based evaluation, a rule catalog separated from
project policy, attestations, verbatim-source fidelity checking, and committed human-reviewed
baselines. Roughly seventy percent of it is content-agnostic; the rest derives from one input, its
source specification.

The temptation is to fork it. The brief forbids the outcome that would produce: this repository
must be independently maintained and must not depend on any other standards repository. There is
also a subtler risk. A fork inherits an entity model designed for a different domain, and the
machine-learning domain differs in one decisive way — most of its failure modes are undetectable
from source text. A model can be trained on leaked targets, evaluated on a cherry-picked period,
and reported with fabricated numbers, and the repository will look immaculate. A framework built
where checks are mostly mechanical, transplanted here unexamined, would present that immaculate
repository as compliant.

## Decision

Design the entity model, the conclusion vocabulary, the CLI, and all normative content for this
domain from first principles. Where a component's requirements here are *genuinely identical* to a
proven one, **vendor** it: copy the file in, own it, and give it a provenance header naming its
origin and stating that it is vendored rather than depended upon.

Vendored: `yaml.mjs`, `jsonschema.mjs`, `inventory.mjs`, `fidelity.mjs`, `diagrams.mjs`. Each is
domain-independent — a parser that refuses to guess, a schema evaluator that refuses to ignore, and
three checks about documents and enumerations.

Designed here: the `kind` model that makes prohibitions first-class; `evidenceExpected` on every
entry; the invariant mechanism and `BLOCKED_BY_INVARIANT`; the split between
`insufficient-evidence` and `not-evaluated`; the integrity checker and catalog baseline; the
five-command CLI; every detector; and all twenty-five standards.

Vendoring is not a dependency. Nothing here reads a path outside this repository, and deleting
every sibling repository changes nothing about how this one builds, tests, or runs.

Three defects in the prior work are deliberately not inherited: a `schemaVersion` emitted as
`"1.0"` by two components and `"1.0.0"` by others (here it is `"1.0.0"` everywhere, asserted by a
test); a rules file whose name disagreed with the category of the rules inside it (here filename,
category field, and id prefix always agree); and a test script whose quoted glob only expands on
Node 21 and later while the declared floor was 18 (here `node --test test/`, the directory form).

## Alternatives considered

**Fork the whole repository and swap the content.** Fastest, and it was the original plan. Rejected
on the brief's independence requirement, and on the deeper ground above: it would have imported an
assurance posture calibrated for a domain where checking works.

**Clean-room everything, copying nothing.** Maximally independent and slower, and it would rewrite
a YAML parser whose value is precisely the edge cases already found — tabs, anchors, block scalars,
scalars that must not be coerced. Rewriting it would re-risk bugs that are already fixed, for a
purity that vendoring with attribution already achieves.

**Depend on the sibling repository as a package.** Rejected outright by the brief, and it would
couple this repository's release cadence to another's.

## Consequences

Two copies of the vendored files now exist in the world and may diverge. That is accepted and is
the point of ownership: a fix here does not wait on another repository, and a change there does not
arrive here unannounced. The provenance headers make the shared ancestry discoverable to anyone
comparing them.

The domain-first entity model costs more design work up front — this document and the architecture
record are that cost — and buys a system whose honest answer, in this domain, is usually "a human
must judge this," expressed as a first-class conclusion rather than an absent check.
