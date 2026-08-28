# Architecture — MachineLearningStandards

This document is the design record for the repository. It is written before implementation and is
the reference every later artifact answers to. Where it makes a choice, it states the alternative
it rejected and why, because a decision whose reasoning is not recorded is a decision that will be
silently reversed.

The repository is **standalone**. It is independently maintained and depends on no other standards
repository at build time, run time, or install time. Where a component here is textually derived
from prior work, that is **vendoring** — the code is copied in and owned here — and every such file
carries a provenance header. Vendoring is not a dependency: nothing in this repository reads a path
outside it, and deleting every other repository on the machine changes nothing.

---

## 1. What this repository is for

It is not a document of best practices. It is a system that produces **auditable decisions** about
a target machine-learning project. Concretely, it answers eight questions, and each answer has a
mechanical home rather than living in prose:

| # | Question | Where the answer lives |
|---|---|---|
| 1 | What **should** be done | `kind: recommendation` catalog entries; `### R<n>` sections at `level: recommended` |
| 2 | What **must** be done | `kind: requirement` catalog entries at `level: required`; `### R<n>` sections |
| 3 | What should **normally** be done | `kind: recommendation` — the same mechanism as (1); the distinction between "should" and "should normally" is one of strength, carried by `severity` and by the standard's prose, not by a separate entity |
| 4 | What must **never** be done | `kind: prohibition` catalog entries at `level: forbidden`; `## Prohibitions` sections with one `### P<n>` per rule. First-class, never buried |
| 5 | When a standard **applies** | `applicability` declarations in the target's `project-policy.yml`, proposed by machine-evaluable `triggers` on each catalog entry |
| 6 | What **evidence** demonstrates compliance | `evidenceExpected` on each catalog entry; scan findings carrying evidence labels; attestations carrying reviewer, date, and content digest |
| 7 | How compliance is **verified** | `verification` (the method) plus `assurance` (the honest strength) on each entry; the `evaluate` command; `$assuranceNote` stating what a pass does *not* prove |
| 8 | When a previous decision must be **revisited** | `revisitWhen` prose on applicability declarations and attestations, plus two mechanical triggers — attestation digest mismatch and applicability-versus-signal drift — surfaced by the `status` command |

A ninth answer the brief requires is a **refusal**: the system must be able to conclude that work is
blocked by an invariant, and must never be forced into a positive recommendation. That is
`BLOCKED_BY_INVARIANT`, described in section 5.

---

## 2. Concept investigation

The brief lists fifteen candidate concepts and instructs that they not be implemented blindly. Each
is examined below against one test: **does this concept change what the system concludes, or is it
a label on something another concept already decides?** A concept that only relabels is rejected,
because a redundant entity is a second place for the truth to live and therefore a place for it to
drift.

