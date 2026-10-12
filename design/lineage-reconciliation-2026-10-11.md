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
   share only `06feba7` (v1.1.0). Computed with `git diff --name-only 06feba7 <ref>` on each side,
   both `main` and `v1.6.0` changed six files: `CHANGELOG.md`, `artifacts/catalog-baseline.json`,
   `project-policy.yml`, `rules/evaluation.json`, `scripts/standards.mjs`, and
   `artifacts/backlog/README.md` (added independently on both sides). `v1.4.0` and `v1.5.0` share the
   first five; `af4120f` shares twelve (those six plus `artifacts/backlog/scope.md`,
   `rules/framing.json`, `rules/leakage.json` and three `standards/` files). `VERSION` was changed
   only on the divergent side: it is 1.1.0 on `main` and `git log 06feba7..0a389fd -- VERSION` is
   empty. The divergent side also has backlog item files, and `main` has none.
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
| `test/catalog.test.mjs` and the loader (`scripts/catalog.mjs`) | The loader rejects an entry missing a required string, lifecycle field, `$assuranceNote` (when assurance is not `full`) or, for a non-exemptible entry, `$exemptibilityNote`. The test "every rule resolves to a standard file and to a real heading in it" iterates `catalog.rules` only and requires `### <requirement> —` in the named `standards/NN-*.md`. | A recovered project-facing rule needs its prose heading on `main`. An invariant has `standard: null` and is not asked for a heading. |
| Prose-to-catalog level agreement | **No gate on `main` checks it.** `scripts/fidelity.mjs:85-100` reads the source prompt and `standards/*.md` and never loads the catalog; `scripts/inventory.mjs` reads the source prompt and the inventory JSON; `test/catalog.test.mjs` checks that a heading exists, not its modal verb. | A recovered rule whose prose says a different strength passes every gate silently (see the `unquantified` row). |
| `npm run integrity` | `scripts/integrity.mjs` iterates the **baseline's** locked entries and compares each with the live catalog (rules and invariants): a locked entry removed, reclassified, lowered, made exemptible or attestable, or with weaker verification is a finding and exits 3. A live entry that is **not** in the baseline is only listed ("new rules are not violations, but the baseline should cover them") and this command exits 0. **The full suite does enforce it**: `test/integrity.test.mjs:50-55` ("the live catalog matches its reviewed baseline") loads `artifacts/catalog-baseline.json` and asserts `report.unlocked` is empty and `lockedCount === liveCount`, so `npm test` fails. | A baseline entry for every recovered catalog entry, invariants included, is **required**, not optional: omitting it passes `npm run integrity` (exit 0) but fails `npm test`, which is the CI `test` step. Today 53 locked = 53 live; one unlocked addition reads 53 locked, 54 live and fails that test. The `CHANGELOG.md` record is the practice the baseline's own comment names, not a gate. |
| `test/fe24-requirement-additions.test.mjs` | Iterates `catalog.rules.values()` only (project-facing rules): the three FE-24 ids must be the only non-`recommendation` rules with `introducedIn: "2.0.0"`. It never iterates `catalog.invariants`. Separately: `baseline.frameworkVersion` equals `VERSION`, and the three ids are present in the baseline. | A project-facing requirement or prohibition restamped 2.0.0 fails it; a recommendation may carry 2.0.0. An invariant is **not covered**: any `introducedIn` string is mechanically allowed on `invariant.acceptance-locked`, including 1.3.0 and 2.0.0. See 5.2 for what a stamp means; extending the test to invariants is an optional follow-up decision, not a requirement of recovery. |
| `npm run inventory`, `fidelity`, `diagrams` | **`inventory`** (`scripts/inventory.mjs`) reads the source prompt and `artifacts/standards-source-inventory.json`, and for `standards/` only lists the file **names**: it fails if a claimed `implementedBy` path is missing or a `standards/NN-*.md` file is unclaimed. It never reads a standard's contents. **`fidelity`** (`scripts/fidelity.mjs`) reads the contents of `standards/NN-*.md`, but verifies only the blocks that explicitly claim to be reproduced verbatim from the source (a claim sentence immediately before a fenced block, blockquote or list) against `artifacts/prompts/ml-standards-spec.md`. **`diagrams`** (`scripts/diagrams.mjs`) walks the tree (skipping `.git`, `node_modules`, `fixtures`, line 30) and iterates the **`.mmd` source files it finds** (lines 84-135): each must appear verbatim as a `mermaid` fence in some `.md` (lines 96-106), and a rendered `.svg` beside it must record its hash (lines 108-134); a `.svg` with no `.mmd` is a finding (lines 137-148). Embedded fences are collected (lines 78-82) but only as a lookup for those `.mmd` files; a fence with no corresponding `.mmd` is never examined. | **No gate checks a prose edit as such.** Adding R6 to Standard 11 or changing R3 in Standard 20 is seen by `fidelity` only if the edit contains a verbatim-claim block, and by `test/catalog.test.mjs` only as "the heading exists" and (for headings) the spec-item citation test. A new `standards/NN-*.md` file would trip `inventory`. ADRs, scripts and `design/` prose are outside all three; `diagrams` covers a recovered document only where a corresponding `.mmd` source is also recovered; a Mermaid fence embedded in an ADR or design document without its `.mmd`, and edited or stale, passes silently, so a green `diagrams` run says nothing about it. A recovered `.svg` without its `.mmd` fails. |
| `npm test`, `scan`, `evaluate` | `node --test` runs the files in `test/`; `scan .` and `evaluate .` run the repository's own detectors and verdict over its own files, which include Markdown and scripts. | A recovered test runs in `npm test` and a failing one breaks it. Recovered scripts and documents become scan input; `main`'s `evaluate` currently reports COMPLIANT (see the CI row). Whether the scan produces new findings was not run. |
| CI surface | `.github/workflows/ci.yml` on `main` lists eight steps; there is no pipeline script. | Adding a gate means adding a step there (or porting the pipeline, see the CI row). |

