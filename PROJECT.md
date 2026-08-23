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
| Backlog | `artifacts/backlog/` — scope and exclusions in [`scope.md`](artifacts/backlog/scope.md) |
| Decision records | `artifacts/adr/` |
| Design records | `design/` |
| Documentation | `docs/` |

## Current state

- **Current status:** IN_PROGRESS — the corpus and gates are complete through `1.5.0`; publication
  of those releases is partial, and all of it is collaborator-scoped: the repository is private
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
- **Remote branch lineage:** `origin/main` is unchanged at
  `06feba7d10c96fc363f8c3004c595c72276682d7`, exactly the peeled commit of `v1.1.0`. Neither
  publishing the two tags nor pushing the branch below moved it, and under ADR 0010 neither was
  going to. A second remote branch now exists — `unreleased/publication-state-correction`, carrying
  the publication-state records. It is not a release authority, and `main` remains the default.
- **Release lineage location:** `v1.0.0`–`v1.2.0` are reachable from local `main`. `v1.3.0`, `v1.4.0`,
  `v1.4.1` and `v1.5.0` are not: they are reachable from `v1.4-candidate`, which is 19 commits ahead
  of local `main` and contains it entirely, and from `design/publication-state-correction`, which is
  21 ahead of local `main` and 2 ahead of `v1.4-candidate`. Local `main` is itself 5 commits ahead of
  `origin/main`.
- **Known risks:** most rules rest on attestation, because most machine-learning failures leave no
  trace in a repository. A project that attests carelessly will report compliant; the digest
  mechanism limits the blast radius rather than removing it.
- **Known blockers:** consumer availability is partial, and its ceiling is lower than this document
  previously implied. **The repository is private**, so no ref resolves for anyone outside the
  account and its collaborators — including the published `v1.4.0` and `v1.5.0` tags. Earlier
  wording here claimed public reachability the remote has never had; it is corrected rather than
  quietly dropped. Within that ceiling, a collaborator pinning `v1.4.0` or `v1.5.0` can resolve it;
  one pinning any other release cannot. Separately,
  [ADR 0010](artifacts/adr/0010-published-release-tags-are-public-authorities.md) — the record that
  states what publishing a release tag means — is now reachable from the remote, at
  `refs/heads/unreleased/publication-state-correction`. It remains absent from **every** tag,
  published or not, so no release carries it and no pin resolves it; that branch is the only ref
  that does. The branch is movable by design, so its tip is deliberately not recorded here as an
  identity — a citation that must not drift should name the commit instead,
  `e30a84c6ffd74b9401d9e3ec0ffe08fb8cfa703d`.
- **Next recommended work:** decide whether ADR 0010 should eventually be carried by a release. It
  is resolvable now, so nothing is blocked on it, and no patch is to be cut solely to publish it —
  that would make documentation discoverability a release vehicle without a substantive release
  reason. None is available in any case: the normative surface has not moved since `1.5.0`. Genuine
  public resolution remains a separate decision about visibility across the whole portfolio, and is
  not taken here. Remote `main` stays at
  `06feba7d…` — advancing it would implicitly settle what post-release administrative lineage belongs
  there, whether the `v1.1.0` remote tip was deliberately frozen, and how the candidate lineage
  relates to `main`, none of which an external citation has the authority to decide. Independently:
  widen language coverage in the leakage and seed detectors beyond Python, the one gap where a
  mechanism plausibly exists and is not yet built.
