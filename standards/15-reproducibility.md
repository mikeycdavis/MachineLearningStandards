# Standard 15 — Reproducibility

A result that cannot be obtained a second time is an anecdote about a computation that happened
once. The failure this standard prevents is not the irreproducible experiment itself — early work is
often exploratory and that is legitimate — but the irreproducible experiment described as though it
were settled, whose configuration nobody recorded and whose numbers therefore cannot be defended,
corrected, or extended by anyone, including their author six months later.

Source: item 15 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every experiment whose result is reported, compared against, or used to justify a
decision: model selection runs, ablations, baseline comparisons, and the final evaluation. It does
not apply to exploratory work whose output is understanding rather than a number, and a project that
separates the two explicitly is easier to audit than one that treats every notebook as a result.

Applicability is proposed by the `training-code`, `ml-footprint`, and `notebooks-present` triggers.
Reproducibility is a property of a process, so its subject is the code and configuration that
produced a result, not the result's file.

## Requirements

### R1 — The experiment configuration is recorded in full

**Every reported result MUST carry a record sufficient to rerun the experiment that produced it.**
Item 15 of the source names the parts: code version, data version, hyperparameters, environment and
dependency versions, and random seeds. Each is a separate failure when missing, and the record is
complete only when all of them are present.

The record's home may be a tracking system, a committed configuration file, or a run directory
written by the training script. What it may not be is the training script itself with values edited
in place, because that file describes the last run rather than the one being reported.

### R2 — Dependencies are pinned to exact versions

**Dependency manifests MUST pin exact versions** — `==` in a requirements file, a committed lockfile
beside a `pyproject.toml`, `=` on `environment.yml` dependencies. An unpinned manifest describes a
family of environments, and the members of that family disagree: a minor release changes a default
`solver`, a `random_state` semantic, or a floating-point reduction order, and the result moves for
reasons no one recorded.

Pinning the direct dependencies is the requirement. It is not sufficient for determinism, and R4
exists because it is not.

### R3 — Notebooks used to produce results carry no stale state

**A notebook whose output is a reported result SHOULD be runnable top to bottom in a fresh kernel**,
and its committed outputs SHOULD correspond to that execution. Out-of-order execution counts are
evidence that the visible outputs were produced by a session that no longer exists and cannot be
recreated — the cells ran in an order the file does not record.

Where a notebook is genuinely exploratory, saying so in the notebook is the compliant path. The
failure this addresses is the notebook whose committed chart is quoted as a finding while its cells
have not run in that order since.

### R4 — Reproducibility is demonstrated, and where it is not, that is stated

**A project MUST NOT describe a result as reproducible on the strength of its configuration record
alone.** Demonstration means someone reran it — from the recorded configuration, ideally on a
different machine — and compared. Until that has happened the honest description is that the
configuration is recorded and reproduction has not been attempted, which is a materially different
claim and an entirely respectable one.

This requirement is the constructive half of P1. Together they say: record enough, verify what you
recorded, and where verification has not happened, describe the state accurately rather than
generously.

## Prohibitions

### P1 — Reproducibility claims require the configuration

Reproduced verbatim from the source:

> claim reproducibility without sufficient experiment configuration

The prohibited act is the claim, not the gap. A project may have incomplete records — that is a
requirement failure under R1, it is exemptible, and it is often the honest state of work in
progress. What may not happen is describing that work as reproducible, because a reader who accepts
the claim will build on a result nobody can recover.

"Sufficient" is measured against R1's list, and the test is operational rather than aesthetic: could
a competent stranger, given only the record, obtain the same number? If any element of the list is
missing, the answer is not known, and not-known is not a basis for the claim.

This prohibition is **non-exemptible**. The exemptible neighbour already exists and is honest — say
the work is not reproducible; the non-exemptible act is claiming it falsely.

### P2 — No fabricated training results

Reproduced verbatim from the source:

> fabricate training results

A training result that was not measured must not be presented as though it were. This covers
inventing a loss curve or a training metric outright, and it covers the quieter forms: reporting a
figure from a run that was never completed, carrying forward a number from an earlier configuration
as though it belonged to the current one, and describing an expected result as an obtained one
while the run is still pending.

The neighbouring prohibition in [Standard 3](03-dataset-provenance.md) covers fabricated data and
the one in [Standard 12](12-metric-selection.md) covers fabricated evaluation metrics. They are
separate rules because they are separate acts with separate detection stories, and all three are
undetectable by the same argument: nothing in a repository distinguishes a real number from an
invented one.