No gate checks Markdown links or ADR numbering. Those are correctness requirements for the
recovery, not enforced ones.

### 5.1 Per item

| Item | Needed to recover onto `main` | Open question the owner decides |
|---|---|---|
| `invariant.acceptance-locked` (an **invariant**; the catalog entry only) | Entry in `rules/invariants.json`. **No `project-policy.yml` entry**: naming it there exits `npm run policy` with 3. **No change to the `applicability` count.** Baseline entry in `artifacts/catalog-baseline.json` (**required**: invariants are locked there too, and `test/integrity.test.mjs:50-55` fails `npm test` when a live entry is missing from the baseline, see 5.0), with the `CHANGELOG.md` record. **That is all the entry needs to load and pass every gate on `main`**; it needs none of the acceptance tooling. Its own text does name the tooling: v1.6.0's `remediation` says "Run `npm run acceptance` ... update artifacts/acceptance-baseline.json" and its `evidenceExpected` names a clean run of `scripts/acceptance.mjs`. Recovering the entry without the tooling therefore leaves a required rule whose evidence is a command that does not exist, which is a **wording or adoption choice recorded with the entry**, not a precondition. The tooling is the separate `acceptance.mjs` row, and the reverse coupling runs the other way: `test/acceptance-lock.test.mjs:115` asserts the invariant exists, is non-exemptible and is locked in the baseline, so the test needs the entry. ADR 0008 is also a separate item. Running the acceptance command in CI is a further separate step (it is its own command, not part of `evaluate`, and is not one of `main`'s eight steps). | Whether `main` wants a lock on accepted states beside the integrity lock, and if the entry is recovered, whether it is recovered with the acceptance tooling or with adjusted wording. Classification under the CHANGELOG policy. The `introducedIn` stamp: nothing mechanical constrains it (5.0), so the choice is about truth, see 5.2. `nonExemptible: true` is a normative choice. |
| `evaluation.resampling-not-by-default` (project-facing recommendation) | Entry in `rules/evaluation.json` naming Standard 11 R6. **`standards/11-class-imbalance.md` on `main` has R1 to R5 and no R6**, so the entry fails the heading test in 5.0 until the R6 section exists; that section is a prose recovery (the divergent file differs by 38 changed lines). No gate checks its content; the heading test only requires that the heading exists. **One `applicability` entry** in `project-policy.yml` (`status`, a reason over 40 characters, `revisitWhen`; the v1.6.0 entry is not-applicable because no model is trained here); without it the completeness test fails, because it compares the applicability count with the rule count. Baseline entry (**required**: `test/integrity.test.mjs:50-55` fails `npm test` without it, although `npm run integrity` exits 0) and `CHANGELOG.md` record. `test/v13-replay.test.mjs` and `test/fixtures/v13-rule-contracts.json` on v1.6.0 pin rule contracts; their relevance on `main` was not established. | Re-stamp of `introducedIn` 1.4.0 (a version `main` never had). Whether the recommendation, and the prose it needs, is still wanted. |
| `evaluation.unquantified-difference-not-claimed` (project-facing recommendation, branch-only) | Entry in `rules/evaluation.json` naming Standard 20 R3 (the heading exists on `main`, so the heading test passes). One `applicability` entry, a **required** baseline entry (`npm test` fails without it) and CHANGELOG record, as for the row above. **Prose and level disagree on `main`**: `standards/20-uncertainty.md` R3 states "MUST NOT" where the divergent line's R3 states "SHOULD NOT" and the catalog says recommendation. The correction is a prose edit that ADR 0012 decides, and no gate on `main` would notice it missing (5.0). Recovering the rule without that edit leaves the disagreement; recovering the edit is a prose change that no gate checks beyond the heading test (see the inventory and fidelity row in 5.0). | Same stamp question: `2.0.0` on the branch is a different, uncut MAJOR from `main`'s unreleased 2.0.0. The FE-24 test allows a recommendation to carry 2.0.0, but the meaning would be conflated. Whether to recover a rule that never shipped in a tag, and with or without the R3 modal edit. |
| ADRs 0007 to 0010 | Files in `artifacts/adr/` under their original numbers (0007 to 0013 are free on `main` today; any ADR added first forces renumbering and rewriting of every cross-link). Each ADR is recoverable on its own as a record; links to artifacts the owner does not recover (ADR 0007 cites `design/negative-evidence-audit.md`; ADR 0008 cites `scripts/acceptance.mjs` and `artifacts/acceptance-baseline.json` and amends 0005, unmodified in the divergent line) are rewritten as references to the divergent ref rather than left dangling. ADR 0009 records a scope decision (fairness conditionally in scope); whether its consequences exist in `main`'s standards or catalog was **not established here**. No gate enforces any of this. | Adopt the decisions on `main`, or record them as historical only, per ADR. |
| ADRs 0011 to 0013 | Files as above, each recoverable on its own as a record. ADR 0013 designs `scripts/levels.mjs`; recovering the ADR without the script is coherent only if the ADR is marked as describing a guard `main` does not have. ADR 0012 decides prose and level corrections: at least one is not on `main` (Standard 20 R3 states MUST NOT where the catalog level is recommendation); the other corrections were not checked. | **`scripts/levels.mjs` is a real choice with a stated consequence:** no gate on `main` provides prose-to-catalog level agreement (`scripts/fidelity.mjs:85-100`, 5.0), so declining it leaves that link unguarded, as it was before ADR 0013. Whether to recover the decisions without the guard. |
| `standards-adapter.json`, `test/adapter-contract.test.mjs` (**not named by the owner**; listed in 4.3, so it has a row rather than being lost) | The contract is a consumer-facing declaration for StandardsEnforcer: it invokes `scripts/standards.mjs evaluate --dir={target} --policy={policy} --json`. **`main`'s `scripts/standards.mjs` has no `--policy` option** (searched; the divergent file differs by 152 lines and v1.6.0's commit `eda15a2` is "Let an invocation name the policy to apply"), and `main`'s `README.md`, `INSTRUCTIONS.md` and `PROJECT.md` do not mention an adapter. The contract test reads the documented verdict invocation from `README.md` at run time and runs the CLI against an external temporary target; on `main` it would fail on both counts, in `npm test`, until the CLI option and the README line exist. | Whether `main` publishes an adapter contract at all, and so whether the policy-selection CLI change comes with it. Independent of the acceptance, CI and submit-pr items. |
| `scripts/acceptance.mjs`, `artifacts/acceptance-baseline.json`, `test/acceptance-lock.test.mjs` and the `package.json` script `acceptance` (one item) | `acceptance.mjs` runs `scripts/standards.mjs evaluate --dir=<temp> --json` for each locked state and reads the named rule's result (a rule id absent from the catalog is an error). It reads `artifacts/acceptance-baseline.json`, which must be **generated from `main`'s evaluator and reviewed**: the v1.6.0 baseline was produced by v1.6.0's evaluator (29 files differ from `main`, including `scripts/standards.mjs` and `scripts/compliance.mjs`). The script has no meaning without that baseline and the baseline none without the script. It locks states only for rules that have a mechanism; it says itself that human-judgement rules have no observable acceptance predicate. The test file asserts the invariant is in the catalog and the baseline, so it needs the invariant's entry. | Adopted or declined as a unit, independently of the invariant's catalog entry (the entry can exist without the tooling; see the invariant row for its wording). |
| `scripts/ci*`, `ci.Dockerfile`, `compose.ci.yml`, `docs/local-ci.md` | Port against `main`'s tree: `scripts/ci-pipeline.mjs`, `scripts/ci.sh`, `scripts/ci.ps1`, `scripts/ci-entrypoint.sh`, the Dockerfile, compose file and document, with the `package.json` script `ci` only. `scripts/ci-pipeline.mjs` is the authoritative stage list on v1.6.0 (commit-provenance, dependency-freedom, inventory, fidelity, policy, integrity, acceptance, diagrams, test, scan, self-verdict); `main`'s `ci.yml` runs eight steps ending in `evaluate`. Consequences found in v1.6.0's own tests and stages, each a choice rather than a given: (a) `test/local-ci.test.mjs` requires `ci.yml` to invoke `node scripts/ci-pipeline.mjs` and not to re-declare `run: npm run <script>` steps, so `ci.yml` is rewritten and hosted CI changes shape; (b) the same file hard-codes the ids that must survive, including `acceptance` and `self-verdict`, so a pipeline ported without the acceptance stage fails that test unless the test is amended; (c) the `self-verdict` stage accepts only `NOT_EVALUATED` with 0 applicable rules, while `main`'s `evaluate` reports `COMPLIANT` today (the 1.4.2 change to that behaviour is part of the 29-file difference), so a ported stage fails on `main`'s engine unless the stage is changed or the engine recovered. This row does not add the `submit-pr` script; that belongs to the submit-pr row. | Containerised local CI is a tooling decision. Whether `ci.yml` keeps enumerating steps, and how (b) and (c) are resolved. |
| `scripts/submit-pr.*` | `scripts/submit-pr.mjs`, `.ps1`, `.sh` and the `package.json` script `submit-pr`. **Depends on the CI row, one way**: it consumes the pipeline's evidence directory and commit-provenance stage, so it cannot be recovered without the pipeline; the pipeline does not need it. Port and verify against `main`'s tree. | Whether the exact-commit submission rule is wanted on `main`; declining it leaves the CI row unaffected. |

