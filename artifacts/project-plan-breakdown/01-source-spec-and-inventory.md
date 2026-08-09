# 01 — Source specification and the locked enumeration

Everything downstream cites this layer. It was built, and both its guards were made green, before
any standard was written.

### Author the derived specification

- **Status:** COMPLETE
- **Purpose:** Give the standards something citable by item number, and give the tooling an
  enumeration that can be locked. The source brief lists topics as unnumbered bullets, so nothing
  could cite "item N" and nothing could detect a dropped topic.
- **Deliverables:** `artifacts/prompts/ml-standards-spec.md`, carrying a provenance block,
  twenty-five numbered items with authored normative intent, and the brief's must-never and
  evaluation-philosophy sections reproduced byte-identically.
- **Acceptance Criteria:**
  - The item titles are the brief's Cover bullets, in the brief's order, title-cased.
  - The two verbatim sections diff clean against the brief.
  - The provenance block states which parts are derived and which are authored.
  - Every item line matches the enumeration regex the inventory check uses.
- **Verification:**
  ```bash
  diff <(sed -n '/^## Must-never rules$/,$p' artifacts/prompts/original-prompt.md) \
       <(sed -n '/^## Must-never rules$/,$p' artifacts/prompts/ml-standards-spec.md)
  ```
- **Dependencies:** none.

### Lock the enumeration

- **Status:** COMPLETE
- **Purpose:** Make "did I cover everything" mechanical rather than a memory exercise, and make it
  impossible for a change to the extraction to redefine how many standards exist.
- **Deliverables:** `artifacts/standards-source-inventory.json`, human-reviewed and committed;
  `scripts/inventory.mjs` vendored.
- **Acceptance Criteria:**
  - `expectedCount` matches a recount of the brief's Cover list.
  - Extraction agrees with the inventory on count, numbers, and titles.
  - The file is never regenerated from a run.
- **Verification:**
  ```bash
  npm run inventory
  ```
- **Dependencies:** the specification.

### Make the fidelity check green before it has anything to check

- **Status:** COMPLETE
- **Purpose:** Hold every "reproduced verbatim from the source" claim to its own word. This matters
  more here than in a general framework: a prohibition that has been paraphrased no longer says what
  its author wrote.
- **Deliverables:** `scripts/fidelity.mjs`, vendored with its source path changed.
- **Acceptance Criteria:** exits 0 over zero standards, and over each subsequent batch.
- **Verification:**
  ```bash
  npm run fidelity
  ```
- **Dependencies:** the specification.

## Gotchas this section discovered

The counts. Two separate drafts of the plan stated twenty-six must-never rules; the brief has
twenty-three. Nothing downstream could have caught it — the inventory locks whatever the
specification says, and every check below verifies consistency with the specification rather than
with the brief. The human recount is the only guard, which is why it is written as a step.
