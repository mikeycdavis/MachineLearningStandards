<!--
  Instructions for AI agents working in this repository.

  This file should get SHORTER as the standards grow, not longer. It ROUTES to the standards; it
  does not restate them. Anything copied from a standard into here is a second definition that will
  drift, and the drift is silent because both copies look authoritative.

  Delete these comments and replace every placeholder.
-->

# AGENTS.md — REPLACE-ME

## Load sequence

Read in this order, and read the standards on demand rather than up front.

1. `PROJECT.md` — what this project is, its stack, and its current state.
2. `project-policy.yml` — what this project is held to, what does not apply here, and why.
3. The standards version the policy declares, in the standards repository.
4. The specific standard documents relevant to the work in hand. Do not read all of them first.
5. `artifacts/project-plan-breakdown/` — the plan.
6. `artifacts/adr/` — decisions already made, and the reasoning behind them.

## Working against the standards

| Question | Command |
| --- | --- |
| What does this project have? | `standards scan .` |
| Does it comply? | `standards evaluate .` |
| Why does this rule apply, and what evidence satisfies it? | `standards explain <rule-id>` |
| Has a past decision gone stale? | `standards status .` |

Exit codes: 0 ok, 1 findings or non-compliant, 2 the tool could not reach a verdict, **3 blocked by
an invariant**.

## While you work

- **A rule with no evidence is not a rule that passed.** `insufficient-evidence` means the evidence
  can be produced — produce it. `not-evaluated` means no mechanism can establish the rule from the
  repository, and it needs human judgement recorded as an attestation.
- **Never rely on chat history.** Anything that must survive the session goes into the plan, an ADR,
  or the policy.
- **Do not edit a standard, a rule, or a test to make a check pass.** That is the one thing the
  system treats as more serious than non-compliance, and it will stop rather than score.
- **Stop and report when blocked by an invariant.** Exit 3 is a supported outcome, not an error to
  work around. You are never required to produce a positive recommendation.

## This project specifically

| | |
| --- | --- |
| Standards repository | REPLACE-ME |
| Working branch | |
| Install | |
| Train | |
| Test | |
| Evaluate standards | `standards evaluate .` |

**Do not touch:**

**Architectural constraints:**

## Precedence

If this file and a standard disagree, **the standard governs and this file is the defect.**
