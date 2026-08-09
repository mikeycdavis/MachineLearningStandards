# 04 — The commands and the scanner

### Design the detectors before building them

- **Status:** COMPLETE
- **Purpose:** Stop detector capability from deciding what the standards are, and record the
  rejected checks so that building one later requires amending a decision rather than just writing
  code.
- **Deliverables:** `design/ml-audit-detectors.md`, including the table of eight checks deliberately
  not built; `artifacts/adr/0004-honest-automation.md`.
- **Acceptance Criteria:** every built detector states what it can honestly establish and what it
  cannot; every rejected one states why a green result would be false confidence.
- **Verification:** the design document precedes `scripts/standards.mjs` in the commit history.
- **Dependencies:** section 03.

### Build the five commands

- **Status:** COMPLETE
- **Purpose:** Let a person or an agent bootstrap a project, gather evidence, reach a verdict,
  understand why a rule applies, and learn when a past decision has gone stale.
- **Deliverables:** `scripts/standards.mjs` with init, scan, evaluate, explain, and status;
  `scripts/init.mjs` split into a pure planning function and a writing one.
- **Acceptance Criteria:**
  - Dry run and apply derive from one plan object, so the preview cannot disagree with the run.
  - Replacing an existing file is refused unless that exact path is named; there is no blanket
    force flag.
  - Exit codes are 0, 1, 2, and 3, with 3 reserved for a blocked run.
  - Evaluate emits evidence requests, split by whether a human is required.
- **Verification:**
  ```bash
  node --test && npm run scan && npm run evaluate
  ```
- **Dependencies:** the design document.

### Build the detectors and bound them with fixtures

- **Status:** COMPLETE
- **Purpose:** Report what is true, and nothing more.
- **Deliverables:** six descriptive and ten rule-bound detectors; six fixture repositories.
- **Acceptance Criteria:**
  - Every detector is asserted twice: a fixture that must provoke it and one that must not.
  - The no-ML fixture names scikit-learn, torch, a split call and a test identifier inside comments
    and strings, and produces nothing at all.
  - Heuristic findings are labelled as inferences, enforced where findings are constructed.
  - Findings reporting an absent artifact are marked as evidence gaps.
  - The evaluated set and the detector bindings are the same collection, checked in both
    directions.
  - This repository produces no error-severity findings on itself.
- **Verification:**
  ```bash
  node --test
  ```
- **Dependencies:** the commands.

## Gotchas this section discovered

The three-view split of each source file is the whole reason the no-ML fixture stays silent, and it
has to handle comment syntax per language: a hash opens a comment in Python and a private field in
JavaScript, and a double slash is a comment in JavaScript and floor division in Python. Blanking
string contents while preserving newlines is what lets a finding still cite a line number.