This prohibition is **non-exemptible**. An approved exception to fabricating results is written
permission to deceive.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A `params.yaml`, a `conf/` or `configs/` directory of YAML, or tracking calls into mlflow, wandb, or hydra | Detector A7 fires when training-shaped code exists and none of these is found | Partial — config presence is not config sufficiency |
| R2 | Exact pins in `requirements*.txt`, a lockfile beside `pyproject.toml`, `=` on `environment.yml` deps | Detector A4 lists the exact unpinned entries it found | Partial — see below |
| R3 | Notebooks committed with cleared outputs and monotonic execution counts | Detector A5 reports `.ipynb` code cells with committed non-empty `outputs` and non-monotonic `execution_count` | Partial — evidence of unrefreshed state, not proof of irreproducibility |
| R4 | A record of a reproduction attempt and its outcome | Manual review only | None |
| P1 | The R1 record, plus attestation that no reproducibility claim exceeds it | Manual review only | None |
| P2 | Attestation that every reported training figure came from a completed run | Manual review only | None |

**What the automated check cannot establish.** A4 reads manifests, and a manifest is not the
environment a result came from: transitive dependency versions, CUDA and BLAS builds, driver
versions, and the operating system are all outside its view, and all of them move results. A7
establishes that a configuration mechanism exists, never that the configuration in it is complete
enough to satisfy R1 — a `params.yaml` holding two hyperparameters passes a check that R1 does not.
A5's findings are evidence of unrefreshed notebook state, not proof that a result is irreproducible;
and the converse is equally true, so a clean linear notebook is not evidence that anything
reproduces. None of the three touches P1 or P2. The one check that would speak to reproducibility
directly — rerunning the training and comparing — was considered and rejected in
[ADR 0004](../artifacts/adr/0004-honest-automation.md): executing the target repository's code
violates the auditor's contract, and a partial rerun that passes in a different environment is worse
than no check, because it would attach a green result to the precise question it failed to ask.

## Additions this standard makes beyond the source

- R2's specific pinning mechanisms — `==`, lockfiles, `=` on conda dependencies — and the statement
  that pinning direct dependencies is necessary and not sufficient. The source requires that
  environment and dependency versions be recorded; the mechanisms and their limits are authored
  here.
- R3 in its entirety. The source does not mention notebooks. Treating committed outputs and
  out-of-order execution counts as reproducibility evidence is this standard's extension, made
  because in practice notebooks are where reported numbers most often live.
- R4's demand that reproduction be attempted rather than inferred from a complete record. The source
  says reproducibility is demonstrated rather than asserted; naming the demonstration as a separate
  obligation with its own evidence is this standard's reading.
- The enumeration of quiet fabrication forms in P2 — a figure from an incomplete run, a number
  carried forward from a different configuration, an expected result described as obtained.

## Relationship to other standards

[Standard 16](16-random-seeds.md) supplies one element of R1's list and is separated from this
standard for the reason its own text gives: a seed is cheap and reproducibility is not, and merging
them would let the cheap step stand in for the expensive one.
[Standard 4](04-dataset-versioning.md) supplies the data version R1 requires, without which the
configuration names an input that may have changed.
[Standard 14](14-hyperparameter-tuning.md) contributes the search record, which is part of the
configuration rather than an addition to it. [Standard 19](19-model-comparison.md) depends on this
standard entirely: two results are comparable only if each is tied to the conditions that produced
it, and [Standard 20](20-uncertainty.md) needs the seed variance that R1's record makes recoverable.

## Implementation

**Partially checked.** Three detectors bind here. A4 names unpinned dependency entries, A7 reports
that no experiment-configuration mechanism was found in a repository that trains models, and A5
reports committed notebook outputs and non-monotonic execution counts. Each states a fact about the
repository's text and each is useful; none of them says a result reproduces, and the assurance notes
on all three say so.

`reproducibility.no-unsubstantiated-claims` and `integrity.no-fabricated-training-results` report
`not-evaluated`. No mechanism can establish either from repository text — the first requires knowing
what the project has claimed and where, the second requires distinguishing a measured number from an
invented one — so their remediation is human judgement recorded as an attestation, with the
reviewer, the date, and a digest of what was reviewed. R4 reports `insufficient-evidence` instead: a
reproduction record is an artifact someone can still produce, which makes gathering it the
remediation rather than judging it.
