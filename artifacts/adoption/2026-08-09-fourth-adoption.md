# Fourth adoption — an independently owned target

**Date:** 2026-08-09 · **Framework version under test:** `v1.1.0`, **unchanged throughout** ·
**Protocol:** [the one committed in `5c77e72`](2026-08-09-fourth-adoption-protocol.md), applied as
written. Selection happened before any tooling was run.

## Target and provenance

| | |
| --- | --- |
| Repository | `https://github.com/ultralytics/yolov5.git` |
| Owner | Ultralytics — no relationship to this repository or its author |
| Clone date | 2026-08-09 |
| HEAD at clone | `20d1d78a08277e365d57bfa3a2cce752772d9e59`, committed 2026-08-02 |
| First commit | `1e84a23f38fad9e52b59101e9f1246d93066ed1e`, **2020-05-29**, Glenn Jocher |
| History | 3,028 commits |
| Tracked files | 144 — 52 Python, 3 notebooks, 29 dataset configs |

**Predates MachineLearningStandards by just over six years.** This repository's first commit is
`6397011`, 2026-08-09. The target could not have been influenced by these standards.

Cloned unchanged. Nothing was removed, prepared, or reorganised. The pristine clone was scanned
first, and the raw output of that run is preserved below verbatim, including the parts that later
turned out to be wrong.

### Criteria check, recorded before running the tooling

| Required criterion | Met | Evidence |
| --- | --- | --- |
| Unrelated author and owner | Yes | Ultralytics / Glenn Jocher |
| Predates MachineLearningStandards | Yes | 2020-05-29 vs 2026-08-09 |
| Genuine ML training and evaluation work | Yes | `train.py`, `val.py`, `segment/`, `classify/`, a hyperparameter-evolution loop |
| Non-trivial | Yes | 52 Python files, 3,028 commits, six years |
| Unmodified for the standards | Yes | read-only clone |

Preferred criteria also met: conventional open-source layout, real CI, notebooks, production history.
The target was **not** selected on expected outcome, and it is neither an exemplary nor a messy
repository — it is a widely used one, which is the relevant kind of independence.

Object detection was not a criterion, but it matters to what follows: the first three targets were
tabular competition ML. This one shares none of that idiom.

## Raw first run — `scan`, pristine clone, `v1.1.0`

```text
  144 file(s) examined  (scope: git-tracked)

  [info]    ml-footprint                      37 files
  [info]    data-artifacts-observed           29 artifacts
  [info]    experiment-tooling-observed       2 files
  [info]    notebooks-observed                3 notebooks
  [error]   unpinned-dependencies             19 entries    reproducibility.dependencies-pinned
  [warning] notebook-state                    3 notebooks   reproducibility.notebook-hygiene
  [error]   model-card-missing                              deployment.model-card
  [error]   data-card-missing                               data.provenance-documented
  [error]   evaluation-results-undocumented                 evaluation.baseline-exists
```

`evaluate` on the pristine clone exited **2**: no `project-policy.yml`. Correct — a configuration
error, not a compliance result, and no verdict was invented. The verdict run below therefore used a
working copy, exactly as the first three adoptions did; the pristine clone was never written to.

## Raw first run — `init` and `evaluate`, working copy

`init` created `project-policy.yml`, `PROJECT.md`, `MODEL_CARD.md`, `DATASET.md`, and the artifact
directories, and **refused** `AGENTS.md` and `CLAUDE.md` because the target already has real ones.
Exit 1, conflicts named, nothing overwritten. This is the first target that owned files the
bootstrap wanted, and the refusal behaved correctly.

```text
  Status: NON_COMPLIANT
  Score:  80%  (required- and forbidden-level rules that were evaluated: 5)
  Rules:  5 passed, 1 failed, 1 warning(s), 38 skipped
  Cover:  7 automated, 0 attested, 3 insufficient evidence, 35 not evaluated
  Framework: 10 of 45 rules are machine-examined, across 25 of 25 standards.

  failed   reproducibility.dependencies-pinned    19 entries name no exact version
  warning  reproducibility.notebook-hygiene       3 notebooks carry committed outputs
  passed   data.version-pinned
  passed   leakage.no-preprocessing-leakage
  passed   split.no-test-set-tuning
  passed   reproducibility.seeds-recorded
  passed   reproducibility.experiment-config-recorded
  insufficient-evidence   deployment.model-card · data.provenance-documented · evaluation.baseline-exists
```