| Concept | Decision | Form here, and the reasoning |
|---|---|---|
| **requirement** | **Adopt** | `kind: requirement`, `level: required`, `severity: error`. "Must be done." Distinct conclusion: an applicable, unsatisfied requirement makes the project non-compliant. |
| **prohibition** | **Adopt — first-class** | `kind: prohibition`, `level: forbidden`, `severity: error`. Not a boolean on a requirement and not prose inside one. The brief is explicit and the domain agrees: the twenty-three must-never rules are the load-bearing content of an ML standards system, because every one of them describes a way to produce a confidently wrong result. A separate `kind` means they can be enumerated, counted, reported on, and required to have homes — `standards explain --all` can list every prohibition, and a test can assert each of the twenty-three source bullets has exactly one. Buried in a requirement's prose, none of that is possible. |
| **recommendation** | **Adopt** | `kind: recommendation`, `level: recommended`, `severity: warning`. "Should normally be done." Distinct conclusion: it never makes a project non-compliant; it appears in the report and in remediation advice. Covers both "should" and "should normally" — see the note below the table. |
| **decision rule** | **Adapt — applicability triggers only** | Adopted in one narrow form: `triggers`, a list of machine-evaluable predicate names (`ml-footprint`, `data-artifacts`, `notebooks-present`, `temporal-signals`, `deployment-surface`, `training-code`) that *propose* applicability and detect drift from a declaration. **Rejected in its evaluative form**: a rule of the shape "if the dataset is imbalanced then accuracy is the wrong metric" cannot be evaluated from repository text — the class distribution is not visible, the business cost of an error is not visible, and a scanner that guessed would be exactly the false confidence the source prompt forbids. That judgment is a `manual-review` verification satisfied by attestation. Adopting the concept only for applicability keeps its real value (an agent can propose what applies) without inventing conclusions. |
| **applicability** | **Adopt** | Per-rule, declared in the target's policy: `applicable` / `not-applicable`, with a required `reason`, a `reviewedAt` date, and `revisitWhen`. Distinct conclusion, and distinct from an exception in a way the system must never let collapse: *not-applicable means the rule has no subject here; an exception means the rule applies and the project knowingly does not satisfy it.* One mechanism for both would let "we don't do that" and "we don't comply" be written the same way, and the second is the one that needs an approver and an expiry. |
| **evidence** | **Adopt** | Three sources, never conflated: scan findings labelled `OBSERVED` (directly verifiable), `INFERRED` (a heuristic's conclusion), or `UNKNOWN`; attestations labelled `CONFIRMED_BY_OWNER` carrying reviewer, date, prose evidence, and a digest of the reviewed files; and **evidence requests** — the system's output when an applicable rule has no evidence, naming what would satisfy it. The request is what lets an AI agent gather evidence rather than assume it. |
| **verification** | **Adopt, split in two** | `verification` names the method (`structural`, `document`, `configuration`, `code-analysis`, `manual-review`) and `assurance` names the honest strength of that method (`full`, `partial`, `none`). They are separate fields because the domain's hardest problem is that most ML failures are only weakly detectable from source text: a `code-analysis` check for preprocessing-before-split has real value and is *not* proof. Every entry below `assurance: full` carries a `$assuranceNote` stating precisely what a pass does not establish. Collapsing the two fields would make a weak check indistinguishable from a strong one at the point where a reader decides how much to trust it. |
| **attestability** | **Adopt, derived from verification** | Whether a rule may be satisfied by recorded human judgement. Not a free choice per rule: entries verified by `document` or `configuration` are **not** attestable, because they ask for an artifact that either exists in the repository or does not, and asserting that it exists is not evidence that it does — create it instead. Entries verified by `manual-review` or `code-analysis` are attestable, because their mechanism is absent or partial and a human review adds information the mechanism cannot. The flag is locked in the catalog baseline, so turning it on for a document rule is reported as a weakening. |
| **exceptions** | **Adopt, bounded** | An approved, time-bounded waiver of a rule that *does* apply: `rule`, `reason`, `approvedBy`, `approvedAt`, optional `expires` and `reference`. Bounded three ways: an expired exception stops waiving; `nonExemptible: true` entries reject any exception outright; invariants accept none at all. |
| **severity** | **Adopt** | `error` / `warning` / `info`. It is not redundant with `level`: `level` is the obligation's strength as a policy setting, `severity` is how loudly a finding reports. Descriptive findings — "this project imports scikit-learn" — carry no level at all and are always `info`. |
| **invariants** | **Adopt — new, first-class** | `kind: invariant` in `rules/invariants.json`. System-level meta-rules that are **not project-adjustable**: a policy may not set their level, declare them not-applicable, except them, or attest them. They are a genuinely distinct concept from a requirement because their subject is the standards system rather than the ML work, and because their violation produces a different conclusion — `BLOCKED_BY_INVARIANT`, which halts rather than scores. |
| **revisit conditions** | **Adopt, mechanised** | Prose `revisitWhen` on every applicability declaration and attestation, plus two conditions a machine can detect without being told: an attestation whose `reviewedAgainst` digest no longer matches the files it reviewed, and an applicability declaration contradicted by a trigger (declared not-applicable while `ml-footprint` fires). Prose alone would be a note nobody reads; the `status` command exists to surface these. |
| **not-applicable** | **Adopt** | A per-rule conclusion, produced only from a declaration with a reason — never inferred silently. |
| **not-evaluated** | **Adopt, and split in two** | The safe default and the most important conclusion in the system: a rule nothing examined is never `passed`. But "nothing is known" has two causes with **different remediations**, so the evaluator keeps them apart. `insufficient-evidence` — the evaluator has a mechanism for this rule and the evidence it needs is missing; remediation is *gather the evidence* (`evaluation.metric-selection-justified` → "provide the metric-selection rationale"). `not-evaluated` — no mechanism can establish this rule from repository text at all; remediation is *human judgement*, normally an attestation (`integrity.no-fabricated-evaluation-metrics` → "automated verification cannot establish that reported metrics were not fabricated"). Both roll up into the project-level `NOT_EVALUATED` and both count in the same assurance bucket, but the reason is never discarded — it is the difference between work an agent can do and work only a person can do. |
| **compliant** | **Adopt** | Per-rule (`passed`) and project-level (`COMPLIANT`). At project level it means every applicable, evaluated, required-level rule passed — it does not mean everything was checked, which is why coverage travels beside it. |
| **non-compliant** | **Adopt** | Per-rule (`failed`) and project-level (`NON_COMPLIANT`). |

**On "should" versus "should normally".** The brief lists these as two of the eight questions. They
are one mechanism here. A separate `kind` for each would require every author to decide which of
two near-identical strengths applies, and every reader to know the difference — a distinction the
catalog would carry but nothing would act on, since both produce a warning and neither blocks. The
strength difference is expressed where it is legible: in the standard's prose (`SHOULD` versus
`SHOULD normally`) and in `severity`. If a future version finds a decision that turns on the
difference, adding a `kind` is a MINOR change; inventing the distinction now with nothing acting on
it is the redundancy this investigation exists to reject.

