# Detector design

What the scanner looks for, what each finding is allowed to claim, and — at equal length — what
was deliberately not built. This document precedes the implementation, so that detector capability
cannot quietly define what the standards are.

The governing constraint is the source brief's, and the two halves of it are in tension: automate
leakage and reproducibility checks where reasonably possible, and *do not create automated checks
that merely provide false confidence*. Section 3 is where that tension is resolved, by naming the
checks whose only output would be a green tick on a question they cannot answer.

---

## 1. The use/mention rule

Every code file is split into three views before any pattern is applied, and each detector reads
exactly one:

| View | Contents | Used for |
|---|---|---|
| `structureOf` | comments removed, **string contents blanked** | code signals — `train_test_split(`, `.fit(`, `random_state=` |
| `sourceOf` | comments removed, **strings intact** | library matching only, because an import specifier *is* a string |
| `commentsOf` | comment text only | marker scanning |

The rule exists because the alternative failure is common and embarrassing: prose that *names*
scikit-learn reported as *use* of scikit-learn, a commented-out `train_test_split` counted as a
split, a docstring containing `X_test` counted as a test-set reference. A library name is only ever
matched import-shaped. A scan for a code signal reads only code.

Comment syntax is selected per extension rather than assumed: `#` opens a comment in Python and a
private field in JavaScript, and `//` is a comment in JavaScript and floor division in Python.

Notebooks are parsed as JSON, their code-cell sources concatenated, and the result fed through the
same three views. Cell outputs and execution counts are read only by the notebook-state detector,
which is about the outputs themselves.

---

## 2. Detectors

### Descriptive — always `info`, bound to no rule, never a verdict

These report what a project *has*. They inform applicability and give an agent context. None of
them passes or fails anything.

| Id | Reads | Reports | Label |
|---|---|---|---|
| `ml-footprint` | `sourceOf`, import-shaped: scikit-learn, torch, tensorflow, keras, xgboost, lightgbm, catboost, statsmodels, transformers; plus filenames matching `train*.py` | Whether this project does machine learning at all | INFERRED |
| `data-artifacts-observed` | file tree: `.csv`, `.parquet`, `.feather`, `.dvc`, `dvc.lock`, LFS patterns | What data-shaped artifacts exist | OBSERVED |
| `experiment-tooling-observed` | `sourceOf` imports of mlflow, wandb, hydra, sacred, optuna; presence of `params.yaml`, `conf/`, `configs/` | Tooling is present. An import is a mention, not evidence of tracked experiments | INFERRED |
| `metrics-observed` | `structureOf`: `accuracy_score(`, `f1_score(`, `roc_auc_score(`, `mean_squared_error(`, `log_loss(`, `precision_`, `recall_` | Which metrics appear in code — **reported, never judged** | INFERRED |
| `notebooks-observed` | `.ipynb` files and whether they carry outputs | Inventory for the notebook-state check | OBSERVED |
| `model-artifacts-observed` | committed `.pkl`, `.joblib`, `.pt`, `.h5`, `.onnx` | Serialized models in version control | OBSERVED |

`ml-footprint` doubles as the **applicability gate**. Where it does not fire, ML-subject rules
report `not-evaluated` with the reason "no ML footprint observed" rather than passing by default —
which is also why this repository's own scan produces no ML findings.

### Rule-bound — absence, contradiction, or a gap in evidence

Two finding shapes matter here and the engine treats them differently. A **violation** is evidence
that a rule was broken; it fails the rule. An **evidence gap** (`evidenceGap: true`) is the absence
of an artifact the rule requires; it reports `insufficient-evidence`, and the remediation is to
produce the artifact rather than to undo something.

