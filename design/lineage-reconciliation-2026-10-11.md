# Lineage reconciliation record, 2026-10-11

**Status:** Decision recorded; recovery decisions unresolved.
**Decision owner:** Mike (project owner), approved 2026-10-11T20:56:07Z.
**Baseline read:** `origin/main` at `0a389fde0f584939225e32c5f78924298e97ebed`.
**Tracked as:** FE-38 (#66, parent EP-12). Related: FE-24 (#42), which stays open.

This is a documentation record. It changes no rule, no script, no tag, no version and no
release. Nothing on the divergent line is merged, discarded, moved or deleted by it.

## 1. What was decided

The owner adopted strategy **S3, supersede**:

- `main` remains the active lineage.
- The tags `v1.4.0`, `v1.5.0` and `v1.6.0` remain as historical, divergent tags. They are not
  moved, deleted, re-cut or reconciled by this decision.
- The strategy, the tag and commit facts, and the content that `main` does not contain are
  recorded here as **unresolved reconciliation evidence**.
- Whether any of that content is recovered is a separate decision, prepared as FE-38.

### Why S3

The reasons are the facts in section 2, stated rather than argued:

1. `main` is where the work since 2026-09-22 happened (10 commits: backlog migration to GitHub
   Issues, PR #64, PR #65). It is also the lineage with a green hosted CI run on its head
   (push run 37407527013 at `0a389fd`, conclusion success).
2. The divergent line is not a candidate for a fast-forward or a clean merge: `main` and each tag
   share only `06feba7` (v1.1.0), and both sides changed `VERSION`, `CHANGELOG.md`, the catalog
   baseline and the backlog (the divergent side has item files, `main` has none).
3. The tags are published. ADR 0010 (on the divergent line only) records that published tags are
   public authorities. Moving or deleting them would be a different and larger decision than
   leaving them.
4. Superseding preserves every option: nothing is destroyed, so every recovery decision stays open.

## 2. Facts

All counts below were computed in a fresh clone on 2026-10-11 with `git rev-list` and
`git merge-base`; the tag SHAs are the peeled commits (the tags are annotated).

| Fact | Value |
|---|---|
| `main` head | `0a389fd` (VERSION 1.1.0) |
| Merge-base of `main` and every tag | `06feba7` (v1.1.0, 2026-08-09) |
| `v1.4.0` | `6bfd078` (2026-08-09, VERSION 1.4.0); tag object `4860e34` |
| `v1.5.0` | `d9cffa1` (2026-08-10, VERSION 1.5.0); tag object `57bd1a4` |
| `v1.6.0` | `eda15a2` (2026-08-22, VERSION 1.6.0); tag object `8ee36e8` |
| Commits on the tag not on `main` | v1.4.0: 10, v1.5.0: 13, v1.6.0: 29 |
| Commits on `main` not on any tag | 10 (`401a389` through `0a389fd`; 2026-09-22 to 2026-10-05) |
| `v1.4.0` ancestor of `v1.5.0` ancestor of `v1.6.0` | yes, both |
| Tags reachable from `main` | none |
| Remote tags | `v1.4.0`, `v1.5.0`, `v1.6.0` only (`git ls-remote --tags origin`) |
| `design/publication-state-correction` | `af4120f` (2026-10-05, VERSION 3.0.0); 46 commits past `06feba7`, 17 past `v1.6.0`, and `v1.6.0` is its ancestor |
| `unreleased/publication-state-correction` | `f465c1f` (VERSION 1.5.0); the parent of `v1.6.0` and an ancestor of `af4120f` |
| Diff `main` to `v1.6.0` | 87 files added, 29 modified, 3 deleted |
| PR #63 | closed unmerged (the old FE-24 integration, head `af4120f`); superseded by #64 and #65 |

`CHANGELOG.md` on `main` already records the tags as "on the remote but not reachable from this
tree ... recorded as unreconciled". This record is the first place the content is enumerated.

Tags `v1.0.0` to `v1.3.0` and `v1.4.1` appear in ADR 0010's local-tag list and in the divergent
`CHANGELOG.md`, but are not on the remote. They are not part of this record.

## 3. What this decision does not do

- Create, move, delete or re-sign any tag.
- Change `VERSION`, `package.json`, or the catalog baseline `frameworkVersion` (all 1.1.0).
- Merge, rebase, cherry-pick, rewrite or delete the divergent line or its branches.
- Cut or prepare a release.
- Close FE-24. FE-24 criterion 3 (locally versioned) is unmet by the owner's 2026-10-05 decision,
  and criterion 4 (published) is out of its scope. It stays open.
- Decide any recovery. Each recovery is a separate owner decision under FE-38.

## 4. Unresolved: content the active lineage does not contain

"Where it lives" is verified by `git ls-tree` / `git grep` on the named ref. Nothing here has been
judged correct, compatible with `main`, or worth recovering.

### 4.1 Catalog rules

`main` has 53 catalog entries: 48 project-facing rules and 5 invariants (`catalog.rules.size` and
`catalog.invariants.size`). The tags have 52 entries, 6 of them invariants. Three rules named by the
owner exist only on the divergent line. **Classification matters for recovery**: invariants are
loaded from `rules/invariants.json` into a separate map and are not project-adjustable; the other
two are project-facing.

| Rule id | Where it lives | Kind / level | `introducedIn` | Notes |
|---|---|---|---|---|
| `invariant.acceptance-locked` | `rules/invariants.json` on v1.4.0, v1.5.0, v1.6.0, `af4120f` | invariant, required, non-exemptible | 1.3.0 | Added by `62f7426` (2026-08-09). Locks what a rule accepts, not only how it is classified (ADR 0008). `main` has 5 invariants, v1.6.0 has 6. |
| `evaluation.resampling-not-by-default` | `rules/evaluation.json` on v1.4.0, v1.5.0, v1.6.0, `af4120f` | recommendation, recommended | 1.4.0 | Added by `6c4f8ea` (2026-08-09). EP-12 (#13) records that a test asserts it was the only catalog addition in 1.4.0. |
| `evaluation.unquantified-difference-not-claimed` | `rules/evaluation.json` on `af4120f` **only** | recommendation, recommended | 2.0.0 | Added by `a8d57c5` (2026-08-26). **Not in any tag**: absent from v1.6.0. It is branch-only. |

### 4.2 Architecture decision records

`main` has ADRs 0001 to 0006.

| ADR | Title | Where it lives |
|---|---|---|
| 0007 | Evidence must establish its subject, and silence must be earned | v1.4.0, v1.5.0, v1.6.0, `af4120f` (added `9538cba`, 2026-08-09) |
| 0008 | Lock what a rule accepts, not only how it is classified | v1.4.0, v1.5.0, v1.6.0, `af4120f` |
| 0009 | Fairness and protected-group performance are conditionally in scope | v1.6.0, `af4120f` (not v1.5.0) |
| 0010 | Published release tags are immutable public authorities | v1.6.0, `af4120f` (not v1.5.0) |
| 0011 | The catalog states a rule's level; prose states the rule | `af4120f` **only** (not in any tag) |
| 0012 | Three prose modals are wrong, and two catalog levels are | `af4120f` **only** |
| 0013 | The prose-to-catalog link gets a guard, and it reports rather than adjudicates | `af4120f` **only** |

ADR 0002 also differs on `af4120f` (modified, not added).

### 4.3 Scripts and tooling

| Artifact | Where it lives | Wired by |
|---|---|---|
| `scripts/acceptance.mjs`, `artifacts/acceptance-baseline.json`, `test/acceptance-lock.test.mjs` | v1.4.0 onward, `af4120f` | `package.json` script `acceptance` (v1.6.0:17); ADR 0008 |
| `scripts/ci.sh`, `scripts/ci.ps1`, `scripts/ci-entrypoint.sh`, `scripts/ci-pipeline.mjs`, `ci.Dockerfile`, `compose.ci.yml`, `docs/local-ci.md`, `test/local-ci.test.mjs` | v1.6.0, `af4120f` (not v1.4.0 or v1.5.0) | `package.json` script `ci` (v1.6.0:21) |
| `scripts/submit-pr.mjs`, `scripts/submit-pr.ps1`, `scripts/submit-pr.sh` | v1.6.0, `af4120f` | `package.json` script `submit-pr` (v1.6.0:22) |
| `scripts/levels.mjs`, `test/levels.test.mjs`, `test/fidelity.test.mjs` | `af4120f` **only** | ADRs 0011 to 0013 |
| `standards-adapter.json`, `test/adapter-contract.test.mjs` | v1.6.0, `af4120f` | policy selection / adapter schema 1.1.0 (v1.6.0 release) |

### 4.4 Other divergent content, listed so that it is not lost

Not named by the owner, so not carried into FE-38's scope unless the owner adds it: review records
(`artifacts/review/2026-08-09-*`, `2026-08-26-n6-redisposition.md`, `review-method.md`), adoption
records (`artifacts/adoption/2026-08-09-*`), `design/negative-evidence-audit.md`, the divergent
backlog item files (superseded by the GitHub Issues on `main`), and tests
(`explicit-policy`, `no-verdict-without-evidence`, `self-evaluation`, `v12-remediations`,
`v13-replay`).

The same gap is visible in the backlog: `backlog-gh.mjs reconcile` on 2026-10-11 reports 31 evidence
entries on closed items whose paths do not exist on `main` (ADRs 0007 to 0013, `scripts/levels.mjs`,
several tests). Those items are COMPLETE on the divergent line; their evidence points at paths this
lineage does not hold. That is expected under S3 and is not a closure error.

## 5. What each item would need to be recovered

This is the **work implied by `main`'s own gates**, read from `scripts/` and `test/` on `main` at
`0a389fd` and checked against the divergent tree at `v1.6.0` / `af4120f`. It is a list of
requirements to decide on, not a plan and not an estimate. Every row also depends on 5.2.

### 5.0 The gates a recovery has to pass on `main`

| Gate | What it enforces (source) | Consequence for recovery |
|---|---|---|
| `npm run policy` | `scripts/policy.mjs`: a policy that names an invariant under any section is `policy.invariant-addressed`; status `BLOCKED_BY_INVARIANT`, **exit 3** | An invariant is never declared in `project-policy.yml`. |
| `test/policy.test.mjs` (completeness) | `Object.keys(policy.applicability).length === catalog.rules.size`, each with a reason over 40 characters and a `revisitWhen`. `catalog.rules` holds project-facing rules only (`scripts/catalog.mjs`). | Every recovered **project-facing** rule needs exactly one `applicability` entry; an invariant needs none. Today 48 rules and 48 entries. |
| `npm run integrity` | `scripts/integrity.mjs` compares live rules **and invariants** with `artifacts/catalog-baseline.json`; a new entry is reported "not yet in the baseline"; the baseline is deliberately updated, with the reason in `CHANGELOG.md`. | Each recovered entry, invariant included, is locked in the baseline. Today 53 locked = 53 live. |
| `test/fe24-requirement-additions.test.mjs` | Only the three FE-24 ids may carry `introducedIn: "2.0.0"` with a kind other than `recommendation`; `baseline.frameworkVersion` must equal `VERSION`. | A recovered requirement, prohibition or invariant restamped 2.0.0 fails that test unless the test is amended deliberately; a recommendation may carry 2.0.0. |
| `npm run inventory`, `fidelity`, `diagrams` | Standards source inventory, verbatim-claim fidelity, diagram freshness. | ADRs and `design/` documents are outside these gates; they are affected only if a recovery edits `standards/`, `docs/architecture.mmd` or the inventory. |
| `npm test`, `scan`, `evaluate` | Whole suite; the scan and evaluate of this repository itself. | Each recovered test runs here; a recovered script that fails on `main`'s tree breaks the suite. |
| CI surface | `.github/workflows/ci.yml` on `main` lists eight steps; there is no pipeline script. | Adding a gate means adding a step there (or porting the pipeline, see the CI row). |

No gate checks Markdown links or ADR numbering. Those are correctness requirements for the
recovery, not enforced ones.

### 5.1 Per item

| Item | Needed to recover onto `main` | Open question the owner decides |
|---|---|---|
| `invariant.acceptance-locked` (an **invariant**) | Entry in `rules/invariants.json`. Entry in `artifacts/catalog-baseline.json` (invariants are locked there too; locked becomes 54 = 54 with it alone). **No `project-policy.yml` entry**: naming it there exits `npm run policy` with 3. **No change to the `applicability` count.** `CHANGELOG.md` record for the baseline change. `scripts/acceptance.mjs`, `test/acceptance-lock.test.mjs` and a `package.json` script `acceptance`. A **new** `artifacts/acceptance-baseline.json` generated from `main`'s evaluator and reviewed: the v1.6.0 baseline was produced by v1.6.0's evaluator (29 files differ from `main`, including `scripts/standards.mjs` and `scripts/compliance.mjs`), so copying it would assert states `main` need not produce. ADR 0008 (it cites the script and the baseline). A CI step, because `acceptance` is not one of `main`'s eight. | Whether `main` wants a lock on accepted states beside the integrity lock. Classification under the CHANGELOG policy. The `introducedIn` stamp (1.3.0 names a version `main` never held; 2.0.0 is blocked by the FE-24 pinning test as written). `nonExemptible: true` is a normative choice. |
| `evaluation.resampling-not-by-default` (project-facing recommendation) | Entry in `rules/evaluation.json`. Baseline entry (locked 53 to 54 with it alone). **One `applicability` entry** in `project-policy.yml` (`status`, a reason over 40 characters, `revisitWhen`; the v1.6.0 entry is not-applicable because no model is trained here). `CHANGELOG.md` record. The v1.6.0 replay tripwire (`test/v13-replay.test.mjs`, with `test/fixtures/v13-rule-contracts.json`) needs porting or an equivalent, and has to be reconciled with `main`'s FE-24 pinning test. | Re-stamp of `introducedIn` 1.4.0 (a version `main` never had). Whether the recommendation is still wanted. |
| `evaluation.unquantified-difference-not-claimed` (project-facing recommendation, branch-only) | As the row above: rule entry, baseline entry, one `applicability` entry, CHANGELOG record, test coverage. | Same stamp question: `2.0.0` on the branch is a different, uncut MAJOR from `main`'s unreleased 2.0.0 (a recommendation may carry it under the pinning test, but the meaning would be conflated). Whether to recover a rule that never shipped in a tag. |
| ADRs 0007 to 0010 | Files in `artifacts/adr/` under their original numbers (0007 to 0013 are free on `main` today; any ADR added first forces renumbering and rewriting of every cross-link). Resolve links: ADR 0007 cites `design/negative-evidence-audit.md`; ADR 0008 cites `scripts/acceptance.mjs` and `artifacts/acceptance-baseline.json` and amends 0005 (unmodified in the divergent line). ADR 0009 records a scope decision (fairness conditionally in scope); whether its consequences exist in `main`'s standards or catalog was **not established here**, so it should not be recovered as a bare decision without that check. | Adopt the decisions on `main`, or record them as historical only. |
| ADRs 0011 to 0013 | Files as above. ADR 0013 cites `scripts/levels.mjs` and `scripts/ci-pipeline.mjs`, so it goes with the guard it describes or states that the guard is not adopted; ADR 0012 records prose and level corrections to standards that `main` may already hold (not established). | Whether `main`'s fidelity gate already covers what 0013 describes (not established); whether to recover the decisions without the guard. |
| `scripts/acceptance.mjs` | See the invariant row. It shells out to `main`'s `evaluate` and reads `artifacts/acceptance-baseline.json`; it has no meaning without that baseline. | Adopted with its rule or declined with its rule. |
| `scripts/ci*`, `ci.Dockerfile`, `compose.ci.yml`, `docs/local-ci.md` | Port against `main`'s tree. `scripts/ci-pipeline.mjs` is the authoritative stage list on v1.6.0 and its stages (commit-provenance, dependency-freedom, inventory, fidelity, policy, integrity, acceptance, diagrams, test, scan, self-verdict) differ from `main`'s `ci.yml` steps (which end in `evaluate`, where the pipeline has a self-verdict stage). `test/local-ci.test.mjs` asserts that the workflow runs the pipeline and that the old workflow's checks "are all still gates"; both need re-deriving against `main`'s eight. `ci.yml` is rewritten to call the pipeline, so hosted CI's shape changes. `package.json` scripts `ci` and `submit-pr`. The `acceptance` stage exists only if the invariant row is adopted. | Containerised local CI is a tooling decision independent of any rule. Whether `ci.yml` keeps enumerating steps. |
| `scripts/submit-pr.*` | Port and verify; it assumes the pipeline's evidence directory and commit-provenance stage, so it depends on the CI row. | Whether the exact-commit submission rule is wanted on `main`. |

### 5.2 Cross-cutting questions

- **Version arithmetic.** `main` is 1.1.0 with an unreleased MAJOR (`introducedIn: "2.0.0"`) for
  N3, N5 and N8, and `baseline.frameworkVersion` must equal `VERSION`. The divergent line has 1.3.0,
  1.4.0 and 2.0.0 stamps from a different history. No gate compares `introducedIn` with `VERSION`,
  so a stamp ahead of `VERSION` would pass mechanically while being untrue; recovery should choose
  stamps deliberately.
- **FE-24 interaction.** The FE-24 additions and the divergent additions touch the same files
  (`rules/evaluation.json`, `artifacts/catalog-baseline.json`, `project-policy.yml`,
  `CHANGELOG.md`). Recovery order and the baseline relock need a design before any file moves.
- **Public tags.** Recovering content from a tagged tree does not change the tags; whether the
  tags are ever annotated as superseded is a separate decision not taken here.
- **Provenance.** Any recovered file should carry its source ref and SHA so the divergent line
  stays the evidence of record.
- **Not verified.** Whether each v1.6.0 script and test runs unchanged on `main`'s `scripts/` was not
  executed; the 29 modified files (notably `scripts/standards.mjs`, `scripts/compliance.mjs`,
  `scripts/ownership.mjs`) are the places it could differ.

## 6. Retained for the owner

Not decided here, and not decidable by documentation: recover or decline each item in section 5.1;
any change to the tags; any version change; any merge of the divergent line; any release; the
closure of FE-24; whether the content in 4.4 is added to FE-38's scope.
