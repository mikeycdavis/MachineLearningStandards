# Candidate disposition — the 18 review findings

**Date:** 2026-08-09 · **Reviews:** [`1da316e`](2026-08-09-normative-standards-review.md), frozen as
evidence · **Corpus:** `v1.2.0`, **unmodified** · **Output:** dispositions only. No standard was
edited, and nothing here schedules a release.

The review established evidence about the normative corpus. It did not establish remedies. This
document performs the second act separately, because a finding and its fix are different claims and
the corpus has already been protected once by refusing to let a target's disagreement become a
standard change.

## Method

Every finding carries the same seven fields, and the fifth is the one that does the work.

```text
finding → exact existing claim → evidence → consequence if unchanged
        → candidate remedy → COUNTEREXAMPLE TO THE REMEDY → scope → disposition
```

**Why the counterexample is mandatory.** Detector development taught this repository that fixing an
observed failure too literally creates a broader false-confidence problem — the bootstrap defect was
three detectors' worth of symptom over one architectural hole, and patching the three would have
left it open. Normative changes get the same adversarial treatment, and they need it more, because a
standard cannot be mutation-tested.

## Disposition vocabulary

| Disposition | Meaning |
| --- | --- |
| `SUPPORTED_FOR_CHANGE` | An existing normative claim should be altered |
| `SUPPORTED_FOR_ADDITION` | A new obligation is warranted; its home may be undetermined |
| `SUPPORTED_FOR_CLARIFICATION` | The obligation is right; the text does not say what it means |
| `DUPLICATE_ONLY` | Real overlap, no error; record it and leave it |
| `DEFERRED` | Candidate survives, but a scope decision must precede drafting |
| `REJECTED` | The finding does not survive its own counterexample |
| `INSUFFICIENT_EVIDENCE` | Not enough to act, not enough to dismiss |

## Result

| Disposition | Count | Findings |
| --- | --- | --- |
| `SUPPORTED_FOR_CHANGE` | **1** | N10 |
| `SUPPORTED_FOR_ADDITION` | 4 | N3, N5, N8, N16 |
| `SUPPORTED_FOR_CLARIFICATION` | 7 | N1, N2, N6, N7, N9, N12, N17 |
| `DUPLICATE_ONLY` | 2 | N14, N15 |
| `DEFERRED` | 1 | N4 |
| `REJECTED` | 2 | N11, N13 |
| `INSUFFICIENT_EVIDENCE` | 1 | N18 |

**Exactly one finding of eighteen supports changing an existing normative claim.** Three findings
died or stalled. The counterexample step altered the proposed remedy in five cases and reversed its
direction in one — N1, where the obvious fix turned out to be the wrong end of the contradiction.

That is the result. Eighteen findings of review work do not owe anyone eighteen changes.

## A cross-cutting constraint, stated before any of this is acted on

Several candidate remedies **narrow** an obligation: N9 restricts a requirement to the scope its own
heading declares, N10 accepts a lockfile where exact pins are currently demanded. Narrowing a rule
is precisely what `invariant.standards-integrity` exists to make visible, and
`artifacts/catalog-baseline.json` will report each one as a weakening.

**That is the mechanism working, not an obstacle to route around.** Any such change goes through a
deliberate baseline relock with a CHANGELOG entry naming it, in the open. A narrowing that arrives
without one is indistinguishable from the thing INV-1 forbids, whatever the reasoning behind it.

---

# The eighteen records

## N1 · Standard 5 R2 and Standard 11 R1 collide

| | |
| --- | --- |
| **Exact claims** | **05 R2:** the test set "MUST NOT be read, summarised, plotted, or error-analysed until the model configuration is final." · **11 R1:** "The base rate of every class MUST be measured on the training, validation, and test partitions separately, and MUST be recorded." |
| **Evidence** | Internal. Measuring and recording the test partition's base rate is summarising the test set. Both are `MUST`. No external source needed. |
| **Consequence if unchanged** | A project with imbalanced data cannot comply with both. In practice it complies with 11 R1 and quietly violates 05 R2, which is the worse of the two to erode. |
| **Candidate remedy** | Permit inspection of test-set *integrity* properties — class balance among them — before finalisation. |