The three document rules stayed at `insufficient-evidence` **after** `init` wrote their templates.
The v1.1 scaffolding fix holds on a repository it was not developed against.

---

## Classification

### True positives — target properties, correctly found

**`reproducibility.dependencies-pinned` — failed.** `requirements.txt` declares 19 entries with no
exact version: `matplotlib>=3.3`, `torch>=1.8.0`, `psutil` with no bound at all. Real, verified,
and a genuine reproducibility gap for a repository that publishes exact mAP figures. Whether a
widely consumed project *should* pin exactly is a legitimate argument — it is an argument with the
standard, made by the target, and the standard does not move for it.

**`reproducibility.notebook-hygiene` — warning.** All three notebooks carry committed outputs.
True as stated. Worth recording that these are *tutorial* notebooks whose outputs are the
documentation, and the remediation ("strip outputs") would damage them. The rule is a
recommendation at warning severity and does not block, so the framework's response is proportionate.
Filed as an observation, not a defect: the standard does not currently distinguish an experiment
record from a demonstration, and one external target is not enough to say it should.

**The three `insufficient-evidence` document rules.** Verified by reading the repository: yolov5 has
no intended-use statement, no limitations section, and no exclusions or population description for
any dataset. The content genuinely is absent. The framework said "I do not have this", not "you
failed" — the right disposition.

**`reproducibility.seeds-recorded` — passed, correctly.** `utils/general.py:168` defines
`init_seeds(seed, deterministic)`, called from all three training entry points with
`deterministic=True`. A real pass on real evidence.

### Framework defects — established

**1 · A required rule passed on evidence of something else.**

`data.version-pinned` reported *"No violation of data.version-pinned was observed"* and scored as a
pass. yolov5 pins no dataset version anywhere: no `.dvc`, no lockfile, no manifest, no checksums;
`data/*.yaml` point at download URLs that resolve to whatever the host currently serves.

Cause, at `scripts/standards.mjs:570`:

```js
const artifactApi = codeFiles.some((f) => /(use_artifact|log_artifact|mlflow\.data|dvc\.api)/.test(f.views.structure));
```

Every `log_artifact` call in the target logs **model weights**:

```text
utils/loggers/wandb/wandb_utils.py:118   model_artifact.add_file(".../last.pt")  → wandb.log_artifact(...)
utils/loggers/__init__.py:289            wandb.log_artifact(best, type="model")
utils/loggers/__init__.py:416            wandb.Artifact(..., type="model")       → wandb.log_artifact(art)
```

The fourth is inside a deprecated Comet integration behind an opt-in `--upload_dataset` flag.

This is the use/mention discipline failing one level above the syntax it was built for. The check
correctly distinguishes *mentioning* an API from *calling* it, and then treats a call that versions
models as a call that versions data. It is the exact failure class this repository exists to
catch — a required, error-severity rule reporting a pass with nothing behind it — and it survived
three prior adoptions because none of them called an artifact API at all.

**2 · Work in the working tree is invisible until it is committed.**

The documented adoption workflow is `init` → edit the documents → `evaluate`. Every file `init`
writes is untracked, and scope is `git ls-files`, so none of them is read. A first-time adopter's
completed work does not exist as far as the evaluator is concerned.

Controlled test, one variable:

| State of a completed `MODEL_CARD.md` | `deployment.model-card` | Score | Scored rules |
| --- | --- | --- | --- |
| Written, untracked | insufficient-evidence | 80% | 5 |
| `git add MODEL_CARD.md`, content identical | **passed** | 83% | 6 |

Nothing changed but the index. The ownership model is right — a project states what it owns — but
`git ls-files` answers "what is committed", and an adopter's uncommitted work is owned by them in
every sense that matters. This defect was introduced by the v1.1 scope fix and was invisible on the
first three targets, where the relevant files were already committed. It took a fresh external
adoption to surface it, which is the argument for external adoption in one line.