### Concepts considered and rejected outright

| Rejected | Why |
|---|---|
| A numeric compliance grade (A–F, or a weighted risk score) | A single number invites optimisation of the number. The system reports a status, a percentage over an explicitly named denominator, and a coverage figure — three values that cannot be combined precisely because combining them would hide which one moved. |
| Rule inheritance / hierarchies (a rule "extends" another) | Rules would then have two definitions, and the child's effective level would depend on load order. Shared meaning is expressed by cross-reference in prose, which cannot silently change behaviour. |
| Per-rule custom scripts loaded from the target project | The target could then supply the code that judges the target. That is the integrity invariant's failure mode implemented as a feature. |
| Auto-generated exceptions ("suppress this finding") | An exception with no approver and no reason is a mute button. Every exception requires `approvedBy` and `reason` by schema. |
| Severity overrides in project policy | Lowering a severity to silence a finding is the weakening INV-1 forbids. Policy may set `level` within limits the integrity check enforces; `severity` is catalog-owned. |

---

## 3. Repository layout

```
artifacts/
  prompts/original-prompt.md          the owner's brief; source of truth, never edited
  prompts/ml-standards-spec.md        derived enumeration; what standards quote
  standards-source-inventory.json     human-reviewed lock of the 25-item series
  catalog-baseline.json               human-reviewed lock of every rule's kind/level/exemptibility
  adr/NNNN-*.md                       decision records
  project-plan-breakdown/             the plan, one file per milestone
standards/NN-<kebab-title>.md         25 normative documents
rules/<category>.json                 the machine-readable catalog
rules/invariants.json                 system invariants
schemas/project-policy.schema.json    the contract a target project's policy must satisfy
scripts/*.mjs                         the CLI and its checks
templates/                            what `standards init` writes into a target project
test/                                 node:test suites and fixture repositories
docs/                                 generated architecture documentation
design/                               this document and the detector design
project-policy.yml                    this repository's own policy (dogfooding)
```

