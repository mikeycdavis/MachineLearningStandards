# Normative standards review — all 25 standards, claim by claim

**Date:** 2026-08-09 · **Corpus under review:** `v1.2.0`, **frozen and unmodified** · **Unit of
review:** the individual normative claim (108 `R`/`P` items), not the standard.

Four adoptions have now given meaningful evidence that the *evaluation mechanism* generalises. They
gave essentially none that the *normative corpus* is correct or complete. Those are different
claims, and this review addresses the second one for the first time.

**Nothing was edited.** A standard needing qualification is a finding, not permission to rewrite the
baseline during the audit. Every item below is a candidate for a later decision.

---

## What this review is, and what it is not

| | |
| --- | --- |
| **Method** | Each `R`/`P` claim read in full, in context, and assessed against established ML and statistical methodology literature. Duplication assessed by cross-reading. Completeness assessed by asking what an established reporting guideline requires that this corpus does not. |
| **Reviewer** | One reviewer, non-independent — the same agent that wrote the corpus. |
| **Assurance** | **Partial.** This is a literature-grounded expert review, not a systematic review and not an independent one. |
| **What a clean result here does NOT prove** | That a standard is correct. That the corpus is complete. That an omitted topic is unimportant. That the citations are the strongest available, or that a contrary literature does not exist. |

**Citations.** Six load-bearing sources — the ones on which a "qualified" or "incomplete" verdict
turns — were verified against the published record during this review and are marked **✓**. The
remainder are cited from the reviewer's knowledge with enough bibliographic detail to be checked,
and **have not been re-verified here**. Treat an unmarked citation as a pointer, not as evidence.

## Classification vocabulary

| Class | Meaning |
| --- | --- |
| **established** | Supported by mainstream methodology; a competent reviewer would not dispute it |
| **qualified** | Sound, but stated more absolutely than the evidence supports, or missing a condition the literature establishes |
| **contested** | Authoritative sources disagree with the claim as written |
| **incomplete** | Correct as far as it goes; omits something its own subject requires |
| **unsupported** | No authority found; asserted on the corpus's own authority alone |

## Result

| Class | Count | Of 108 |
| --- | --- | --- |
| established | **95** | 88% |
| qualified | 9 | 8% |
| incomplete | 2 | 2% |
| duplicated obligation | 2 | 2% |
| **contested** | **0** | — |
| **unsupported** | **0** | — |

Plus **one internal contradiction** between two standards, and **six candidate gaps** where an
established reporting guideline requires something this corpus does not.

**No claim in the corpus is contradicted by the literature.** That is the single most important
line in this document, and it is also the least surprising, because these standards are largely
codifications of well-settled methodology. The interesting findings are all about *scope*,
*absoluteness*, and *omission* — which is where a corpus written quickly from one source prompt
would be expected to be weakest.

---

## Findings register

Ordered by what a decision-maker should look at first. Every one is a **candidate**; none is a
scheduled change.

### N1 — Standard 5 R2 and Standard 11 R1 cannot both be complied with

**Internal contradiction. The highest-confidence finding in this review, and the only one that needs
no literature at all.**

> **05 R2:** the test set "MUST NOT be read, summarised, plotted, or error-analysed until the model
> configuration is final."
>
> **11 R1:** "The base rate of every class MUST be measured on the training, validation, and **test**
> partitions separately, and MUST be recorded in the model card or evaluation document."

Measuring and recording the test partition's class balance *is* summarising the test set. Both are
`MUST`. A project with class-imbalanced data cannot satisfy both before its configuration is final.

The resolution is not in doubt — a class-balance check is an integrity check, not a performance
observation, and reading it leaks essentially nothing about model ranking. What is missing is any
text saying so. As written, the corpus requires an act it also forbids.

Worth noting the general shape: an absolute test-set embargo also forbids the data-integrity checks
that would catch a corrupted or mis-joined test partition, which is a real failure mode. Any fix
should decide the general question, not just the class-balance case.

### N2 — Standard 10 R3 states forward-chaining absolutely; a well-established exception exists

**Qualified.**

> **10 R3:** "Where observations are ordered in time and predictions concern the future, folds MUST
> be forward-chaining."

