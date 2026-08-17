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

- **Current status:** IN_PROGRESS — the corpus and gates are complete through `1.5.0`; external
  publication of those releases is partial
- **Current locally established release:** `1.5.0` (`VERSION`, `package.json`, and the newest
  `CHANGELOG.md` entry agree)
- **Remote published releases:** `v1.4.0` and `v1.5.0`, published on 2026-08-16 under ADR 0010 as
  exact refs to exact object ids. Measured on the remote:

  ```text
  refs/tags/v1.4.0   4860e34c03370297b97c8c9733869c862f455614
  refs/tags/v1.4.0^{} 6bfd0789e50196da3ff666594ff5b981b8ae5763
  refs/tags/v1.5.0   57bd1a47bbec8b7bff08897333dea24801ffafc8
  refs/tags/v1.5.0^{} d9cffa11df68f15da9aadc6032ca49748cad5946
  ```

  The peeled commit is the implementation identity in each case. `v1.0.0`, `v1.1.0`, `v1.2.0`,
  `v1.3.0` and `v1.4.1` are tagged locally and have not been published.
- **Remote branch lineage:** through `1.1.0`, unchanged. `origin/main` is
  `06feba7d10c96fc363f8c3004c595c72276682d7`, which is exactly the peeled commit of `v1.1.0`.
  Publishing the two tags did not move it, and under ADR 0010 was never going to.
- **Release lineage location:** `v1.0.0`–`v1.2.0` are reachable from local `main`; `v1.3.0`, `v1.4.0`,
  `v1.4.1` and `v1.5.0` are reachable only from `v1.4-candidate`, which contains local `main` entirely
  and is 18 commits ahead of it.
- **Known risks:** most rules rest on attestation, because most machine-learning failures leave no
  trace in a repository. A project that attests carelessly will report compliant; the digest
  mechanism limits the blast radius rather than removing it.
- **Known blockers:** external consumer availability is partial. A consumer pinning `v1.4.0` or
  `v1.5.0` can now resolve it from the remote; one pinning any other release cannot, and nothing in
  this repository establishes otherwise. Separately,
  [ADR 0010](artifacts/adr/0010-published-release-tags-are-public-authorities.md) — the record that
  states what publishing a release tag means — is itself not publicly reachable. It is absent at
  `v1.5.0` and reachable only from `v1.4-candidate`. An external consumer citing it is citing
  provenance that cannot presently be resolved.
- **Next recommended work:** carry ADR 0010 into the next release whose lineage legitimately contains
  it. No patch release is to be cut solely to publish it: that would make documentation
  discoverability a release vehicle without a substantive release reason. Remote `main` stays at
  `06feba7d…` — advancing it would implicitly settle what post-release administrative lineage belongs
  there, whether the `v1.1.0` remote tip was deliberately frozen, and how the candidate lineage
  relates to `main`, none of which an external citation has the authority to decide. Independently:
  widen language coverage in the leakage and seed detectors beyond Python, the one gap where a
  mechanism plausibly exists and is not yet built.