Standards files are named `NN-<kebab-title>.md`, zero-padded, so a directory listing sorts in
numeric order.

---

## 4. The three-way separation

The core structural invariant, inherited as a concept and enforced mechanically here:

> The **catalog** defines rule identity and metadata. The **policy** defines applicability and
> local settings. The **evaluator** produces evidence. None of the three may redefine the others.

Enforcement: `assertBindings(catalog, ids)` throws if the evaluator reports a rule id the catalog
does not define, and a test asserts the evaluator's `EVALUATED_RULES` list and its detector
bindings are the same set. Without a mechanical check, the evaluator grows a private copy of rule
metadata within a week, and then two files disagree about what `level` a rule has.

Rule identity is fixed on day one and never negotiated afterwards: canonical form
`category.kebab-case-name`, matching `^[a-z][a-z0-9]*(\.[a-z0-9]+(-[a-z0-9]+)*)+$`. The category
segment always equals the entry's `category` field and the `rules/<category>.json` filename it
lives in. There is no alias mechanism and there will not be one — aliases exist to reconcile a
vocabulary that was allowed to fork, and this repository forbids the fork instead. The policy
schema rejects any other spelling by pattern, so a camelCase key fails at validation rather than
being quietly accepted.

---

## 5. Conclusions the system can reach

**Per-rule dispositions** — the reason behind a result, always reported alongside it:

`evaluated` · `not-applicable` · `insufficient-evidence` · `not-evaluated` · `excepted` ·
`rejected-exception` · `expired-exception` · `attested` · `invalid-attestation` ·
`contradicted-attestation` · `attested-rejected` · `invariant-violation`

`insufficient-evidence` and `not-evaluated` both mean nothing is known, and both roll up into the
project-level `NOT_EVALUATED`, but they are recorded separately because they route the reader to
different work. A rule is `insufficient-evidence` when it is in the evaluator's `EVALUATED_RULES`
set — a mechanism exists — and the evidence that mechanism needs is absent; the remediation is to
produce that evidence, which an agent can often do unaided. A rule is `not-evaluated` when no
mechanism can establish it from repository text, which is the honest state of most prohibitions in
this domain; the remediation is human judgement recorded as an attestation. Collapsing the two
would tell an agent to keep searching for evidence that no amount of searching can produce.

**Per-rule results:** `passed` · `failed` · `warning` · `skipped`.

**Project-level statuses**, in precedence order — the first that applies wins:

| Status | Meaning | Exit |
|---|---|---|
| `BLOCKED_BY_INVARIANT` | An invariant was violated. No verdict is produced; the standards system itself is compromised or is being bypassed, and any other answer would be built on it. | 3 |
| `NOT_EVALUATED` | No usable policy, so nothing could be judged. | 2 |
| `NON_COMPLIANT` | At least one applicable required-level rule failed, or a prohibition was observed violated. | 1 |
| `COMPLIANT_WITH_EXCEPTIONS` | No failures, but at least one applicable rule is waived by an active exception. | 0 |
| `COMPLIANT` | Every applicable, evaluated, required-level rule passed. | 0 |

`BLOCKED_BY_INVARIANT` outranks everything, including `NON_COMPLIANT`, because the two answer
different questions: non-compliant means the work does not meet the standard, blocked means the
standard is not currently trustworthy as a measure. Reporting the former while the latter is true
would publish a number derived from a tampered ruler.

**Exit codes** (uniform across every script): `0` ok · `1` findings or non-compliant · `2`
invocation or configuration error — the tool could not reach a verdict · `3` blocked by invariant.
The `1`/`2` split matters because a broken configuration reporting as a compliance failure sends
someone to fix the wrong thing. `3` is separate from `1` so an agent's refusal is machine-visible
to a caller that only sees an exit code.