**Counterexample to the remedy.** Knowing the test base rate is not inert. A team that learns the
test partition sits at 0.4% while training sits at 4% will reasonably change its prior correction,
its threshold, or its calibration approach — and every one of those is a model-development decision
driven by the test set. The naive remedy licenses exactly the leak 05 R2 exists to prevent, dressed
as an integrity check.

**Where the counterexample leads.** The remedy is at the wrong end. The test partition's base rate
does not need to be *inspected* to be *known*: a stratified or otherwise specified split determines
it by construction, and Standard 11 R1's substantive purpose — that the base rate be recorded and
reported — is satisfied by recording it after finalisation, or by deriving it from the split
specification. The resolution is to time 11 R1's test-partition measurement, not to open 05 R2.

**Residual uncertainty, preserved deliberately.** The general question the collision points at —
*which* properties of a held-out set may be inspected without admitting information about model
ranking — is not answered by this analysis and should not be answered from one case. Integrity
inspection versus performance inspection is a real distinction and the corpus does not yet have it.
The evidence establishes the collision. It does not establish the general rule.

| | |
| --- | --- |
| **Scope** | Universal: every project where both standards apply. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION` — the collision is proven and the timing fix is safe. The general integrity/performance principle is a separate, larger question, and is **not** dispositioned here. |

## N2 · Forward-chaining folds stated without the autoregressive exception

| | |
| --- | --- |
| **Exact claim** | **10 R3:** "Where observations are ordered in time and predictions concern the future, folds MUST be forward-chaining." |
| **Evidence** | ✓ Bergmeir, Hyndman & Koo (2018), CSDA 120:70–83: for purely autoregressive models, standard k-fold is valid **provided the models considered have uncorrelated errors**. ✓ Bergmeir & Benítez (2012), Inf. Sci. 191:192–213. |
| **Consequence if unchanged** | A correctly specified autoregressive project is told its valid procedure is prohibited, and either complies wastefully or learns the corpus overstates. |
| **Candidate remedy** | Add an exception: k-fold permitted for purely autoregressive models with demonstrated uncorrelated errors. |

**Counterexample to the remedy.** An exception clause on a `MUST` is a route, and this one has an
unverifiable antecedent. "Purely autoregressive" will be claimed by models carrying exogenous
features; "uncorrelated errors" is a condition few projects will test and none of this framework's
machinery can check. The rule is correct for essentially every applied case that is not a
textbook-shaped forecasting problem, and the failure it prevents — silently optimistic estimates —
is exactly the kind that has no complainant. An exception here trades a rule that is right almost
always for one that is bypassable on an assertion.

**Where the counterexample leads.** State the exception without granting it. The prose can record
that a documented exception exists in the forecasting literature, name its two conditions, and
require that a project invoking it demonstrate the uncorrelated-errors condition and record the
demonstration — which is an exception in the policy sense, going through the existing approval
mechanism, rather than a hole in the normative text.

| | |
| --- | --- |
| **Scope** | Narrow: purely autoregressive forecasting. Rare among this corpus's likely adopters. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION` — the standard should acknowledge the exception exists and where it applies. It should not stop being a `MUST`. |

## N3 · Nothing requires the label to measure the construct the decision needs

| | |
| --- | --- |
| **Exact claims** | **01 R1:** target "defined precisely… unambiguous for any given observation" — a *reliability* requirement. **01 R3:** name the decision the output informs. Nothing joins them. |
| **Evidence** | Obermeyer et al. (2019), Science 366:447–453: healthcare cost used as a proxy for healthcare need. Northcutt, Athalye & Mueller (2021) on pervasive label error in benchmark test sets. |
| **Consequence if unchanged** | Full procedural compliance with Standards 1–20 is achievable by a model whose label measures the wrong thing. The corpus's stated purpose is preventing invalid models, and this is the largest available route to one. |
| **Candidate remedy** | A requirement that the project record evidence that the label is a faithful measurement of the quantity the named decision depends on. |

