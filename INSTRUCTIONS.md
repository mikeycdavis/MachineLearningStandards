# Adopting the machine-learning standards

**Operator-facing.** How to hold a project to these standards, for a person or an AI agent working
in another repository.

**Do not copy the standards documents into your repository.** Reference the standards version in
your `project-policy.yml` and keep only project-specific declarations locally. A copied standard is
a second definition that will drift from this one, silently, and both copies will look
authoritative.

---

## 1. Minimum adoption

```bash
# From the root of the project you are adopting the standards in.
node <standards-repo>/scripts/standards.mjs init .
# Edit project-policy.yml: declare what applies here and why.
node <standards-repo>/scripts/policy.mjs ./project-policy.yml
node <standards-repo>/scripts/standards.mjs scan .
node <standards-repo>/scripts/standards.mjs evaluate .
```

`init` writes `project-policy.yml`, `PROJECT.md`, `AGENTS.md`, `CLAUDE.md`, `MODEL_CARD.md`,
`DATASET.md`, and the `artifacts/adr/` and `artifacts/project-plan-breakdown/` directories. It
never replaces an existing file without being told to.

---

## 2. Five commands, five jobs

| Command | Job |
| --- | --- |
| `standards init` | Bootstrap. Creates what is missing; refuses to replace what is there. |
| `standards scan` | Evidence discovery. What the project has, and where it departs from the standards. Needs no policy and never produces a verdict. |
| `standards evaluate` | The verdict. Applies invariants, applicability, exceptions, and attestations, and reports the authoritative status. **Gate CI on this.** |
| `standards explain` | Why a rule applies here, what evidence would demonstrate compliance, how it is verified, and what a pass does not prove. |
| `standards status` | Decision freshness. Stale attestations, lapsed exceptions, and applicability declarations the scan now contradicts. |

Flags: `--json`, `--dir=<path>`, `--strict` (scan only), `--dry-run` and
`--force-overwrite=<path>` (init only), `--include-unowned`.

**Scope: the code you own.** By default the tool evaluates what your repository owns, asked of git:
the files it tracks **plus the ones beside them that git does not consider ignored**, so the work
you did five minutes ago counts before you commit it. Ignored trees, environments, caches, data,
vendored libraries and generated output are not read — an early adoption found every leakage finding
on one project coming from scikit-learn's own test suite inside a committed virtualenv. Where git
cannot answer, unowned trees are recognised by structure and the report says the scope is an
approximation. Pass `--include-unowned` where vendored code genuinely is the product you are
assessing.

**Scaffolding is not evidence.** The documents `init` writes carry a marker, and while it is present
the evaluator treats their sections as unanswered. A template does not satisfy the rule it was
written to help you meet. Complete the document, then delete the marker line.

**A pass means a mechanism looked and saw compliance.** Where a check's subject is absent — the
leakage detectors read a scikit-learn idiom, and your project may not use one — the rule reports
`not-evaluated` with the reason, not `passed`. Absence of a finding is only evidence when the check
could have found something.

---

## 3. Exit codes

The same contract across every command in the repository.

| Code | Meaning |
| --- | --- |
| `0` | Ok. |
| `1` | Findings, or non-compliant. The tool worked and your project has problems. |
| `2` | Invocation or configuration error. The tool could not reach a verdict — nothing was evaluated. |
| `3` | **Blocked by an invariant.** A standard, test, or evidence mechanism was weakened, so no verdict is produced — and no score, because a number computed with a ruler the framework has just called untrustworthy is worse than none. |

The 1/2 split matters: a broken configuration reported as a compliance failure sends someone to fix
the wrong thing. The separate `3` makes a refusal machine-visible to a CI job or an agent that sees
only an exit code.

---

## 4. What a conclusion means

Per rule:

| Disposition | Meaning | What to do |
| --- | --- | --- |
| `evaluated` → passed | A mechanism examined it and found nothing adverse | Nothing, subject to the assurance note |
| `evaluated` → failed | A mechanism observed a violation | Fix it |
| `not-applicable` | You declared the rule has no subject here | Nothing, until `revisitWhen` fires |
| `insufficient-evidence` | A mechanism exists and the evidence it needs is absent | **Produce the evidence** |
| `not-evaluated` | No mechanism can establish this from repository text — either none exists, or the one that does could not find its subject here | **Human judgement, recorded as an attestation** |
| `excepted` | Applies, knowingly unmet, waiver approved and current | Fix it before the waiver expires |
| `attested` | A human reviewed it and recorded what they found | Nothing, until the reviewed material changes |
| `contradicted-attestation` | Approved by a human, and a check found the opposite | Fix the finding — the attestation does not win |
| `rejected-exception` | A waiver was written against a non-exemptible rule | Remove it and satisfy the rule |
| `invariant-violation` | The standards system itself was weakened | Restore it; nothing else is trustworthy until you do |

The two "nothing is known" dispositions are kept apart deliberately, because the remediation
differs. `insufficient-evidence` is work an agent can usually do alone. `not-evaluated` is not:
no amount of searching produces evidence that a repository does not contain.

Project-level, in precedence order: `BLOCKED_BY_INVARIANT` · `NOT_EVALUATED` · `NON_COMPLIANT` ·
`COMPLIANT_WITH_EXCEPTIONS` · `COMPLIANT`.