### 5.2 Cross-cutting questions

- **Version arithmetic.** `main` is 1.1.0 with an unreleased MAJOR (`introducedIn: "2.0.0"`) for
  N3, N5 and N8, declared as such in `CHANGELOG.md`, and `baseline.frameworkVersion` must equal
  `VERSION`. No gate compares `introducedIn` with `VERSION`, and the FE-24 test does not look at
  invariants, so every stamp passes mechanically. Whether a stamp is **true** is the question: a stamp
  ahead of `VERSION` is honest only as a declared unreleased MAJOR (as `main` does for 2.0.0);
  1.3.0 and 1.4.0 are neither released on this tree nor declared. A stamp is an owner decision, and
  extending the FE-24 test to invariants is an optional follow-up, not part of any recovery.
- **FE-24 interaction.** The FE-24 additions and the divergent additions touch the same files
  (`rules/evaluation.json`, `artifacts/catalog-baseline.json`, `project-policy.yml`,
  `CHANGELOG.md`). Recovery order and the baseline relock need a design before any file moves.
- **Public tags.** Recovering content from a tagged tree does not change the tags; whether the
  tags are ever annotated as superseded is a separate decision not taken here.
- **Dependencies between items, one way, so each can be declined alone.**
  `submit-pr` needs the CI pipeline. The pipeline's own test (b) needs the acceptance stage unless
  amended. `acceptance.mjs` and `acceptance-baseline.json` need each other. The `resampling` rule
  needs Standard 11 R6 prose. The `unquantified` rule does not need ADR 0012's modal edit to load,
  but is inconsistent with `main`'s prose without it. ADRs need nothing and are recoverable on
  their own, with their links rewritten. The invariant's catalog entry needs none of the acceptance tooling to load or pass a gate (its wording names the tooling; see its row), while the acceptance test needs the entry.
- **Adapter.** `standards-adapter.json` needs the CLI's `--policy` option and a README line; it
  needs none of the other items, and none of them needs it.
- **Provenance.** Any recovered file should carry its source ref and SHA so the divergent line
  stays the evidence of record.
- **Not verified.** Whether each v1.6.0 script and test runs unchanged on `main`'s `scripts/` was not
  executed; the 29 modified files (notably `scripts/standards.mjs`, `scripts/compliance.mjs`,
  `scripts/ownership.mjs`) are the places it could differ.

## 6. Retained for the owner

Not decided here, and not decidable by documentation: recover or decline each item in section 5.1;
any change to the tags; any version change; any merge of the divergent line; any release; the
closure of FE-24; whether the content in 4.4 and the adapter row (not named by the owner) is added to FE-38's scope.