**Counterexample to the remedy.** For a large class of problems the label *is* the construct —
next-token prediction, a directly observed physical measurement, a mechanically defined outcome. A
blanket `MUST` produces ritual compliance ("the label is valid because it is the thing"), which is
worse than silence: it manufactures a document that looks like evidence and establishes nothing.
This corpus has already been burned once by artifacts that satisfy rules without doing work.

**Where the counterexample leads.** The applicability boundary is determinable and is already half
built. Standard 1 R1 states what is predicted; Standard 1 R3 names the decision. The obligation
should attach **when those two are not the same thing** — when the label is a proxy — and should ask
for the proxy relationship and its known divergences, not for a validity proof.

**Remedy form left open, deliberately.** Whether this is a new Standard 26, an expansion of Standard
1, or a requirement in Standard 3 alongside provenance is not established by this evidence, and the
review's job was not to decide it. Each placement carries a different applicability trigger and a
different relationship to the existing evidence requirements.

| | |
| --- | --- |
| **Scope** | Conditional and determinable: applies where the predicted quantity is a proxy for the quantity the decision needs. |
| **Disposition** | `SUPPORTED_FOR_ADDITION` — the obligation is warranted; **its home is undetermined and should stay that way until drafted against concrete examples.** |

## N4 · No standard addresses disparate performance across protected groups

| | |
| --- | --- |
| **Exact claims** | **25 R2:** performance reported by segment, weak segments among them. **25 P1:** weak segments not hidden. **24 R3:** monitoring segmented. None asks who the segments are. |
| **Evidence** | Mitchell et al. (2019), *Model Cards for Model Reporting*, treats disaggregated evaluation across demographic groups as a first-class section. |
| **Consequence if unchanged** | A model with a severe disparity can comply fully by reporting segments chosen for operational convenience and never constructing the segment where the harm lives. |
| **Candidate remedy** | Require identification of protected or vulnerable groups and reporting of performance across them. |

**Counterexample to the remedy.** Protected-attribute analysis is variously irrelevant (industrial
process control), impossible (the attributes are not collected), inappropriate, or itself a privacy
harm — collecting a protected attribute in order to measure fairness against it is a real and
non-hypothetical cost. A universal `MUST` would be unsatisfiable for a large fraction of legitimate
projects, and unsatisfiable requirements get waived, which teaches a project that waiving is normal.

**And a scope objection that precedes the drafting one.** The source prompt's subject is invalid
models, misleading evaluation, and unjustified claims. Hiding a disparity is already misleading
evaluation and is already prohibited by Standard 25 P1. Whether *fairness as a domain* belongs in
this corpus is a decision about what the corpus is for, and it has never been made explicitly — the
line was drawn implicitly by what the source prompt happened to enumerate.

| | |
| --- | --- |
| **Scope** | Undetermined, and that is the finding. |
| **Disposition** | `DEFERRED` — the candidate survives its counterexample, but a scope decision about the corpus's subject must precede any drafting. Not a drafting task. |

## N5 · Nothing requires external validation on an unseen population

| | |
| --- | --- |
| **Exact claims** | **05** provides an internal holdout. **06 R4** requires the evaluation period be representative. Neither is a transportability claim. |
| **Evidence** | TRIPOD (Collins et al. 2015) and TRIPOD+AI (Collins et al. 2024, BMJ) treat external validation as a distinct study type. Recht et al. (2019), *Do ImageNet Classifiers Generalize to ImageNet?* |
| **Consequence if unchanged** | Internal-holdout performance is presented, and read, as evidence of how the model will perform elsewhere. It is evidence of a narrower claim. |
| **Candidate remedy** | Require external validation on a second site, population, or time period. |

**Counterexample to the remedy.** Most projects have no second site available, and cannot obtain
one. A `MUST` they cannot satisfy produces one of two outcomes, both bad: a permanent exception, or
a manufactured "external" set made by splitting on an arbitrary column and calling it a different
population. The second is worse than no requirement, because it produces a transportability claim
with nothing behind it.