**The system is never forced into a positive recommendation.** There is no default-pass path in the
evaluator: a rule reaches `passed` only by being evaluated with no adverse finding, or by a valid,
unexpired, undigested-stale attestation on an attestable rule with no contradicting finding. Every
other route ends at `insufficient-evidence`, `not-evaluated`, `failed`, or `invariant-violation`.
This is itself an invariant (`invariant.no-silent-pass`) and is tested.

---

## 6. Invariants

Invariants live in `rules/invariants.json` with `kind: invariant`. They are not project-adjustable:
the policy checker treats any invariant id appearing anywhere in a policy — under `rules`,
`applicability`, `exceptions`, or `attestations` — as an attempted weakening, which is itself an
invariant violation.

**INV-1 · `invariant.standards-integrity`** — the brief's global rule:

> A human or AI must never bypass, weaken, remove, reclassify, reinterpret, falsify evidence for,
> or manipulate a standard, test, applicability determination, evidence requirement, or
> verification mechanism solely because it prevents the desired implementation or conclusion.

An invariant that only exists as a sentence is a sentence. INV-1 is protected five ways, each of
which closes a specific bypass route:

1. **Catalog baseline.** `artifacts/catalog-baseline.json` is a committed, human-reviewed lock of
   every rule's `{kind, level, severity, verification, nonExemptible}`. `scripts/integrity.mjs`
   compares the live catalog against it and reports removal, level-lowering, kind
   reclassification, `nonExemptible` being turned off, or verification being weakened. Closing the
   route: editing the catalog to make a failing rule stop failing. A legitimate change updates the
   baseline deliberately and records it in `CHANGELOG.md`; the point is not that the catalog can
   never change but that it cannot change *invisibly*.
2. **Policy weakening detection.** A policy that sets any rule below its catalog level, names an
   invariant id, or declares a prohibition not-applicable without a reason is reported as
   `policy.weakened-standard`. Closing the route: leaving the catalog alone and neutering the rule
   locally instead.
3. **Attestations cannot override automated evidence.** When a rule has an adverse finding, an
   approving attestation on it reports `contradicted-attestation` and still fails. Closing the
   route: writing "I reviewed this and it's fine" over a detector that found the opposite.
4. **Evidence digests.** An attestation may pin `reviewedAgainst.paths`; the evaluator hashes their
   contents and, on mismatch, treats the attestation as stale — the rule falls back to
   `not-evaluated`, never to passed. Closing the route: reviewing a file once and letting the
   approval outlive the thing it approved.
5. **Mutation tests.** For each guard above, a test reintroduces the defect it guards against and
   asserts the guard fires. Closing the route: a guard that stopped working and nobody noticed,
   which is how a freshness checker can pass for months on the exact edit it exists to catch.

**Supporting invariants**, each equally testable:

- `invariant.no-silent-pass` — a rule nothing evaluated is never reported as passing.
- `invariant.coverage-outside-verdict` — how much of the framework is machine-checked is reported
  beside the verdict and never inside it. Without this, `COMPLIANT` reads as "everything was
  checked" when it means "everything checked passed."
- `invariant.honest-evidence-labels` — a heuristic's conclusion is labelled `INFERRED`, never
  `OBSERVED`.

---

## 7. The CLI

Five commands. The brief's candidate list (`init`, `plan`, `check`, `audit`, `explain`, `status`)
was evaluated against actual workflows rather than adopted: `plan` is not a separate command
because `init --dry-run` *is* the plan and a second entry point would be a second thing to keep in
agreement; `check` and `audit` collapse into the evidence/verdict pair below, because two commands
that both "check" differ only by a flag the caller must remember. `explain` and `status` earn their
places — the first is how an agent justifies an applicability decision, the second is how anyone
learns a past decision has gone stale.

