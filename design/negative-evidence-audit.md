# The negative-evidence audit

**Date:** 2026-08-09 · **Scope:** all ten machine-examined rules · **Prompted by:** the fourth
adoption, [`2026-08-09-fourth-adoption.md`](../artifacts/adoption/2026-08-09-fourth-adoption.md),
candidate finding 3.

## The question

A detector that emits nothing has said something. The audit asks what.

```text
When this detector emits nothing, does that mean:

  A. evidence establishes compliance
  B. no violation was observed
  C. the detector was not applicable
  D. the detector lacked sufficient subject coverage
```

`A` and `B` may be reported as a pass. `C` is already handled — a detector whose trigger never
fired is excluded from the examined set, which v1.1 fixed. **`D` is the gap**: the detector ran, its
subject was absent, and its silence was being read as a pass.

The governing statement:

> Absence of a detector finding establishes compliance only when the detector has sufficient subject
> coverage to make absence probative.

The audit was run over all ten rules rather than the two the adoption exposed, because fixing only
the observed cases would have concealed whether the problem was general. It was not general — but it
was larger than the adoption showed, and one of the three defects below was found here rather than
in the field.

## The audit

| # | Rule | Silence means | Verdict |
| --- | --- | --- | --- |
| A1 | `leakage.no-preprocessing-leakage` | no scikit-learn preprocessor was fitted before a scikit-learn splitter — **or neither idiom exists in this codebase** | **D — defect** |
| A2 | `split.no-test-set-tuning` | no conventionally test-named object reached a fit-family call — **or neither the convention nor the call shape exists** | **D — defect** |
| A3 | `reproducibility.seeds-recorded` | a seed-setting expression was found. Positive evidence, not absence | B — sound |
| A4 | `reproducibility.dependencies-pinned` | a dependency manifest exists and every entry names an exact version | B — sound |
| A5 | `reproducibility.notebook-hygiene` | notebooks exist, none carries committed outputs, execution counts are ordered | B — sound |
| A6 | `data.version-pinned` | a pinning artifact exists **or an artifact API is called** | **defect — subject fidelity** |
| A7 | `reproducibility.experiment-config-recorded` | a config artifact exists **or a tracking call appears** | **defect — subject fidelity** |
| A8 | `data.provenance-documented` | a completed provenance section answers the question | A — sound |
| A9 | `deployment.model-card` | a completed model card answers the question | A — sound |
| A10 | `evaluation.baseline-exists` | a substantive baseline section or results row exists | A — sound |

Three of ten. The pattern is legible: **every sound detector's silence rests on something the
detector positively saw** — a seed, a pinned entry, a clean notebook, a completed section. Every
defective one's silence rests on an absence, or on an OR-branch that accepts a different subject.

### D — the coverage defects, A1 and A2

Both read one dialect. A1 reads a scikit-learn preprocessor fitted before a scikit-learn splitter;
A2 reads a `X_test`-shaped identifier passed to `.fit()`. The adoption target contains **zero
occurrences of scikit-learn**, so both detectors examined nothing about their rules and both
prohibitions — `forbidden`, `nonExemptible` — reported passed and were scored.

Nothing is wrong with the detectors. They read what they can read, and their assurance is already
declared `partial`. What was wrong was converting their silence into a pass.

**Remediated.** Each detector now declares a coverage gap when its subject is absent, and a rule
with a coverage gap and no finding reports `not-evaluated` with the reason stated, routing to human
judgement. Both directions are tested: a project using the idiom correctly still passes.

### Subject fidelity — A6 and A7

A different failure with the same consequence. Here the detector saw something; it just was not the
thing the rule is about.

**A6** accepted any occurrence of `use_artifact`, `log_artifact`, `mlflow.data` or `dvc.api` as
evidence that datasets are versioned. All four `log_artifact` sites in the adoption target log
`type="model"`. Versioning a model is not versioning the data it was trained on.

**A7** was found by this audit, not by the adoption. It accepted `wandb.init(` or
`mlflow.start_run(` as evidence that the experiment configuration is recorded. Opening a tracking
session is not recording a parameter set. On the adoption target the call happens to pass
`config=opt`, so the target's verdict does not change — which is the right shape for a fix: it
corrects the reasoning without moving an answer that was already right for the wrong reason.

The discipline this extends, stated in full:

```text
mention        ≠ use
use            ≠ relevant use
relevant use   ≠ sufficient evidence
no finding     ≠ compliance
```

The existing use/mention rule handles the first line. The third is what these two defects violate,
and it needs subject identity carried all the way through: **evidence for a rule must establish the
subject of that rule, not a structurally similar activity.** The fourth is the coverage rule above,
in its shortest form.

The whole chain reduces to one sentence, and this is the durable statement of it:

> **Detector silence can support compliance only when that silence follows from something the
> detector positively established about the relevant subject.**

Seven of ten checks satisfy it and three did not, so this is an empirical result about this
codebase before it is a philosophical preference.

## Noted, not remediated

**A3 accepts a seed found anywhere in the ML code**, not specifically in the training path. A
project seeding an unrelated utility while leaving training unseeded would pass. Constructible, not
observed, and the rule is a `recommended` warning at `partial` assurance. Recording it rather than
acting on it, because v1.2 remediates demonstrated defects and this one is a hypothesis.

**The document checks match headings exactly**, so a README heading carrying an emoji can never
satisfy them — observed on the adoption target, where a real results table at `README.md:225` is
invisible. The response was `insufficient-evidence` rather than a wrong conclusion, which is the
correct failure direction. Widening the match risks accepting a mention as a section, and that
trade needs more than one target's evidence.

## What the audit did not find

No document check and no positive-evidence detector was unsound. The sound seven are sound for a
reason worth keeping as a design rule for any detector added later:

> Prefer a detector whose silence follows from something it saw. Where silence must follow from
> something it did not see, it has to be able to say whether it could have seen it.
