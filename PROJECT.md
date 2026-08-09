# PROJECT — MachineLearningStandards

## Purpose

An auditable standards system for machine-learning work: what must be done, what must never be
done, when a standard applies, what evidence demonstrates compliance, how it is verified, and when
a past decision has to be revisited. It exists to prevent invalid models, misleading evaluation,
leakage, overfitting, irreproducible experiments, and unjustified claims about model quality.

The system is designed to be operated by AI agents as well as people, which is why refusal is a
first-class outcome: an agent working here can be blocked by an invariant, and is never required to
produce a positive recommendation.

## Standards

- **Standards version:** `1.0.0` — declared in [`project-policy.yml`](project-policy.yml)
- **Adoption guide:** [`INSTRUCTIONS.md`](INSTRUCTIONS.md)
- **Source of truth:** [`artifacts/prompts/original-prompt.md`](artifacts/prompts/original-prompt.md),
  enumerated as [`artifacts/prompts/ml-standards-spec.md`](artifacts/prompts/ml-standards-spec.md)

This repository is standalone. It depends on no other standards repository, at build time, run time,
or install time.

## Stack

| Layer | Technology |
| --- | --- |
| Normative content | Markdown, one numbered document per standard |
| Structured contracts | `rules/*.json`, `schemas/project-policy.schema.json`, `project-policy.yml` |
| Tooling | Node.js ≥ 18, ESM, `node:` builtins only. **Zero third-party dependencies** |
| Tests | `node:test` with `node:assert/strict` |
| CI | GitHub Actions, Node 20, no install step |

## Commands

| | |
| --- | --- |
| Install | none — there is nothing to install, and that is enforced by CI having no install step |
| Test | `npm test` |
| Evidence | `npm run scan` |
| Verdict | `npm run evaluate` |
| Policy | `npm run policy` |
| Catalog integrity | `npm run integrity` |
| Source enumeration | `npm run inventory` |
| Quotation fidelity | `npm run fidelity` |
| Diagram freshness | `npm run diagrams` |

## Environments

| Environment | Target | Notes |
| --- | --- | --- |
| Local | Node 24 on Windows | Development |
| CI | Node 20 on ubuntu-latest | All eight gates; the build fails if a dependency is ever added |

## Integrations

None, by design. A tool that judges repositories should not require network access, credentials, or
a package registry to run.

## Architectural rules

Project-specific constraints, not a restatement of the standards.

- **Three-way separation.** The catalog defines rule identity and metadata, the policy defines
  applicability, the evaluator produces evidence. None may redefine the others, and `assertBindings`
  enforces the evaluator's half mechanically.
- **Zero third-party dependencies**, including in tests and CI. Because CI has no install step,
  adding one breaks the build — which is the only form of this rule that survives a deadline.
- **No default-pass path.** A rule reaches `passed` only by examination or by a valid attestation.
  Every guard here exists because of a specific way a false green could be produced.
- **Counts are derived, never written.** How many rules exist is a fact the catalog owns; a number
  typed into prose is a second definition, and a test enforces this.
- **Fixtures are excluded from the self-scan by a general mechanism** — the same skip list that
  excludes `node_modules` — never by a self-referential exemption.
- **Every guard is mutation-tested** where it guards a known failure: reintroduce the defect,
  confirm the test fails, restore.

## Data and models

Not applicable. This repository trains no models and holds no datasets; the only tabular files are
test fixtures. That determination is declared explicitly for every rule in
[`project-policy.yml`](project-policy.yml), with a reason and a revisit condition, rather than being
special-cased out of evaluation.

## Artifact locations

| | |
| --- | --- |
| Project policy | `project-policy.yml` |
| Locked enumeration | `artifacts/standards-source-inventory.json` |
| Locked catalog | `artifacts/catalog-baseline.json` |
| Plan | `artifacts/project-plan-breakdown/` |
| Decision records | `artifacts/adr/` |
| Design records | `design/` |
| Documentation | `docs/` |

## Current state

- **Current status:** COMPLETE — the initial release is implemented and all gates pass
- **Current release target:** `1.0.0`
- **Known risks:** most rules rest on attestation, because most machine-learning failures leave no
  trace in a repository. A project that attests carelessly will report compliant; the digest
  mechanism limits the blast radius rather than removing it.
- **Known blockers:** none
- **Next recommended work:** widen language coverage in the leakage and seed detectors beyond
  Python, which is the one gap where a mechanism plausibly exists and is not yet built