| Command | Job | Mutates | Exit codes |
|---|---|---|---|
| `standards init [--dry-run] [--force-overwrite=<path>]` | Bootstrap a target project: policy from template, manifest and agent-instruction stubs, artifact directories. | Yes, guarded | 0 · 1 conflicts · 2 |
| `standards scan [--json] [--strict]` | Evidence discovery. Findings and trigger signals; needs no policy; never produces a verdict. | No | 0 · 1 with `--strict` · 2 |
| `standards evaluate [--json]` | The verdict. Loads and validates the policy, applies invariants, applicability, exceptions and attestations, emits status, score, assurance, coverage, and evidence requests. CI gates on this. | No | 0 · 1 · 2 · 3 |
| `standards explain <rule-id \| standard-N \| --all>` | Why a rule applies here, what evidence would demonstrate compliance, how it is verified, what a pass does not prove, and how to remediate. | No | 0 · 2 |
| `standards status [--json]` | Decision freshness: stale attestations, expiring and expired exceptions, applicability contradicted by triggers, outstanding evidence requests. | No | 0 · 1 · 2 |

**Dry-run and apply derive from one plan.** `init` is split into a pure `plan(target)` that decides
every action and a `apply(plan)` that performs them. `--dry-run` is `plan()` rendered without
`apply()` — not a parallel code path that describes what the real path would supposedly do. This is
the only way a dry run cannot disagree with the run it previews.

**Write safety.** Creating a missing artifact is ordinary. Replacing an existing one is refused by
default and reported as a conflict; overwriting requires `--force-overwrite=<path>` naming each
path individually. There is no blanket `--force`.

**Determinism.** Findings are ordered by category then path; the JSON envelope carries a fixed key
order; no wall-clock value participates in any comparison. Two runs over identical inputs produce
byte-identical output apart from the `evaluatedAt` timestamp field.

---

## 8. The output envelope

Every structured output — `scan`, `evaluate`, `status`, `init --json` — is a JSON object beginning
with `schemaVersion`, which is `"1.0.0"` from the first release and is semantic: the CLI names and
their meanings, the policy schema, the rule-entry contract, the canonical rule ids, the status and
disposition vocabularies, the exit-code meanings, and the score, assurance, and coverage semantics
are the frozen public surface. Changing any is a MAJOR version. Console wording, module layout,
detector internals, and the ordering of non-semantic output are explicitly not frozen.

`evaluate` emits: `schemaVersion`, `standardVersion`, `project`, `status`, `score`, `summary`,
`assurance`, `denominator`, `frameworkCoverage`, `evidenceRequests`, `evaluatedAt`, `results`.

`score` is passed divided by evaluated, applicable, required-level rules, expressed as a
percentage, and `null` when that denominator is zero. `denominator` states the basis in words so
the number cannot be quoted without it. `assurance` splits the applicable rules into `automated`,
`manualReview`, and `notEvaluated`, which must sum to the applicable count. `frameworkCoverage`
reports how many rules exist, how many the evaluator examines, and across how many of the
twenty-five standards — beside the verdict, never inside it.

**Every count is derived from the catalog at run time and never written into prose.** How many
rules exist, how many are prohibitions, how many are automated: these are facts the catalog owns,
and a number typed into a README or a standard is a second definition that goes stale the first
time a rule is added. Where documentation must state a figure it quotes the command that produces
it. A test asserts that no documentation file hardcodes a rule count.

---

## 9. Versioning

Semantic, and the rules are stated so a release cannot be argued into being smaller than it is:

- **MAJOR** — adding a requirement or prohibition; raising a rule's level; removing any rule;
  changing anything on the frozen surface in section 8.
- **MINOR** — adding a recommendation; adding an optional field; widening what is accepted.
- **PATCH** — corrections that change no conclusion.

Backward compatibility means a policy written against version *X* keeps validating against *X+n*
within the same major, and a rule id, once issued, is never reused for a different rule. Retirement
uses the lifecycle fields `deprecatedIn` / `supersededBy` / `removedIn`, which are present on every
entry from the first release — present and `null` — so retiring a rule later is a value change
rather than a shape change.

---

## 10. Vendored components

