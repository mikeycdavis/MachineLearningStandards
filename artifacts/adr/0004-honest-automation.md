# 0004 — Honest automation, and the checks deliberately not built

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner

## Context

The source brief asks for automated leakage and reproducibility checks where reasonably possible,
and immediately constrains it: *do not create automated checks that merely provide false
confidence.*

Those two sentences are in tension, and the tension is the defining problem of this domain. Almost
every machine-learning failure worth preventing is invisible in source text. Target leakage lives
in the semantics of a column, not its name. Whether accuracy is the wrong metric depends on a class
distribution and a cost of error that the repository does not contain. Cherry-picked evaluation
periods are undetectable by construction — the auditor cannot see the periods that were not
reported. A scanner that answered these questions would be guessing, and a guess reported as a
check is worse than no check, because a green result is read as verification.

## Decision

**Every rule carries two fields, not one.** `verification` names the method; `assurance` names its
honest strength (`full`, `partial`, `none`). Every entry below `full` carries a `$assuranceNote`
stating precisely what a pass does *not* establish. A reader who sees a passing rule can always
find out what that pass is worth.

**Build a check only when it establishes a fact.** Ten detectors are bound to rules. Each reports
something true — that an ordering appears in a file, that a requirements file has unpinned entries,
that a notebook has committed outputs, that a document with a given heading does or does not exist.
None claims more. The two leakage detectors are the sharpest case: an in-file ordering of a
preprocessing fit before a split is real evidence and is not proof, because the variable being fit
may already be a training subset loaded from disk. The note says exactly that.

**Descriptive findings are not verdicts.** Six detectors report what a project has — which ML
libraries it imports, which metrics appear, whether notebooks exist — as `info`, bound to no rule.
They inform applicability and give an agent context. They never pass or fail anything.

**Heuristics are labelled `INFERRED`, never `OBSERVED`**, and a test enforces it. A reader can tell
a measurement from an inference without reading the implementation.

**Absence of a finding is never evidence of absence.** A rule the evaluator does not examine
reports `not-evaluated`. A rule it examines and finds nothing adverse in reports `passed` only
where the check's assurance justifies the word, and the note bounds it.

### Checks deliberately not built

Each of these was considered and rejected. The list is normative: building one later requires
amending this record.

| Not built | Why it would be false confidence |
|---|---|
| Target leakage from feature names or correlations | Feature semantics are not in the text. A name-similarity heuristic fails in both directions constantly, and a pass would imply "no target leakage" — a claim no static scan can make. Attestation only. |
| Temporal leakage beyond in-file ordering | Whether information was available at prediction time lives in data values and join semantics. Flagging date-column usage would be guessing dressed as analysis. |
| Metric appropriateness | Whether accuracy suffices depends on the class distribution and the cost of an error, neither of which the auditor can see. Metrics found in code are reported descriptively; the judgement belongs to the metric-selection standard and a human. |
| Calibration verification | Requires running the model against data. Outside a static auditor's contract. |
| Cherry-picked evaluation periods; hidden segments | The auditor cannot see what was not reported. Undetectable by construction — the purest attestation cases in the system. |
| Re-running training to verify reproducibility | Executing the target repository's code violates the auditor's contract and its zero-dependency posture, and a partial rerun that passes in a different environment is worse than no check. |
| Cross-validation scheme appropriateness | Inferring that data is temporal or grouped from column names invites confident wrongness in both directions. Reported descriptively at most; the rule stays manual-review. |
| Fabrication of any kind | Nothing in a repository distinguishes a real number from an invented one. The prohibitions exist, are enumerable and attestable, and report `not-evaluated`. |

## Alternatives considered

**Build weaker versions of the rejected checks and mark them low-confidence.** Rejected. Assurance
notes help a careful reader; they do not survive a summary, a dashboard, or a green tick in a pull
request. The rejected checks are ones whose *only* output is a green tick on a question they cannot
answer.

**Report nothing automatically and rely entirely on attestation.** Rejected as the opposite
overcorrection: unpinned dependencies, committed notebook outputs, a missing model card, and a
preprocessing fit before a split are all real, cheap, and true findings.

**Let projects supply their own detectors.** Rejected — the target would then supply the code that
judges the target.

## Consequences

Coverage is low and visibly so. Roughly a quarter of the catalog is machine-examined, and
`frameworkCoverage` reports that beside every verdict so `COMPLIANT` is never read as "everything
was checked." The exact figures are derived from the catalog at run time and are deliberately not
written into any document, because a typed number is a second definition that drifts.

Most prohibitions rest on attestation, which puts weight on the attestation mechanism: reviewer,
date, written evidence, and a digest of the reviewed files so the approval expires when the
material changes. That is the correct place for the weight. The alternative was to put it on a
regular expression.
