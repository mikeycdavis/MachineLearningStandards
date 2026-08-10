# Machine Learning Standards

An auditable standards system for machine-learning work. Not a collection of best practices: a
structured, testable mechanism for deciding what must be done, what must never be done, when a
standard applies to a project, what evidence demonstrates compliance, how that compliance is
verified, and when a past decision has to be revisited.

It exists to prevent invalid models, misleading evaluation, leakage, overfitting, irreproducible
experiments, and unjustified claims about model quality.

**This repository is standalone.** It is independently maintained and depends on no other standards
repository, and it has no third-party dependencies at all — Node 18 or later, and nothing to
install.

---

## Questions this repository answers

| Question | Where the answer lives |
| --- | --- |
| What must be done | `requirement` entries in [`rules/`](rules), and the `R` sections of each standard |
| What should normally be done | `recommendation` entries |
| What must never be done | `prohibition` entries, and the `## Prohibitions` section of each standard. First-class, never buried in prose |
| What must never be done *to the standards themselves* | the invariants in [`rules/invariants.json`](rules/invariants.json) |
| When a standard applies here | `applicability` in the project's `project-policy.yml`, proposed by each rule's triggers |
| What evidence demonstrates compliance | `evidenceExpected` on every rule; `standards explain` prints it |
| How compliance is verified | each rule's verification method, and its honest `assurance` — with a note saying what a pass does *not* prove |
| When to revisit a decision | `revisitWhen` on every declaration, plus stale-attestation and applicability-drift detection in `standards status` |

---

## The standards

| # | Standard | Prohibitions | Automated checks |
| --- | --- | --- | --- |
| 1 | [Problem Formulation](standards/01-problem-formulation.md) | — | — |
| 2 | [Baseline Models](standards/02-baseline-models.md) | 1 | 1 |
| 3 | [Dataset Provenance](standards/03-dataset-provenance.md) | 2 | 1 |
| 4 | [Dataset Versioning](standards/04-dataset-versioning.md) | — | 1 |
| 5 | [Train, Validation, and Test Separation](standards/05-train-validation-test-separation.md) | 1 | — |
| 6 | [Temporal Splitting](standards/06-temporal-splitting.md) | 2 | — |
| 7 | [Feature Availability](standards/07-feature-availability.md) | 1 | — |
| 8 | [Leakage](standards/08-leakage.md) | 1 | 1 |
| 9 | [Target Leakage](standards/09-target-leakage.md) | 1 | — |
| 10 | [Cross-Validation](standards/10-cross-validation.md) | 1 | — |
| 11 | [Class Imbalance](standards/11-class-imbalance.md) | — | — |
| 12 | [Metric Selection](standards/12-metric-selection.md) | 2 | — |
| 13 | [Calibration](standards/13-calibration.md) | 1 | — |
| 14 | [Hyperparameter Tuning](standards/14-hyperparameter-tuning.md) | 1 | 1 |
| 15 | [Reproducibility](standards/15-reproducibility.md) | 2 | 3 |
| 16 | [Random Seeds](standards/16-random-seeds.md) | — | 1 |
| 17 | [Feature Lineage](standards/17-feature-lineage.md) | — | — |
| 18 | [Ablation](standards/18-ablation.md) | — | — |
| 19 | [Model Comparison](standards/19-model-comparison.md) | 3 | — |
| 20 | [Uncertainty](standards/20-uncertainty.md) | — | — |
| 21 | [Drift](standards/21-drift.md) | 1 | — |
| 22 | [Retraining](standards/22-retraining.md) | — | — |
| 23 | [Inference Behavior](standards/23-inference-behavior.md) | — | — |
| 24 | [Monitoring](standards/24-monitoring.md) | — | — |
| 25 | [Model Limitations](standards/25-model-limitations.md) | 1 | 1 |

The counts above are per standard. For the totals, and for what they are over, run
`npm run evaluate` — every figure in this system is derived from the catalog at run time rather
than typed into prose, because a typed number is a second definition that goes stale.

The empty cells in the last column are the honest part. Most machine-learning failures leave no
trace in a repository: a cherry-picked evaluation period, a hidden segment, a fabricated metric.
Those rules are enumerated, explained, and attestable, and no check pretends to verify them. See
[ADR 0004](artifacts/adr/0004-honest-automation.md) for the eight checks that were deliberately
not built and why.

---

## Adopting it

Start with [INSTRUCTIONS.md](INSTRUCTIONS.md).

```bash
node <this-repo>/scripts/standards.mjs init .        # bootstrap a project
node <this-repo>/scripts/standards.mjs scan .        # what does it have?
node <this-repo>/scripts/standards.mjs evaluate .    # does it comply?
```

**Do not copy the standards documents into your repository.** Reference the version in your
`project-policy.yml`.

---

## Conclusions

Per project, in precedence order:

`BLOCKED_BY_INVARIANT` · `NOT_EVALUATED` · `NON_COMPLIANT` · `COMPLIANT_WITH_EXCEPTIONS` ·
`COMPLIANT`

`BLOCKED_BY_INVARIANT` outranks everything, including non-compliance, and carries its own exit
code. The two answer different questions: non-compliant means the work does not meet the standard,
blocked means the standard is not currently trustworthy as a measure — and a number computed
against a tampered ruler should not be published.

Exit codes throughout: `0` ok, `1` findings or non-compliant, `2` the tool could not reach a
verdict, `3` blocked by an invariant.

---

## The integrity invariant

> A human or AI must never bypass, weaken, remove, reclassify, reinterpret, falsify evidence for,
> or manipulate a standard, test, applicability determination, evidence requirement, or
> verification mechanism solely because it prevents the desired implementation or conclusion.

