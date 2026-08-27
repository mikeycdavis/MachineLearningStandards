# Standard 16 — Random Seeds

An unseeded run produces a number that nobody can obtain again, and the difference between two such
numbers cannot be attributed to anything. Seeding is the cheapest step in this entire framework and
the one most often mistaken for the whole job: a seed makes a run repeatable under identical
conditions, and identical conditions are rarer than they look. This standard requires the seed, and
requires equally that the seed not be treated as a guarantee it cannot give.

Source: item 16 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to every source of randomness that affects a reported result. Item 16 of the source names
them: data shuffling, initialisation, dropout, augmentation, and the split itself. In practice the
list also includes weight initialisation inside third-party layers, negative sampling, data-loader
worker ordering, and any subsampling applied during evaluation.

Applicability is proposed by the `training-code` and `ml-footprint` triggers. Deterministic
pipelines exist — a fitted linear model over a fixed split has no stochastic component — and
declaring the rule not-applicable with that reason is correct. Declaring it not-applicable because
the seeds are "probably fine" is not.

## Requirements

### R1 — Every source of randomness is seeded explicitly

**Each stochastic component that affects a reported result SHOULD be seeded, and the seed SHOULD
be set explicitly rather than left to a library default.** A library default is a value the project does
not control and does not record; it can change between releases, and when it does, the change
arrives as an unexplained shift in results.

Seeding one framework is not seeding the process. A typical training run draws from Python's
`random`, NumPy's global state, the framework's own generator, and the data loader's per-worker
generators, and each is set separately. Framework helpers such as `seed_everything` cover several at
once and are a reasonable default, provided the project knows which ones they miss.

### R2 — The seed is recorded with the result, not only set in the code

**The seed value used for a reported result MUST appear in that result's experiment record.** A seed
written as a literal in a script that has since been edited records nothing: the file states the
value the next run will use, not the value the reported run did use.

This is the same obligation as R1 of [Standard 15](15-reproducibility.md) applied to one field, and
it is stated separately because seeds are routinely the element omitted when every other part of the
configuration is captured.

### R3 — Determinism is verified, not assumed

**A project SHOULD verify that seeding actually produces identical results**, by running the seeded
pipeline twice and comparing, before describing any behaviour as deterministic. Seeds are defeated
routinely and quietly: non-deterministic GPU kernels, parallel reduction order that varies with
thread scheduling, hash-ordering effects, unseeded internals in a third-party library, and
multi-worker data loaders that interleave differently between runs.

Where full determinism is unattainable — and on accelerated hardware it frequently is — the
compliant response is to say so and to quantify the residual variation, not to keep asserting
determinism the project has never observed.

### R4 — Variance across seeds is reported as a result

**Where results vary across seeds, that variance MUST be reported alongside the result rather than
resolved by choosing a seed.** Seed variance is a property of the training procedure and is
information about how much confidence the number deserves. A model whose metric moves by four points
across seeds and one whose metric moves by a tenth of a point are different models, and reporting
only the best run makes them look identical.

Selecting the seed that produced the best number is a search over seeds, and it carries the same
optimism as any other search — see [Standard 14](14-hyperparameter-tuning.md). The honest report
gives the distribution: mean and spread across a stated set of seeds, with the set named.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | Explicit seeding calls covering each stochastic component | Detector A3 warns when ML code exists and no seeding call is found anywhere | Partial — see below |
| R2 | The seed value present in the experiment record for the reported run | Manual review, supported by the configuration check in [Standard 15](15-reproducibility.md) | None |
| R3 | A recorded repeat-run comparison, or a statement of the residual non-determinism and its cause | Manual review only | None |
| R4 | Mean and spread across a named set of seeds, reported with the result | Manual review only | None |

**What the automated check cannot establish.** Detector A3 searches for any of `random_state=`,
`np.random.seed(`, `torch.manual_seed(`, `tf.random.set_seed(`, `random.seed(`, or
`seed_everything(` and warns when a repository containing ML code has none of them. That warning is
a true statement about the text, and it is deliberately a warning rather than an error, because the
absence of these particular spellings is weak evidence and a deterministic pipeline may legitimately
have no seeds at all.

The presence of a seeding call establishes less still. It does not show that every stochastic
component was covered — one `torch.manual_seed(0)` beside four unseeded data-loader workers matches
the pattern exactly. It does not show that the seed was recorded with the result, which is R2. And
it never shows that the run is deterministic: GPU kernel non-determinism, data-loader ordering, and
unseeded library internals all survive a correct seed, which is precisely why R3 exists. The check
never claims a run is reproducible, and no result of it should be read that way.

## Additions this standard makes beyond the source

- R2's separation of setting a seed from recording it. The source requires that seeds be set and
  recorded; making the record's location — the experiment record for the specific run, not the
  script — an explicit obligation is this standard's addition, because a literal in an edited file
  is the most common way a "recorded" seed turns out not to be one.
- The enumeration in R1 of the distinct generators a single training run draws from, and the note
  that convenience helpers cover some and not others. The source names the affected activities; the
  mechanics of covering them are authored here.
- R4's framing of best-seed selection as a search subject to the same optimism as hyperparameter
  search, and the specification of what a variance report contains — mean, spread, and the named set
  of seeds. The source states that seed variance is itself a result; the reporting shape is this
  standard's.
- The instruction in R3 that unattainable determinism be stated and quantified rather than quietly
  dropped.

## Relationship to other standards

[Standard 15](15-reproducibility.md) is the parent obligation; this standard supplies one element of
its configuration record and is kept separate to prevent the cheap step from standing in for the
expensive one. A repository that seeds everything and pins nothing is not reproducible, and the
seeding check must not be allowed to suggest otherwise.
[Standard 20](20-uncertainty.md) consumes R4's output directly: variance across seeds is one of the
admissible ways to establish whether a difference between models is distinguishable from noise, and
[Standard 19](19-model-comparison.md) requires that comparison before an improvement may be claimed.
[Standard 10](10-cross-validation.md) shares the split-seed concern from the other side — the fold
assignment is itself a stochastic choice that must be seeded and recorded, or two "identical"
evaluations were run on different partitions.

## Implementation

**Partially checked.** Detector A3 contributes a single warning: a repository with ML code and no
recognisable seeding call anywhere. `reproducibility.seeds-recorded` reports that finding and
nothing more. There is no code path in the evaluator by which this rule reaches `passed` on the
strength of a matched pattern alone, because the pattern's presence does not establish the rule's
content.

R2, R3, and R4 report `insufficient-evidence`: each names an artifact a project can still produce —
a seed field in the run record, a repeat-run comparison, a variance table — so the remediation is to
gather the evidence rather than to attest that no evidence is possible. That is the distinction
drawn in section 5 of [`design/architecture.md`](../design/architecture.md), and it matters here
because all three are achievable in an afternoon by anyone who knows they are owed.
