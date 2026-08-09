# 0006 — Scaffolding is not evidence, and scope is ownership

- **Status:** Accepted
- **Date:** 2026-08-09
- **Deciders:** Project owner
- **Supersedes nothing. Amends** [0004](0004-honest-automation.md) by adding two constraints on what
  a detector may treat as evidence.

## Context

Three adoptions against real machine-learning repositories, recorded in `artifacts/adoption/`, found
two defects. Both inflate confidence rather than raise false alarms, which is the worse direction,
and neither was a defect in the standards.

**The bootstrap manufactured compliance.** Running `standards init` on a real project flipped three
required rules from failing to passed with no work done at all. The document that satisfied
`evaluation.baseline-exists` was a table row the tool had written seconds earlier, reading
`| Baseline — REPLACE with the strongest simple thing that could reasonably work | | | |`.

**The scanner read code the project did not write.** On one target every leakage finding — twelve of
twelve — was inside scikit-learn's own test suite in a committed virtualenv. On another, 79 of 86
evidence entries cited disposable agent worktrees. A third tracked 41 files while the scanner read
20,000 and did not finish.

The controlled comparison established that the second is a scope defect rather than a detector
defect: given only owned code, the same three code-analysis detectors produced zero false positives.

## Decision

### Framework-generated scaffolding never satisfies a substantive requirement

Adopted as `invariant.no-self-satisfying-scaffolding` rather than as three fixes to three detectors,
because the narrow form would leave the same architectural hole open for every template added later.

The general statement: **an artifact this framework generates must not count as evidence that a
project satisfies a requirement until a human has meaningfully completed it.**

Three independent signals, because each alone is defeatable:

1. **A marker.** Every generated document carries `standards:scaffold` until an author deletes it.
2. **Substance.** A section whose body is empty, or contains only placeholder text, answers nothing.
3. **Template similarity.** A document that is the shipped template with the marker removed and
   nothing else changed is still the template. This third signal exists because a test showed the
   first two were insufficient — a template's guidance prose is itself real prose, so deleting the
   marker defeated the substance check.

The converse constraint is equally binding: a completed document must still be accepted. A check
that rejected genuine work would be switched off within a week, and each signal is tested from both
directions.

### Scope is ownership, decided by the project rather than guessed

**Evaluate the code a project owns; do not evaluate dependency, environment, generated, or ephemeral
code by default.**

Primary mechanism: ask git. A repository already states what it owns, in a file written for exactly
that purpose, and `git ls-files` answers exactly rather than approximately.

Fallback, where git cannot answer: recognise unowned trees by structure — a virtualenv by its
`pyvenv.cfg` or `site-packages`, a nested checkout by its `.git`, dependency and cache and build
directories by name. The fallback is an approximation and the report says so.

Escape hatch: `--include-unowned`, for the case where vendored code genuinely is the product being
assessed. A flag rather than a default, because the failure it enables is silent.

Two consequences worth stating. *Tracked is not the same as in scope* — a repository legitimately
commits fixtures and sample projects, and the skip list still applies on top of git's answer. And *a
project's own tests stay in scope* — the false positives came from library tests, and a project's
test suite is exactly where a shortcut is most likely to hide.

### Two smaller decisions from the same evidence

**Blocked means unscored.** Once an invariant fires the framework has declared the evaluation
unacceptable, so the score is suppressed. Printing `BLOCKED_BY_INVARIANT` and `83%` on adjacent
lines, as v1.0 did, undercuts the reasoning in [ADR 0005](0005-integrity-invariant-enforcement.md):
a number computed with a ruler you have just called untrustworthy is the part a reader quotes.

**`explain` emits resolvable paths.** `standards/15-*.md` reads fine to a person and is useless to an
agent. The path is now resolved from the inventory and the anchor from the heading, and every one is
verified by test.

## Alternatives considered

**Fix the three affected detectors.** Rejected: it leaves the hole open for the next template, and
the failure mode is architectural rather than local.

**Add `test-env-3.11` and `.claude/worktrees` to the skip list.** Rejected, and this is the central
judgement of this record. A skip list is a standing guess that trails the ecosystem — nobody would
have predicted `test-env-3.11`, and the next convention is equally unpredictable. Asking the project
what it owns is exact and does not need maintaining.

**Drop the document detectors.** Rejected: their finding on an un-bootstrapped repository was
correct and useful, and removing a working check to fix a bootstrap defect would trade a real signal
for a cosmetic one.

**Make `init` write nothing until asked.** Rejected: the templates are the compliant examples the
brief asks for, and their value is that an author starts from the right shape. The defect was never
that they exist; it was that the evaluator accepted them.

## Consequences

The scanner now depends on git being present and willing for its exact mode. Where git declines —
observed on a real target refused under `safe.directory` — the tool falls back and says so, naming
git's own reason verbatim rather than asserting that the project is not a repository. That
distinction was itself a defect in the first draft of this work, caught for the same reason
everything else here was: a claim was being made that the tool could not support.

Fixing the bootstrap exposed a second, more general silent pass: a rule whose detector is gated
behind a trigger reported `passed` when the trigger never fired. The evaluator now receives the set
of rules actually examined on this target rather than the set examinable in principle. That is
`invariant.no-silent-pass` in its general form, and it was worth more than either headline fix.

Evidence-request counts moved from 2 producible / 35 human to 5 / 36 on the target measured both
ways. The movement is more honest gaps surfaced, not more automation. **No rule moved from human
judgement to automation, and future versions should not be judged by making that ratio larger.**