**✓ Bergmeir, Hyndman & Koo (2018),** *A note on the validity of cross-validation for evaluating
autoregressive time series prediction*, Computational Statistics & Data Analysis 120:70–83, show
that **for purely autoregressive models, standard k-fold cross-validation is valid provided the
models considered have uncorrelated errors** — a condition that holds, for instance, when the models
nest a more appropriate model. Their earlier **✓ Bergmeir & Benítez (2012)**, Information Sciences
191:192–213, opened the question.

This is not a marginal dissent; it is the standard reference on the point, in the forecasting
literature's own journals. The corpus's stated reason for R3 — that k-fold "trains on the future in
every fold but one" — is precisely the intuition that paper shows is not decisive for the purely
autoregressive case.

The rule is right for the overwhelming majority of applied cases, including every case where
exogenous features or non-stationarity are present. It is stated as though there were no exception,
and there is one, with conditions specific enough to be written down.

### N3 — No standard tests whether the label measures what the project claims

**Gap.** Standard 1 R1 requires the target to be "defined precisely" — unambiguous labelling. That
is a *reliability* requirement. Nothing in the corpus requires evidence of **construct validity**:
that the label is a faithful measurement of the thing the decision cares about.

The canonical harm case is Obermeyer, Powers, Vogeli & Mullainathan (2019), *Dissecting racial bias
in an algorithm used to manage the health of populations*, Science 366:447–453, where healthcare
*cost* was used as a proxy for healthcare *need*. Every claim in Standards 1 through 20 could be
satisfied in full by that model. The label was precisely defined, consistently applied, leak-free,
and wrong.

Related and equally absent: label noise and annotation quality. Northcutt, Athalye & Mueller (2021)
found pervasive label errors in widely used benchmark test sets; nothing here requires a project to
characterise its own.

This is the largest gap the review found, because it is upstream of everything the corpus does
cover.

### N4 — No standard addresses disparate performance across protected or vulnerable groups

**Gap.** Standard 25 R2 requires segment-level reporting and Standard 24 R3 requires segmented
monitoring, both of which are necessary and neither of which is sufficient. Nothing requires a
project to *identify* the groups whose treatment matters, to state a fairness criterion, or to
report a disparity as a disparity rather than as one row among many.

Mitchell et al. (2019), *Model Cards for Model Reporting*, makes disaggregated evaluation across
demographic groups a first-class section rather than a subcase of segmentation. The template this
repository ships has a segment table; the standards behind it do not ask who the segments are.

Whether this belongs in scope is a judgement — the source prompt's subject is validity and honest
evaluation, and fairness is arguably a different domain. But a corpus that requires weak segments to
be reported and never asks whether the weak segment is a protected group has drawn that line
implicitly rather than deliberately.

### N5 — Nothing requires external validation on a population the model has not seen

**Gap.** Standard 5 gives an internal holdout. Standard 6 R4 requires the evaluation period be
chosen for representativeness. Neither is the claim that the model was tested on a genuinely
different site, population, or time period.

TRIPOD (Collins et al. 2015) and TRIPOD+AI (Collins et al. 2024, BMJ) treat external validation as
a distinct study type, on the evidence that internal-holdout performance systematically overstates
transportability. Recht et al. (2019), *Do ImageNet Classifiers Generalize to ImageNet?*, is the
same result from the other end of the field.

The corpus's implicit position is that a held-out split answers the generalisation question. The
literature's position is that it answers a narrower one.

### N6 — Nothing requires the evaluation set to be large enough for the claim being made

**Gap.** Standard 20 requires uncertainty to be *measured*. Nothing requires it to be *adequate*, or
that the evaluation be planned to support the claim before it is run.

**✓ Riley, Snell, Ensor et al. (2019)**, *Minimum sample size for developing a multivariable
prediction model*, Statistics in Medicine, Parts I (continuous, 38:1262–1275) and II (binary and
time-to-event, 38:1276–1296), and Riley, Ensor, Snell et al. (2020), BMJ, give explicit criteria.
Riley et al. (2021) extends them to external validation.

Measuring an interval and then reporting a difference far smaller than it is compliant with
Standard 20 R1 and R3 — R3 forbids calling an unquantified difference an improvement, not calling a
quantified-but-underpowered one an improvement. Standard 19 R3's "statistical" category could be
entered on an evaluation set incapable of supporting it.