Copied in from prior work of the same author, each carrying a provenance header naming its origin
and stating that it is vendored rather than depended upon. These were vendored because their
requirements here are genuinely identical, and rewriting them would re-risk bugs already found and
fixed:

| File | Why it is identical here |
|---|---|
| `scripts/yaml.mjs` | A strict YAML-subset parser that returns every scalar as a string, so `standardVersion: 1.0` reaches the schema as `"1.0"` and its semver pattern can reject it. Rejects tabs, anchors, block scalars, flow collections, and duplicate keys rather than guessing. |
| `scripts/jsonschema.mjs` | A JSON Schema evaluator that throws on any keyword it does not implement, so an unsupported keyword can never be silently ignored — which would mean a constraint the schema states and nothing enforces. |
| `scripts/inventory.mjs` | Compares an extracted enumeration against a committed, human-reviewed list. Domain-independent. |
| `scripts/fidelity.mjs` | Verifies verbatim-quotation claims against the source document. Domain-independent; only the source path differs. |
| `scripts/diagrams.mjs` | Checks that an embedded Mermaid copy matches its `.mmd` source. Domain-independent. |

Everything else — the catalog model with its `kind` and `evidenceExpected` fields, the invariant
mechanism, the integrity checker, the five-status conclusion set, the CLI surface, every detector,
and all normative content — is written for this repository.

**Defects in the prior work deliberately not inherited:** the inconsistent `schemaVersion` (`"1.0"`
in two emitters, `"1.0.0"` elsewhere — here it is `"1.0.0"` everywhere and a test asserts it); a
rules file whose name did not match the category of the rules inside it (here the three always
agree); and a test script using a quoted glob that only Node 21 and later expand (here
`node --test test/`, the directory form, which works on the declared floor of Node 18).

---

## 11. Provenance, in both directions

A conclusion is only auditable if a reader can walk from it back to the intent that motivated it,
and forward from the intent to the evidence. Two chains must therefore be unbroken, and both are
tested rather than asserted.

**Downward — intent to rule.** Every project-facing catalog entry traces
`rule → standard → source-spec item → original prompt`. The links: each entry carries `standard: N`
and a `requirement` anchor naming the `### R<n>` or `### P<n>` heading it formalises; each standard
carries `Source: item N of ml-standards-spec.md`; each spec item is a numbered line the inventory
locks; and the spec's provenance block plus the byte-identical must-never and evaluation-philosophy
sections tie the spec to `original-prompt.md`. A test walks the chain for every entry and fails on
any broken link — a rule whose `standard` has no file, whose anchor resolves to no heading, or
whose standard claims a spec item the inventory does not list.

**Upward — verdict to evidence.** Every result in an `evaluate` envelope traces
`verdict → rule → finding or attestation → detector or reviewer`. Each result carries its rule id,
its disposition, and the evidence that produced it: for an evaluated rule, the findings with their
detector id, file path, and evidence label; for an attested rule, the reviewer, date, and the paths
and digest reviewed. A result reached with neither — a bare pass or fail — is a bug, and a test
asserts no envelope contains one.

Where a chain genuinely cannot be completed, the system says so rather than implying completeness:
a standard with no catalog entry is reported in `frameworkCoverage`, and a rule with no mechanism
reports `not-evaluated` with the reason. What is forbidden is the appearance of a full chain over a
missing link.

## 12. Runtime and quality posture

Node.js 18 or later, ESM, `node:` builtins only. **Zero third-party dependencies** — no
`dependencies` key, no lockfile, no install step in CI. This is structural rather than aspirational:
because CI has no install step, adding a dependency breaks the build, which is the only form of
this rule that survives contact with a deadline. Tests are `node:test` with `node:assert/strict`.