### Framework defect — candidate, weaker evidence

**3 · Detectors pass when their vocabulary is absent, not merely when they find nothing.**

yolov5 contains **zero occurrences of sklearn**. `train_test_split`, `StratifiedKFold`,
`GroupKFold`, `X_test` — none appear. Detectors A1 and A2 read exactly that vocabulary, found
nothing to read, and both rules reported `evaluated / passed` and were scored:

```text
passed   leakage.no-preprocessing-leakage   (prohibition, forbidden, nonExemptible)
passed   split.no-test-set-tuning           (prohibition, forbidden, nonExemptible)
```

Meanwhile `train.py:785–861` runs a hyperparameter-evolution loop that selects individuals by
`results[2]` — mAP@0.5 from `validate.run(..., dataloader=val_loader)` — on the same `val2017` split
the README reports as the headline figure. That is squarely the question
`split.no-test-set-tuning` exists to raise.

**It is not a violation.** `data/coco.yaml` declares a separate `test: test-dev2017.txt`, the README
labels its numbers `mAP^val` throughout, and tuning on a validation split and labelling it as such
is correct practice. **Target violation first — and on inspection there is no violation.** The
defect is the framework's, and it is about disposition rather than accuracy: the honest output was
"this requires human judgement", and what it printed was "passed".

This is `invariant.no-silent-pass` one level deeper than the v1.1 fix. There, a detector whose
*trigger* never fired reported a pass. Here the trigger fired, the detector ran, and the idiom it
reads does not exist in the target's dialect. Filed as a candidate rather than a confirmed defect
because the fix is not obvious — "the vocabulary is absent" is itself a heuristic, and a wrong one
would convert every correct pass into a shrug.

### Not found

- **No applicability error.** No rule fired where it had no subject.
- **No ownership or scope error.** A fresh clone has nothing ignored on disk; 144 tracked, 144
  present. The scope model neither helped nor hurt here, which is worth saying plainly rather than
  claiming a success it did not earn.
- **No standard required weakening, exception, or target-specific accommodation.** Four adoptions,
  zero.

### Evidence-request quality, and house style

The requests were readable and actionable, and nothing was asked for that only makes sense in the
author's own projects. Two observations, neither producing a wrong conclusion:

- The document checks match headings **exactly** — `/^##+\s*(Evaluation|Results|Performance)\s*$/i`.
  Every heading in the target's README carries an emoji (`## 🤔 Why YOLOv5?`, `### Pretrained
  Checkpoints`), so none can ever match. The substance of a results table exists at README:225 and
  the framework cannot see it. It responded `insufficient-evidence` rather than guessing, which is
  the correct failure direction, but the recognition vocabulary is narrower than the field's.
- `data-artifacts-observed` counted 29 dataset *config* files as data artifacts. The label is loose;
  the downstream inference — that this project uses datasets, so provenance and versioning
  apply — is right.

---

## What this adoption does and does not establish

**Establishes:** the evaluation *mechanism* generalises to an independently owned repository, in a
different ML subfield, written by people with no knowledge of this framework. It ran, it produced
mostly correct conclusions, it refused to overwrite the target's files, it declined to score without
a policy, and it did not treat its own scaffolding as evidence.

**Does not establish:** that the 25 standards are true or complete. Those are different claims, and
only the first is on the table here. A single external target exercised ten automated rules and
declared thirty-five to require human judgement; nothing in this experiment tested whether those
thirty-five are the right thirty-five, or whether the twenty-five standards cover the domain.

**Also does not establish** anything about the standards' correctness from the target's
disagreements. yolov5's unpinned dependencies are a target property. The framework's `passed` on
`data.version-pinned` is a framework defect. Those were classified separately and on evidence, which
is the whole discipline.

## Disposition

Two established defects and one candidate. Recorded as **post-`1.1` candidates**. Classification and
remediation are separate decisions, and this document is only the first. `v1.1.0` was not modified
during the experiment and is not modified by this record.