### N7 — Standard 20 R2 requires the uncertainty method be stated; it names no invalid method

**Incomplete.**

> **20 R2:** "The uncertainty method MUST be recorded, and MUST address the source of variation that
> the comparison is exposed to."

The prose is unusually good — it notes that fold variance conflates sources and is dominated by fold
size, and that paired analysis beats comparing independent intervals. What it never says is that
specific, extremely common methods are known to be invalid.

**✓ Bengio & Grandvalet (2004)**, *No Unbiased Estimator of the Variance of K-Fold
Cross-Validation*, JMLR 5:1089–1105, prove that no universal unbiased estimator exists, because the
fold training sets overlap. The practical consequence — a paired t-test over k folds is
anticonservative and rejects too often — is Dietterich (1998), *Approximate statistical tests for
comparing supervised classification learning algorithms*, Neural Computation 10:1895–1923, and
Nadeau & Bengio (2003), *Inference for the generalization error*, Machine Learning 52:239–281.

Standard 10 R5 requires the fold spread to be reported, which is correct, and a reader could
reasonably infer that the spread licenses an interval. It does not. This is the one place in the
corpus where following the rules could produce a *worse* statistical claim than following none,
because the resulting figure carries an air of rigour Standard 20 R5 warns about in general terms
without naming this instance.

### N8 — Nothing addresses contamination from pretrained models or public benchmarks

**Gap.** Standard 8 is thorough about leakage the project's own pipeline creates. It says nothing
about the evaluation data having already been seen by a model the project did not train.

For any project fine-tuning a released checkpoint or using a public benchmark, this is now the
dominant leakage route, and it is invisible to every requirement in Standard 8 because no
transformation in the project's pipeline touched it. **✓ Kapoor & Narayanan (2023)**, *Leakage and
the reproducibility crisis in machine-learning-based science*, Patterns 4(9), survey 17 fields and
294 affected papers under an eight-type leakage taxonomy that is broader than Standard 8's scope.

### N9 — Standard 13 R2's normative sentence drops the condition in its own heading

**Qualified — a scoping defect rather than a methodological one.**

> **Heading:** "*Where the output is used as a probability*, calibration is measured and reported"
> **Sentence:** "Calibration MUST be measured on held-out data and reported wherever the model's
> performance is reported."

The bold sentence is the operative text — it is what `explain` surfaces and what a reader quotes —
and read alone it requires calibration evidence for every model, including ranking and retrieval
systems where the notion barely applies. The heading scopes it correctly; the sentence does not
carry the scope.

Van Calster et al. (2019), *A calibration hierarchy for risk models*, JCE 74:167–176, is the
supporting reference for the requirement where it does apply.

### N10 — Standard 15 R2 applies exact pinning to every manifest, including library packaging

**Qualified.** The requirement is right for an experiment and wrong for a distributable library,
where exact pins on an abstract dependency specification produce unresolvable environments for
consumers. The distinction — abstract dependencies in package metadata, concrete pins in a lockfile
— is the settled practice, and the standard's own remediation text ("commit the lockfile the
ecosystem produces") shows it is aware of the mechanism without drawing the line.

Real consequence, observed: the fourth adoption failed `ultralytics/yolov5` on this rule. That
project is consumed as a dependency by others, and its `>=` bounds are a defensible choice for a
package rather than a defect. **The target's disagreement is not evidence that the standard is
wrong** — but the standard being silent on a distinction the packaging ecosystem treats as
fundamental is a finding on its own terms.

The standard already says pinning is "not sufficient for determinism", which is the honest half.

### N11 — Standard 21 R1 requires input drift monitoring unconditionally

**Qualified.** Distributional shift in an input feature is neither necessary nor sufficient for
performance degradation, and unconditional monitoring of every input distribution has a
well-documented false-positive problem. Rabanser, Günnemann & Lipton (2019), *Failing Loudly*, and
Gama et al. (2014), *A survey on concept drift adaptation*, ACM Computing Surveys 46(4), are the
references. Standard 21 R2's threshold requirement mitigates this in practice; the claim as written
still mandates the monitoring rather than the outcome.

### N12 — Standard 19 R3's three-way classification is a house construct

