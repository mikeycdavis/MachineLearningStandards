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

`main` has 53 rules. The tags have 52 (a different set). Three rules named by the owner exist
only on the divergent line.

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

This is the **work implied by `main`'s own gates**, observed in the FE-24 re-cut (PR #64, #65) and
in the `main` CI. It is a list of requirements to decide on, not a plan and not an estimate.
Every row also depends on the cross-cutting questions in 5.1.

| Item | Needed to recover onto `main` | Open question the owner decides |
|---|---|---|
| `invariant.acceptance-locked` | Catalog entry in `rules/invariants.json`; its entry in `artifacts/catalog-baseline.json` (integrity compares locked to live, now 53 = 53); `project-policy.yml` declaration (the policy test requires every rule be addressed); `scripts/acceptance.mjs`, `artifacts/acceptance-baseline.json` and `test/acceptance-lock.test.mjs` re-based on `main`'s catalog; ADR 0008 | Whether `main` wants a second lock beside the integrity lock; classification under the CHANGELOG policy (adding a required rule reads as MAJOR); non-exemptible status is a normative choice |
| `evaluation.resampling-not-by-default` | Catalog entry in `rules/evaluation.json`; baseline entry; policy declaration; the replay tripwire test (`v13-replay`) or an equivalent that asserts it is the only addition at its level | Re-stamp of `introducedIn` 1.4.0, a version `main` never had; whether the recommendation is still wanted |
| `evaluation.unquantified-difference-not-claimed` | As above, plus a decision about a rule that was never tagged | Same re-stamp question (2.0.0 on the branch collides with `main`'s separate unreleased 2.0.0); whether to recover a rule that never shipped |
| ADRs 0007 to 0010 | Copy as Accepted records with a note of their original lineage; update links among ADRs; ADR 0007 amends 0004 and 0006 on `main`, so those need a cross-reference review | Whether `main` adopts the decisions, or records them as historical only |
| ADRs 0011 to 0013 | Same, plus `scripts/levels.mjs` and its tests, because ADR 0013 describes a guard | They concern prose-to-catalog level agreement; whether `main`'s existing fidelity gate already covers it must be established first |
| `scripts/acceptance.mjs` | See the invariant row; `package.json` script and a CI step | Is it adopted with its rule, or declined with its rule |
| `scripts/ci*`, `ci.Dockerfile`, `compose.ci.yml`, `docs/local-ci.md` | Port and verify against `main`'s tree and its eight CI commands; `package.json` script `ci`; `ci.yml` stays the hosted authority | Containerised local CI is a tooling decision independent of any rule |
| `scripts/submit-pr.*` | Port and verify; it assumes the divergent pipeline (ADR commit "A pull request may only carry a commit that passed", `90573be`) | Whether the process rule is wanted on `main` |

### 5.1 Cross-cutting questions

- **Version arithmetic.** `main` is 1.1.0 with an unreleased MAJOR (`introducedIn: "2.0.0"`) for
  N3, N5 and N8. The divergent line has 1.3.0, 1.4.0 and 2.0.0 stamps from a different history.
  Recovering any rule means choosing its stamp on `main`'s line.
- **FE-24 interaction.** The FE-24 additions (N3, N5, N8) and the divergent additions touch the
  same files (`rules/evaluation.json`, `artifacts/catalog-baseline.json`, `project-policy.yml`).
  Recovery order and baseline relock need a design before any file moves.
- **Public tags.** Recovering content from a tagged tree does not change the tags; whether the
  tags are ever annotated as superseded is a separate decision not taken here.
- **Provenance.** Any recovered file should carry its source ref and SHA so the divergent line
  stays the evidence of record.

## 6. Retained for the owner

Not decided here, and not decidable by documentation: recover or decline each item in section 5;
any change to the tags; any version change; any merge of the divergent line; any release; the
closure of FE-24; whether the content in 4.4 is added to FE-38's scope.