| Id | Rule | Shape | Reads | Assurance |
|---|---|---|---|---|
| `preprocessing-fit-before-split` | `leakage.no-preprocessing-leakage` | violation, warning | `structureOf` per Python file: a preprocessing constructor (StandardScaler, MinMaxScaler, OneHotEncoder, SimpleImputer, TfidfVectorizer, PCA) whose `.fit(`/`.fit_transform(` appears **before** the file's first `train_test_split(`, `KFold(`, `TimeSeriesSplit(`, `GroupKFold(`, `StratifiedKFold(`. Fires only when both appear in the same file | partial |
| `test-identifier-in-fit` | `split.no-test-set-tuning` | violation, error | `structureOf`: a `.fit(`-family call whose argument list contains `X_test`, `y_test`, `x_test`, `test_X`, `df_test`, `test_df` | partial |
| `seed-absence` | `reproducibility.seeds-recorded` | evidence gap, warning | `structureOf` across the footprint: none of `random_state=`, `np.random.seed(`, `torch.manual_seed(`, `tf.random.set_seed(`, `random.seed(`, `seed_everything(` | partial |
| `unpinned-dependencies` | `reproducibility.dependencies-pinned` | violation, error | `requirements*.txt` entries lacking `==`/`===`/a URL pin; `pyproject.toml` with no lockfile; `environment.yml` dependencies without `=`. Names each entry | partial |
| `notebook-state` | `reproducibility.notebook-hygiene` | violation, warning | `.ipynb` JSON: code cells with non-empty `outputs`; non-monotonic `execution_count` | partial |
| `dataset-manifest-missing` | `data.version-pinned` | evidence gap, error | fires only when data artifacts exist: no `.dvc`, `dvc.lock`, manifest, or adjacent checksum file | partial |
| `experiment-config-missing` | `reproducibility.experiment-config-recorded` | evidence gap, error | fires only when training-shaped code exists: none of `params.yaml`, a `conf/`/`configs/` directory with YAML, or call-shaped tracking usage | partial |
| `model-card-missing` | `deployment.model-card` | evidence gap, error | no `MODEL_CARD.md`/`model-card.md`/`docs/model*card*`, and no `## Model card` or `## Limitations` **heading** in README or docs | partial |
| `data-card-missing` | `data.provenance-documented` | evidence gap, error | no `DATASET.md`/`DATA_CARD.md`, and no `## Provenance`/`## Collection`/`## Exclusions` heading | partial |
| `baseline-section-missing` | `evaluation.baseline-exists` | evidence gap, error | evaluation documents exist but carry no `## Baseline` heading and no baseline row in a results table | partial |

Headings, not words. A heading is a structural claim about a document's contents; the word
"limitations" appearing in a sentence is a mention. Matching prose would let any document that
discusses the concept satisfy a rule asking for a section about it.

`EVALUATED_RULES` is exactly the ten rule ids above. A rule outside that set is never reported as
passing, and a test asserts the set and the bindings are the same collection in both directions.

---

## 3. Checks deliberately not built

Building any of these later requires amending this section and
[ADR 0004](../artifacts/adr/0004-honest-automation.md). The list is normative.

| Not built | Why it would be false confidence |
|---|---|
| Target leakage from feature names or correlations | Feature semantics are not in the text. Name similarity fails in both directions constantly — `label_encoder` is not leakage, `days_since_last_contact` may be — and a strong correlation is what a *good* feature looks like. A passing result would imply "no target leakage", which no static scan can establish. |
| Temporal leakage beyond in-file ordering | Whether information was available at prediction time lives in data values and join semantics. Flagging date-column usage would be guessing dressed as analysis. |
| Metric appropriateness | Whether accuracy suffices depends on the class distribution and the cost of an error, and the auditor can see neither. Metrics found in code are reported descriptively and bound to no rule. |
| Calibration verification | Requires running the model against data. Outside a static auditor's contract. |
| Cherry-picked evaluation periods; hidden segments | The auditor cannot see the periods and segments that were *not* reported. Undetectable by construction — the purest attestation cases in the framework. |
| Re-running training to verify reproducibility | Executing the code under audit violates this tool's contract and its zero-dependency posture. A partial rerun that agrees in a different environment establishes less than it appears to. |
| Cross-validation scheme appropriateness | Inferring that data is temporal or grouped from column names invites confident wrongness in both directions. |
| Fabrication of any kind | Nothing in a repository distinguishes a real number from an invented one. |

Two patterns recur in that table and are worth naming. Several checks fail because the evidence is
**semantic** — it depends on what a column means. The rest fail because the evidence is **absent by
construction** — the thing to detect is something that was omitted, and an omission leaves no trace.
No amount of engineering moves a check from the second group.

---

## 4. Bounds

`MAX_FILES` 20000, `MAX_READ_BYTES` 400000 per file, `MAX_EVIDENCE` 12 paths per finding. Skipped
directories: `.git`, `node_modules`, `dist`, `build`, `out`, `.next`, `.venv`, `venv`,
`__pycache__`, `target`, `vendor`, `coverage`, `.pytest_cache`, `.idea`, `.vscode`, and
`fixtures` — the last so that this repository's own test fixtures, which contain deliberate
violations, do not make it report itself non-compliant. The scanner also excludes its own source
file, because it names every library it searches for.

Where a bound truncates, the finding says so. Silent truncation reads as complete coverage.