---

## 5. Four mechanisms, never interchangeable

```text
a rule that applies
   ├── a mechanism examined it ─────────► an evaluated result
   ├── a human judged it ───────────────► an attestation
   ├── it has no subject here ──────────► not-applicable
   └── it applies and is knowingly unmet ► an exception
```

**Not-applicable** says the rule has nothing to bite on. It needs a reason and a revisit condition,
and no approver, because nobody is accepting risk.

**An exception** says the rule applies and you are not meeting it. It needs an approver, a date, and
normally an expiry, because somebody is.

Writing the second as the first is the most common way a standard quietly stops applying. The
schema keeps them separate, and declaring a rule both ways at once is reported.

**An attestation** records what a person checked and found. It never overrides a mechanism: where a
check observed a violation, an approving attestation is reported as contradicted and the rule still
fails. Supply `reviewedAgainst.paths` and a digest so the approval expires when the reviewed
material changes — run `evaluate` once and it prints the digest to record.

---

## 6. Reading the report

```text
Compliance: example-project
  Status: COMPLIANT
  Score:  86%  (required- and forbidden-level rules that were evaluated: 7)
  Rules:  6 passed, 0 failed, 1 warning(s), 38 skipped
  Cover:  6 automated, 3 attested, 4 insufficient evidence, 32 not evaluated

  Framework: 10 of 45 rules are machine-examined, across 25 of 25 standards.
```

**Read the last three lines together.** The score is over the rules that were evaluated. The cover
line says how many were evaluated and by what. The framework line says how much of the framework
can be evaluated at all. None of the three combines into the others, and a status quoted without
them means "everything checked passed" rather than "everything was checked."

That gap is large here on purpose. Most machine-learning failures — a cherry-picked evaluation
period, a hidden segment, a fabricated metric — leave no trace in a repository, so most rules can
only ever be attested. Coverage is reported honestly rather than inflated with checks that would
guess.

---

## 7. For AI agents

The system is built so an agent can work against it end to end, and so that it is never forced into
a positive recommendation.

```text
init  ──►  scan  ──►  explain  ──►  gather evidence or attest  ──►  evaluate  ──►  status
                                                                        │
                                                     exit 3 ────────────┘
                                              stop and report; do not work around it
```

- **Determine applicability** with `scan` (which reports the triggers that fired) and `explain`
  (which says why a rule applies and what the policy declared).
- **Gather or request evidence**: `evaluate --json` returns `evidenceRequests`, split into evidence
  that can be produced and rules that need a human.
- **Identify prohibitions** with `explain --all`; every one carries its non-exemptibility reasoning.
- **Refuse work that violates an invariant.** Exit 3 is a documented outcome. It is not an error to
  route around, and the correct response is to report it.
- **Re-evaluate on change**: `status` reports attestations whose reviewed files have changed and
  applicability declarations the scan now contradicts.

---

## 8. What not to do

- Do not copy the standards into your repository.
- Do not lower a rule's level to avoid writing an exception. It is reported as a weakening and
  blocks the run.
- Do not declare a rule not-applicable because meeting it is inconvenient. Not-applicable means the
  rule has no subject; if it applies, write an exception with an approver.
- Do not attest a rule to silence a check that found something. The finding survives, and the
  attestation is reported as contradicted.
- Do not edit a rule, a test, or the catalog baseline to make a check pass.
- Do not treat a clean `scan` as compliance. It is evidence discovery and produces no verdict.
- Do not treat a score as coverage. Read the cover and framework lines with it.
- Do not quote a `COMPLIANT` status without the coverage figure beside it.
- Do not leave a rule undeclared and let it fall to not-evaluated. An unstated exclusion is
  indistinguishable from an oversight.
- Do not report work complete while required rules are unevaluated.

---

## 9. Current limitations of the tooling

Stated here because a tool that hides its own gaps is doing the thing this framework exists to
prevent.

| Gap | Consequence |
| --- | --- |
| Most rules have no mechanism and rest on attestation | A project that attests carelessly will report compliant. The digest mechanism limits the blast radius; it does not remove it. |
| The two leakage detectors read in-file ordering and naming conventions | Multi-file pipelines and unconventionally named variables are invisible to them. A clean result is not proof. |
| Nothing verifies that a document's content is true | The card checks confirm a document exists with the expected sections, never that what it says is accurate. |
| Applicability triggers propose, they do not decide | A project that declares nothing gets a report full of not-evaluated. That is the safe default, and it is also less useful than a declared policy. |
| The scanner recognises Python most fully | ML code in R, Julia, or Scala registers a footprint but the leakage and seed checks are Python-shaped. |
| The leakage checks read a scikit-learn idiom specifically | A project that splits and preprocesses some other way reports `not-evaluated` on those rules rather than `passed`. Honest, and less useful than a check that could read it. |
| Document checks match section headings exactly | A results table under a heading the check does not recognise is invisible to it. Observed on a real target whose README headings carry emoji. |
| Where git declines, scope is a heuristic | A repository git refuses — a `safe.directory` setting, for instance — falls back to structural guessing, and large ignored data trees can still exhaust the file cap. |