Quality obligations, each with a mechanical home: automated tests (eight suites); determinism
(section 7); documentation (`README.md`, `INSTRUCTIONS.md`, the standards themselves, and generated
`docs/architecture.md`); examples (fixture repositories and the two card templates, which are the
shipped compliant examples); schema validation (`schemas/project-policy.schema.json`, enforced on
every `evaluate`); backward-compatible evolution (section 9); clear failure behaviour (exit codes,
and every error naming the file and the expectation); safe defaults (`not-evaluated`, refuse to
overwrite, no blanket force); auditable decisions (every result carries a disposition, and every
finding carries an evidence label and a path).

The repository is validated against its own standards in CI. Its ML-subject rules are declared
`not-applicable` — it trains no models — with a written reason and a `revisitWhen` naming the event
that would change that. Declaring them rather than letting them fall silently into `not-evaluated`
is the point: an unstated exclusion is indistinguishable from an oversight.

---

## 13. How a standard states its rule

Section 11 records that every catalog entry carries a `requirement` anchor naming the `### R<n>` or
`### P<n>` heading it formalises. That resolves *which* section states a rule. This section states
what the machinery then reads inside it, because `scripts/levels.mjs` compares a section's stated
strength against its entry's `kind` and a convention a gate depends on is a contract, not a habit.

**The rule applies to `### R<n>` sections that a requirement or recommendation entry names.** It is
not a rule about the corpus at large. Most `### R<n>` sections have no catalog entry — the catalog
has never been a projection of the prose, and `frameworkCoverage` reports that shortfall beside the
verdict — and nothing here obliges them to acquire one. `## Prohibitions` sections are outside it
for a different reason: they quote their must-never bullet verbatim rather than stating a modal of
their own, so no level convention exists for them and none is invented here.

Within that scope:

1. **The normative sentence is the first modal-bearing bold span in the section**, and it must also
   be the section's first bold span. It carries `MUST`, `MUST NOT`, `SHOULD` or `SHOULD NOT`.
2. **Quoted and fenced material is not normative-sentence evidence.** Text inside a blockquote is
   somebody else's sentence — usually the source spec's, reproduced verbatim — and text inside a
   fenced block is an example. Neither can set the rule's strength, and both are skipped before the
   spans are read.
3. **The modal is load-bearing.** `levels` maps `requirement` → `MUST` and `recommendation` →
   `SHOULD` and reports any disagreement. Changing a modal without changing the catalog entry, or
   the reverse, is a finding on the next run; which side is then wrong is a normative decision
   ([ADR 0011](../artifacts/adr/0011-the-catalog-states-a-rules-level.md) for the general rule,
   [ADR 0012](../artifacts/adr/0012-three-prose-modals-are-wrong-and-two-catalog-levels-are.md) for
   the individual cases), never a gate's to take.
4. **A section may state one obligation, not two.** More than one modal-bearing bold span makes the
   section ambiguous, and an ambiguous section is invalid rather than resolved in favour of
   whichever came first. `levels` reports `ambiguous-normative-sentence` and names the competing
   spans without choosing between them.

Rule 4 exists because first-match behaviour is silent when it is wrong. A section whose bold lead
happened to carry a modal was read as the rule's level even where the real sentence beneath stated
a different one, so the gate reported agreement for prose and catalog that genuinely disagreed.
Both shapes were measured against the live checker before this was written.

**Bold text that states no obligation is unaffected.** A defined term (`**lock artifact**`), an
aside heading (`**A note on where this taxonomy comes from.**`) and a contrasting label are all
ordinary prose and carry no modal, so they do not compete. Only modal-bearing spans do — Standards
11 R6, 15 R2 and 19 R3 each bold something beside their normative sentence today, and counting every
bold span instead would reject all three. A mutation test asserts that: remove the modal-bearing
qualifier and the real corpus goes red.

**How to satisfy it when a section genuinely needs to discuss a stronger neighbour.** Say it without
bolding it. A cross-reference, a contrast, a worked failure and an explanatory aside are all normal
prose; bold is reserved for the one sentence that states this rule. If a section really does carry
two obligations, it is two rules and wants two `### R<n>` headings — which is also what the catalog,
holding one entry per anchor, already assumes.