**Where the counterexample leads.** The corpus's own idiom is the fix. It is repeatedly good at
requiring an honest description rather than an unobtainable artifact — Standard 13 R4 ("absent
evidence, the output is called a score") and Standard 15 R4 ("reproduction has not been attempted…
is an entirely respectable claim") are the pattern. The obligation that is universally satisfiable
is: **state whether performance has been externally validated, and do not describe internal-holdout
performance as evidence of transportability.** That asks for a sentence, and the sentence is the
whole point.

| | |
| --- | --- |
| **Scope** | Universal — every project can say which it has. |
| **Disposition** | `SUPPORTED_FOR_ADDITION`, in the narrowed honesty-shaped form, **not** as a study requirement. |

## N6 · Nothing requires the evaluation to be adequate for the claim

| | |
| --- | --- |
| **Exact claims** | **20 R1:** comparisons carry an indication of uncertainty. **20 R3:** where uncertainty has **not been quantified**, a small difference must not be called an improvement. **19 R3:** every improvement classified as statistical / practically meaningful / production-relevant. |
| **Evidence** | ✓ Riley, Snell, Ensor et al. (2019), Stat. Med. Parts I & II; Riley, Ensor, Snell et al. (2020), BMJ. |
| **Consequence if unchanged** | A difference measured and found to sit *inside* its own interval cannot be called "statistical" under 19 R3 — but nothing stops it being classified "practically meaningful", which asserts a difference that has not been shown to exist. 20 R3 closes the unquantified case and leaves the quantified-but-inadequate one open. |
| **Candidate remedy** | Require a minimum evaluation sample size. |

**Counterexample to the remedy.** The Riley criteria are derived for clinical prediction models
under specific assumptions and have no general ML analogue. Any numeric threshold this corpus
invented would be false precision of exactly the kind Standard 12 R4 warns about, and many projects
have a fixed dataset and no route to more data — again an unsatisfiable `MUST`.

**Where the counterexample leads.** The gap is smaller than the review framed it and is entirely
inside existing text. Standard 20 R3 forbids the unquantified case; the missing sentence forbids the
quantified-and-not-distinguishable case. That is a clarification of one existing claim, not a new
standard about sample size.

| | |
| --- | --- |
| **Scope** | Universal, and already inside Standard 20's subject. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION` — extend 20 R3 to a difference lying within its measured uncertainty. **The sample-size standard is not supported.** |

## N7 · Standard 20 R2 names no invalid uncertainty method

| | |
| --- | --- |
| **Exact claim** | **20 R2:** "The uncertainty method MUST be recorded, and MUST address the source of variation that the comparison is exposed to." Prose notes fold variance conflates sources; no method is named invalid. |
| **Evidence** | ✓ Bengio & Grandvalet (2004), JMLR 5:1089–1105 — no universal unbiased estimator of k-fold CV variance, because training sets overlap. Dietterich (1998), Neural Comp. 10:1895–1923. Nadeau & Bengio (2003), Mach. Learn. 52:239–281. |
| **Consequence if unchanged** | A paired t-test over k folds is compliant, anticonservative, and carries exactly the air of rigour Standard 20 R5 warns about in general. This is the one place where following the corpus can produce a worse claim than following nothing. |
| **Candidate remedy** | Name the k-fold paired t-test as invalid. |

**Counterexample to the remedy.** A named ban creates a whitelist illusion. A project using a
different invalid procedure — an unpaired comparison of two CV means, a bootstrap over folds rather
than examples — satisfies the letter while committing the same error. And the corrective literature
is itself unsettled: Nadeau–Bengio's correction, Dietterich's 5×2cv, and Demšar (2006) for
multi-dataset comparison do not compose into one recommendation this corpus could safely mandate.

**Where the counterexample leads.** State the **property**, not the prohibited test: an interval
computed from resamples whose training sets overlap understates the true variance, and the amount of
understatement is not estimable in general. A project can apply that to whatever procedure it
actually used, which a named ban cannot do.

| | |
| --- | --- |
| **Scope** | Universal wherever cross-validation informs a comparison. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION` — add the property. **Do not name the test.** |

## N8 · Nothing addresses pretraining or benchmark contamination

| | |
| --- | --- |
| **Exact claim** | **Standard 8** governs leakage the project's own pipeline creates. No claim reaches evaluation data already seen by a model the project did not train. |
| **Evidence** | ✓ Kapoor & Narayanan (2023), Patterns 4(9): eight-type leakage taxonomy, 17 fields, 294 affected papers — broader than Standard 8's scope. |
| **Consequence if unchanged** | For any project fine-tuning a released checkpoint or reporting a public-benchmark number, the dominant leakage route is invisible to every requirement in the corpus, because no transformation in the project's pipeline touched it. |
| **Candidate remedy** | Require that the evaluation data be established as absent from the pretraining corpus. |

**Counterexample to the remedy.** For closed-weight models this is not merely hard, it is
impossible — the corpus is not disclosed. For open-weight models at web scale it is a research
problem, not a compliance task. A `MUST` no honest project can satisfy is a `MUST` that gets
exempted on every project, and a rule that is always excepted teaches that excepting is routine.

**Where the counterexample leads.** The same honesty shape as N5, and for the same reason. Where a
pretrained artifact or public benchmark is used: state whether contamination can be excluded, and
where it cannot, do not describe benchmark performance as an unbiased estimate of generalisation.
Universally satisfiable, and it puts the uncertainty where a reader can see it.

| | |
| --- | --- |
| **Scope** | Conditional and determinable: a pretrained artifact or a public benchmark is in use. |
| **Disposition** | `SUPPORTED_FOR_ADDITION`, honesty-shaped. Home undetermined — an extension of Standard 8 and a new standard are both arguable. |

## N9 · Standard 13 R2's sentence drops its own heading's condition

| | |
| --- | --- |
| **Exact claim** | Heading: "**Where the output is used as a probability**, calibration is measured and reported." Sentence: "Calibration MUST be measured on held-out data and reported wherever the model's performance is reported." |
| **Evidence** | Internal drafting defect. The bold sentence is the operative text — it is what `explain` surfaces and what a reader quotes — and alone it reaches every model, including ranking and retrieval systems. Van Calster et al. (2019), JCE 74:167–176, supports the requirement where it does apply. |
| **Consequence if unchanged** | A ranking system is told to produce calibration evidence for an output that is not a probability and does not claim to be. |
| **Candidate remedy** | Carry the heading's condition into the sentence. |

**Counterexample to the remedy.** Scoping to "used as a probability" appears to open a dodge: a
project declares its output a score and escapes. It does not — **Standard 13 R4** already requires
that where calibration is not established the output is called a score *in the model card, the API
contract, the field names, and the user interface*. Taking the dodge means renaming the field
everywhere, which is the honest outcome the standard wants.

**But note what this is.** The remedy narrows the literal reach of a requirement. Under this
repository's own rules that is a weakening until the baseline says otherwise, and it must go through
a deliberate relock rather than around one.

| | |
| --- | --- |
| **Scope** | Universal drafting fix. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION` — the sentence should say what its heading already says. Lowest-risk item in the register. |

## N10 · Exact pinning applied to every manifest, including library packaging

| | |
| --- | --- |
| **Exact claim** | **15 R2:** "Dependency manifests MUST pin exact versions — `==` in a requirements file, a committed lockfile beside a `pyproject.toml`, `=` on `environment.yml` dependencies." |
| **Evidence** | Settled packaging practice: abstract dependency ranges belong in a distributable package's metadata; concrete pins belong in a lockfile. Exact pins in an abstract specification produce unresolvable environments for consumers. The standard's own remediation text names the lockfile mechanism without drawing the line. |
| **Consequence if unchanged** | A project distributed as a dependency is required to do something that harms its consumers, or to carry a permanent exception for correct behaviour. |
| **Candidate remedy** | Exempt libraries. |

**Counterexample to the remedy.** Every project can call itself a library. "Library versus
application" is a self-declared property with no evidence behind it, and self-declared exemptions
are the shape this corpus refuses everywhere else.

**Where the counterexample leads.** The distinction that survives is not about the project, it is
about the artifact: an **abstract manifest** declaring compatible ranges, versus a **lock artifact**
recording one resolved environment. The requirement should be that a resolved environment is
recorded and committed — by exact pins, or by a lockfile beside a ranged manifest — and that ranges
alone are insufficient.

**Verified not to be target-driven.** Under the amended rule, `ultralytics/yolov5` — the adoption
target that failed this rule and prompted the finding — **still fails**, because it commits neither
pins nor a lockfile. A remedy that excused the repository that provoked it would be the standard
bending to a target, and this one does not.

| | |
| --- | --- |
| **Scope** | Universal; changes the accepted evidence, not the obligation. |
| **Disposition** | `SUPPORTED_FOR_CHANGE` — **the only one in the register.** Requires a baseline relock, since the accepted evidence widens. |

## N11 · Standard 21 R1 requires input drift monitoring unconditionally

| | |
| --- | --- |
| **Exact claim** | **21 R1:** "A deployed model MUST have shift monitoring on its input features and its output distribution." |
| **Evidence** | Rabanser, Günnemann & Lipton (2019), *Failing Loudly*; Gama et al. (2014), ACM CSUR 46(4). Distributional shift is neither necessary nor sufficient for performance degradation, and unconditional input monitoring has a documented false-positive problem. |
| **Consequence if unchanged** | Alert fatigue on shifts that do not matter. |
| **Candidate remedy** | Make input drift monitoring conditional on it being warranted. |

**Counterexample to the remedy.** "Warranted" is self-assessed, and the assessment is made by the
team that would rather not build the monitoring. The asymmetry is decisive: the cost of the rule as
written is false alerts, which are visible and annoying; the cost of relaxing it is silent
degradation, which is invisible and is the failure the standard exists to catch. And **21 R2**
already carries the mitigation — thresholds defined in advance are exactly the mechanism that turns
a noisy signal into an actionable one.

| | |
| --- | --- |
| **Scope** | — |
| **Disposition** | `REJECTED`. The claim is defensible as written; the qualification is real at the prose level and does not warrant touching the requirement. |

## N12 · Standard 19 R3's three-way classification is a house construct

| | |
| --- | --- |
| **Exact claim** | **19 R3:** every claimed improvement classified as statistical / practically meaningful / production-relevant. |
| **Evidence** | The taxonomy comes from the source prompt, not from an external methodology standard. The statistical-versus-practical distinction is settled (Cohen 1994; Wasserstein & Lazar 2016); the tripartite scheme with its third category is this corpus's synthesis. |
| **Consequence if unchanged** | A reader meeting it beside Standards 5 and 8 assumes it has the same external provenance. It does not. |
| **Candidate remedy** | Label it as a synthesis in the standard's provenance note. |

**Counterexample to the remedy.** Attempting one and finding none material. Labelling provenance
cannot weaken the obligation, and this repository already runs a provenance discipline in both
directions — every rule traces to a source-spec item, and the one construct that traces to nothing
external should say so.

| | |
| --- | --- |
| **Scope** | Documentation only. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION`. Cheap, and consistent with the corpus's own values. |

## N13 · Standard 22 R2's trigger taxonomy

| | |
| --- | --- |
| **Exact claim** | **22 R2:** "The retraining trigger MUST be explicit" — either time-based or evidence-based. |
| **Evidence** | The review asserted that upstream schema changes, feature-source deprecation, data-volume thresholds and regulatory changes fit neither category. |
| **Consequence if unchanged** | Claimed: a project with such a trigger cannot classify it. |

**Counterexample to the remedy — and it kills the finding.** Re-reading the claim, "evidence-based"
already encompasses every example the review offered. A schema change is evidence. A deprecation is
evidence. A data-volume threshold is evidence. The dichotomy is between *scheduled* and *triggered
by an observation*, which is exhaustive, and the review mistook a two-term partition for a
two-item list.

| | |
| --- | --- |
| **Scope** | — |
| **Disposition** | `REJECTED`. The finding does not survive re-reading, and recording that is more useful than quietly dropping it. |

## N14 · Standard 7 R1 and Standard 17 R2 state one obligation twice

| | |
| --- | --- |
| **Exact claims** | **07 R1:** every feature has a written statement of where its value comes from at inference and how current it will be. **17 R2:** the record states when each feature's underlying data becomes available relative to the prediction moment. |
| **Evidence** | Both `MUST`. Both standards cross-reference the other; Standard 17 positions itself as the record serving Standard 7's review. |
| **Consequence if unchanged** | Two normative homes for one obligation, so two places to drift apart. No error today. |
| **Candidate remedy** | Make Standard 17 R2 normative and reduce Standard 7 R1 to a cross-reference. |

**Counterexample to the remedy.** The two standards have different applicability. A research project
with no deployment surface may have Standard 7 not-applicable while Standard 17 still governs its
feature records — and a project with a deployment surface and no formal lineage record has the
reverse. Collapsing either into a cross-reference loses the obligation whenever the other standard
is declared not-applicable, which is a coverage hole created to fix a tidiness problem.

| | |
| --- | --- |
| **Scope** | — |
| **Disposition** | `DUPLICATE_ONLY`. Record the overlap; change nothing. |

## N15 · Standard 24 R4 and Standard 21 R2/R3 duplicate thresholds and owners

| | |
| --- | --- |
| **Exact claims** | **21 R2/R3:** shift thresholds defined in advance, each with a stated response and named owner. **24 R4:** every monitored signal warranting a response has an alerting threshold and a named owner, defined before deployment. |
| **Evidence** | Standard 24 declares Standard 21 its specialisation, so the relationship is coherent and declared. |
| **Consequence if unchanged** | As N14: drift risk, no error. |
| **Candidate remedy** | Collapse into Standard 24. |

**Counterexample to the remedy.** Same shape as N14, and stronger: Standard 21 is the standard a
project adopts when it monitors distributional shift specifically, and shift thresholds are not the
same objects as service-health alert thresholds. Merging them would either lose the distinction or
force Standard 24 to carry drift-specific text it has no other reason to hold.

| | |
| --- | --- |
| **Scope** | — |
| **Disposition** | `DUPLICATE_ONLY`. |

## N16 · Standard 11 never says resampling is often unnecessary

| | |
| --- | --- |
| **Exact claims** | **11 R3:** resampling applied to the training portion only. **11 R4:** technique, ratio and effect on the implied base rate recorded. Nothing addresses whether to resample at all. |
| **Evidence** | ✓ van den Goorbergh, van Smeden, Timmerman & Van Calster (2022), JAMIA 29(9):1525–1534 — undersampling, oversampling and SMOTE all produced worse Brier scores and marked calibration distortion with rank performance essentially unchanged. ✓ Elor & Averbuch-Elor (2022), arXiv:2201.08528 — across 73 datasets with strong classifiers and a proper metric, balancing is not beneficial. |
| **Consequence if unchanged** | The corpus presents an intervention with a well-evidenced default answer as a neutral technique carrying disclosure obligations. A project reads it as permission. |
| **Candidate remedy** | A requirement not to resample. |

**Counterexample to the remedy.** The evidence is strongest for tabular risk prediction, proper
scoring rules, and strong learners. It does not carry to weak learners — where Elor &
Averbuch-Elor find balancing *does* help — nor to loss reweighting in deep learning, where it is
routine and uncontroversial, nor to extreme rare-event regimes. A prohibition would be wrong in
named, common cases.

**Where the counterexample leads.** The claim the evidence supports is narrower and is
recommendation-shaped: where a proper metric and a strong learner are in use, resampling should not
be applied by default and its use should carry a recorded justification. Adding a recommendation is
MINOR under the versioning policy, and a recommendation is the right instrument for a default that
has well-defined exceptions.

| | |
| --- | --- |
| **Scope** | Conditional: proper metric plus strong learner. Stated, not automated. |
| **Disposition** | `SUPPORTED_FOR_ADDITION` — as a **recommendation**, not a requirement, and not a prohibition. |

## N17 · Standard 1 R4 does not say what form a cost record may take

| | |
| --- | --- |
| **Exact claim** | **01 R4:** "The record MUST state the relative cost of the different ways the model can be wrong." |
| **Evidence** | Vickers & Elkin (2006), Med. Decis. Making 26:565–574: decision-analytic practice expresses the same information as a threshold probability, which is elicitable in many settings where a currency ratio is not. |
| **Consequence if unchanged** | A project that cannot express a cost ratio either fabricates one or writes nothing. The corpus is careful elsewhere to say what suffices, and here it is not. |
| **Candidate remedy** | Mandate the threshold-probability form. |

**Counterexample to the remedy.** Threshold probability is defined for binary decisions and does not
extend cleanly to multiclass, ranking, or regression settings, all of which are in scope. Mandating
one form would make the requirement unsatisfiable exactly where it is currently vague.

**Where the counterexample leads.** Say what suffices without prescribing one form: a cost ratio, a
threshold probability, or an explicit ordinal statement of which error is worse and why, are all
acceptable records. Naming the acceptable minimum removes the fabrication incentive without
narrowing the applicable settings.

| | |
| --- | --- |
| **Scope** | Universal; lowest priority in the register. |
| **Disposition** | `SUPPORTED_FOR_CLARIFICATION`. |

## N18 · Multiplicity across the project

| | |
| --- | --- |
| **Exact claims** | **14** covers the hyperparameter search and counts manual iteration. **05 R4** counts test-set evaluations. Nothing counts distinct problem framings, feature sets, or model families tried against validation over a project's life. |
| **Evidence** | Dwork et al. (2015), *The reusable holdout*, Science 349:636–638, on adaptive overfitting to a reused holdout. |
| **Consequence if unchanged** | A validation set consulted across dozens of framings degrades as an estimator, and nothing records the count. |
| **Candidate remedy** | Extend Standard 5 R4's counting discipline to the validation set. |

**Counterexample to the remedy.** The count is not the quantity of interest, and a recorded count
with no interpretation is a number nobody can act on. Dwork et al.'s remedy is a specific mechanism
— a differentially private holdout — that this corpus is in no position to require, and the applied
literature has no settled substitute. A requirement to count without a rule for what a count means
manufactures an obligation that generates paperwork and no protection.

| | |
| --- | --- |
| **Scope** | Real, unbounded, unquantified. |
| **Disposition** | `INSUFFICIENT_EVIDENCE`. The problem is real, the remedy is not established, and the corpus's existing requirements substantially mitigate it. Recorded so a future version does not rediscover it as new. |

---

## What this leaves

**One change. Four additions, every one of them narrower than the review proposed. Seven
clarifications. Six findings that produce nothing.**

The counterexample step earned its place: it reversed the direction of the fix in N1, narrowed the
remedy in N3, N5, N6, N7, N8 and N16, and killed N11 and N13 outright. Two of the six "gaps" the
review found — N6 and, in effect, N13 — dissolved into existing text once a remedy had to be
written.

**Completeness remains unmeasured, and this document does not change that.** The six gaps were found
by one non-independent review. They are not a denominator. Nothing here supports a claim about what
fraction of important ML standards this corpus contains, and the four surviving additions should not
be mistaken for a completed list.

**Nothing here is scheduled.** `v1.2.0` stands unmodified. If a v1.3 is ever drafted from these
dispositions, the constraints already established apply: additions to the catalog are MINOR only
where they are recommendations, a narrowing goes through a deliberate baseline relock in the open,
and no change is justified by the fact that review work was performed.