**Qualified — correctly, but the corpus does not say so.** The statistical / practically meaningful
/ production-relevant taxonomy comes from the source prompt, not from an external methodology
standard. The underlying distinction between statistical and practical significance is settled
(Cohen 1994; Wasserstein & Lazar 2016 on p-values); the tripartite scheme with its third category is
this corpus's own synthesis.

That is a legitimate thing for a standards document to do. It should be *labelled* as a synthesis,
because a reader encountering it beside Standards 5 and 8 will reasonably assume it has the same
provenance, and it does not.

### N13 — Standard 22 R2's trigger taxonomy is a binary that omits real triggers

**Incomplete.** "Either time-based or evidence-based" excludes triggers that are neither: an
upstream schema change, a feature-source deprecation, a data-volume threshold, a regulatory change.
Minor, and easily read as a false dichotomy that a compliant project would simply work around.

### N14 — Standard 7 R1 and Standard 17 R2 state the same obligation twice

**Duplication.** Both require, in `MUST` form, that each feature's availability relative to the
prediction moment be recorded. Standard 17's own text positions itself as the record that serves
Standard 7's review, and both standards cross-reference the other — so this is *declared* overlap,
not hidden. It is still one obligation in two normative places, which is two places to drift.

The corpus's other overlaps are cleaner: Standard 10 R4 explicitly restates Standard 8 R1 at fold
granularity and says so; Standard 8 R4 cross-references Standard 23 for the serving contract.

### N15 — Standard 24 R4 and Standard 21 R2/R3 duplicate the threshold-and-owner obligation

**Duplication.** Standard 21 requires shift thresholds with responses and named owners; Standard 24
requires alerting thresholds with named owners for every monitored signal. Standard 24 declares
Standard 21 to be its specialisation, which makes the relationship coherent, but the obligation is
stated normatively in both.

### N16 — Standard 11 never says resampling is often unnecessary and can be harmful

**Incomplete (recommendation-shaped).** Standard 11 R3 and R4 govern resampling *if used*, and
govern it well — R4 in particular is unusually strong, requiring the effect on the implied base rate
to be recorded and routing the consequence to Standard 13.

What the standard never says is that the intervention frequently should not be used at all.

- **✓ van den Goorbergh, van Smeden, Timmerman & Van Calster (2022)**, *The harm of class imbalance
  corrections for risk prediction models*, JAMIA 29(9):1525–1534: undersampling, oversampling and
  SMOTE all produced **worse Brier scores and marked calibration distortion** while leaving
  rank-based performance essentially unchanged.
- **✓ Elor & Averbuch-Elor (2022)**, *To SMOTE, or not to SMOTE?*, arXiv:2201.08528: across 73
  datasets, with strong classifiers (XGBoost, CatBoost, LightGBM) and a proper metric, **balancing
  is not beneficial**; it helps mainly with weak learners or with exceptionally good hyperparameters
  known in advance.

The corpus treats resampling as a neutral technique with disclosure obligations. The evidence is
that it is a technique with a default answer, and the default is usually no.

### N17 — Standard 1 R4 requires cost asymmetry to be "recorded" without saying in what form

**Qualified, minor.** Many projects genuinely cannot express a currency ratio between error types.
Decision-analytic practice expresses the same information as a threshold probability, which is
usually elicitable when a cost ratio is not — Vickers & Elkin (2006), *Decision curve analysis*,
Medical Decision Making 26:565–574. The requirement is right; the absence of an acceptable minimal
form invites either a fabricated number or a shrug, and the corpus elsewhere is careful to say what
suffices.

### N18 — Multiplicity across the project, as distinct from within a search

**Gap, low confidence.** Standard 14 covers the hyperparameter search and counts manual iteration as
part of it. Standard 5 R4 counts test-set evaluations. Nothing counts the number of distinct problem
framings, feature sets, or model families tried against the *validation* set over a project's life,
which is the adaptive-overfitting route Dwork et al. (2015), *The reusable holdout*, Science
349:636–638, describes.

Listed last and marked low confidence because the practical remedy is unclear and the corpus's
existing requirements substantially mitigate it.

---

## Per-standard results

Only non-`established` claims carry a note. A standard with no note had every claim assessed as
established.