Stated as a sentence, that is a sentence. It is enforced along six routes, each closing a specific
way somebody under deadline pressure gets to a false green: a reviewed
[catalog baseline](artifacts/catalog-baseline.json) that makes a weakened rule visible; a reviewed
[acceptance baseline](artifacts/acceptance-baseline.json) that makes a widened rule visible, which
the catalog baseline could not — it locks what a rule *is*, not what it *accepts*; policy
weakening detection, so a rule cannot be neutered locally instead; attestations that never override
a mechanism; content digests, so an approval expires when what it approved changes; and mutation
tests that reintroduce each defect and confirm the guard still fires.
[ADR 0005](artifacts/adr/0005-integrity-invariant-enforcement.md) records the reasoning.

---

## Layout

```
standards/     25 normative documents
rules/         the machine-readable catalog, and the system invariants
schemas/       the contract a project's policy must satisfy
scripts/       the CLI and its checks
templates/     what `standards init` writes into a project
test/          the suites, and fixture repositories with deliberate violations
artifacts/     the source prompt, the derived specification, the locked
               enumeration and baseline, decision records, and the plan
design/        the architecture record and the detector design
docs/          generated architecture documentation
```

## Commands

`npm test` · `npm run scan` · `npm run evaluate` · `npm run policy` · `npm run integrity` ·
`npm run acceptance` · `npm run inventory` · `npm run fidelity` · `npm run diagrams`

CI runs all nine, and gates on `evaluate`.

## Conventions

Standards are named `NN-<kebab-title>.md`, zero-padded so a directory listing sorts numerically.
Rule ids are `category.kebab-case-name`, canonical only — there is no alias mechanism, because
aliases exist to reconcile a vocabulary that was allowed to fork.

## Decisions

- [0001](artifacts/adr/0001-standalone-domain-first-design.md) — standalone, domain-first design
- [0002](artifacts/adr/0002-the-spec-is-a-derived-enumeration.md) — the specification is a derived enumeration
- [0003](artifacts/adr/0003-prohibitions-and-invariants-are-first-class.md) — prohibitions and invariants are first-class
- [0004](artifacts/adr/0004-honest-automation.md) — honest automation, and the checks not built
- [0005](artifacts/adr/0005-integrity-invariant-enforcement.md) — how the integrity invariant is enforced

- [0006](artifacts/adr/0006-scaffolding-and-scope.md) — scaffolding is not evidence, and scope is ownership
- [0007](artifacts/adr/0007-evidence-must-establish-its-subject.md) — evidence must establish its subject, and silence must be earned
- [0008](artifacts/adr/0008-acceptance-lock.md) — lock what a rule accepts, not only how it is classified

Design records: [architecture](design/architecture.md) · [detectors](design/ml-audit-detectors.md) ·
[negative-evidence audit](design/negative-evidence-audit.md)

## Adoption record

The framework has been run against three real machine-learning repositories, and what that found is
recorded rather than summarised away. `v1.0.0` is tagged unchanged so the evidence against it stays
measurable.

- [First adoption](artifacts/adoption/2026-08-09-first-adoption.md) — two targets; found that the
  bootstrap manufactured compliance and the scanner read code the project did not write
- [Third adoption](artifacts/adoption/2026-08-09-third-adoption.md) — a differently shaped target;
  found that truncation made findings order-dependent
- [v1.1 comparison](artifacts/adoption/2026-08-09-v1.1-comparison.md) — the same three targets after
  remediation, measured against the frozen baseline
- [Fourth adoption protocol](artifacts/adoption/2026-08-09-fourth-adoption-protocol.md) — selection
  criteria for an independently owned target, written before the target was chosen
- [Fourth adoption](artifacts/adoption/2026-08-09-fourth-adoption.md) — `ultralytics/yolov5`,
  unrelated owner, six years older than this repository, run against unmodified `v1.1.0`. Two
  framework defects established; no standard required changing

- [v1.2 comparison](artifacts/adoption/2026-08-09-v1.2-comparison.md) — the four-target corpus across
  three releases, each run from its own tag. Scores fell on unchanged repositories, which is the
  point

## Review record

- [Normative standards review](artifacts/review/2026-08-09-normative-standards-review.md) — all 108
  normative claims assessed against the methodology literature. 95 established, 0 contested, 0
  unsupported; 18 findings, one of them an internal contradiction between two standards, six of them
  candidate gaps. **Evidence only — no standard was changed.**
- [Candidate disposition](artifacts/review/2026-08-09-candidate-disposition.md) — each of the 18
  findings put through evidence, a candidate remedy, and a counterexample to that remedy. **One
  finding of eighteen supports changing an existing claim.** Dispositions only; nothing scheduled

- [Release isolation, v1.4.0](artifacts/review/2026-08-09-v1.4-release-isolation.md) — the check that
  the release contains the intended lineage and nothing else
- [Review method](artifacts/review/review-method.md) — standing rules for future normative audits,
  written after the first one produced two false findings by reading normative sentences without
  their qualifications

The adoptions establish that the evaluation mechanism generalises; the review is the separate and
harder question of whether the standards themselves are correct and complete.

## Adoption notes

The first three targets share an owner, so what they establish is structural. The fourth is
independently owned, and establishes that the **evaluation mechanism** generalises. Neither
establishes that the twenty-five standards are true or complete — a different claim, and untested.
How a release is judged is stated in [CHANGELOG.md](CHANGELOG.md): a version is not better for
reporting fewer unknowns, only for reporting them more accurately.