| Std | Claims | est. | Findings |
| --- | --- | --- | --- |
| 1 Problem Formulation | 5 | 4 | R4 qualified → **N17** |
| 2 Baseline Models | 5 | 5 | — |
| 3 Dataset Provenance | 6 | 6 | — (R1 aligns with Gebru et al. 2021, *Datasheets for Datasets*) |
| 4 Dataset Versioning | 4 | 4 | — |
| 5 Train/Validation/Test | 7 | 6 | R2 qualified → **N1** |
| 6 Temporal Splitting | 6 | 6 | — |
| 7 Feature Availability | 5 | 5 | R1 duplicated → **N14** |
| 8 Leakage | 6 | 6 | — (scope gap is corpus-level → **N8**) |
| 9 Target Leakage | 5 | 5 | — (R3 matches Kaufman et al. 2012, *Leakage in data mining*) |
| 10 Cross-Validation | 6 | 4 | R3 qualified → **N2**; R5 qualified → **N7** |
| 11 Class Imbalance | 5 | 4 | R1 qualified → **N1**; standard incomplete → **N16** |
| 12 Metric Selection | 7 | 7 | — (P2 matches Saito & Rehmsmeier 2015; Davis & Goadrich 2006) |
| 13 Calibration | 6 | 5 | R2 qualified → **N9** |
| 14 Hyperparameter Tuning | 5 | 5 | — (R1 matches Cawley & Talbot 2010; Varma & Simon 2006) |
| 15 Reproducibility | 6 | 5 | R2 qualified → **N10** |
| 16 Random Seeds | 4 | 4 | — R3 is the best-qualified claim in the corpus |
| 17 Feature Lineage | 4 | 3 | R2 duplicated → **N14** |
| 18 Ablation | 5 | 5 | — R2 anticipates the interaction objection explicitly |
| 19 Model Comparison | 7 | 6 | R3 qualified → **N12** |
| 20 Uncertainty | 5 | 4 | R2 incomplete → **N7** |
| 21 Drift | 5 | 4 | R1 qualified → **N11** |
| 22 Retraining | 5 | 4 | R2 incomplete → **N13** |
| 23 Inference Behavior | 4 | 4 | — (R2 matches Sculley et al. 2015 on training/serving skew) |
| 24 Monitoring | 5 | 4 | R4 duplicated → **N15** |
| 25 Model Limitations | 6 | 6 | — |

## What the review found worth praising, stated because a review that only lists defects is not a review

Three properties recur and are unusual:

**The corpus anticipates its own objections in prose.** Standard 18 R2 answers the interaction
critique of one-at-a-time ablation before a reader can raise it. Standard 16 R3 concedes that full
determinism is often unattainable on accelerated hardware and says what the compliant response is
instead. Standard 20 R2 explains why fold variance is not interchangeable with bootstrap variance.
These are the places where a weaker document would have stated an absolute and been wrong.

**Consequences are routed rather than duplicated.** Standard 11 R4 requires resampling's effect on
the output scale to be recorded and then hands the resolution to Standard 13 rather than restating
it. That pattern holds across the corpus and is why the duplication findings are as few as two.

**The prohibitions are about honesty, not technique.** Every one of the 20 prohibitions forbids a
form of misrepresentation rather than a modelling choice, and the seven non-exemptible ones are
exactly the subset where an exception would be permission to deceive. That distinction survives
scrutiny.

## Disposition

Eighteen findings. **None is a scheduled change**, and none of them is evidence that the
implementation is wrong — every finding here is about the normative text, which no release has yet
touched.

Suggested ordering if any of this is acted on, on confidence rather than on severity:

1. **N1** — internal contradiction, needs no external evidence, resolvable in a sentence.
2. **N7, N2, N16, N9** — qualified claims with verified sources naming the exact condition missing.
3. **N3, N5, N6, N8** — candidate new standards. Each is a scope decision before it is a drafting
   decision, and expanding a corpus is a heavier act than qualifying one.
4. **N4** — a scope decision in the strongest sense: whether fairness is this corpus's subject.
5. **N10, N11, N12, N13, N14, N15, N17, N18** — minor, and several are arguably fine as they are.

The discipline that governed four adoptions applies here unchanged, in its inverted form: **a
literature result that qualifies a standard is evidence about the standard, but a review finding is
not itself a mandate.** Deciding which of these eighteen justify changing a frozen normative corpus
is a separate act from finding them, and this document performs only the first.
