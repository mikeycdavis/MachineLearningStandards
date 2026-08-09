# 02 — The twenty-five standards

### Write the normative documents

- **Status:** COMPLETE
- **Purpose:** State what compliant machine-learning work looks like, in documents a person reads.
  This is the substance; the tooling serves it.
- **Deliverables:** `standards/01-*.md` through `standards/25-*.md`, each with Scope, Requirements,
  Prohibitions where hosted, Evidence and verification, Additions beyond the source, Relationship to
  other standards, and Implementation.
- **Acceptance Criteria:**
  - One document per specification item, citing it by number.
  - Every must-never rule from the brief reproduced verbatim in exactly one standard, under a
    `### P<n>` heading.
  - Every document ends with a candid `## Implementation` section naming what is *not* checked.
  - Every document discloses, in `## Additions`, whatever it invents beyond the source.
  - No hardcoded rule counts anywhere.
- **Verification:**
  ```bash
  npm run inventory && npm run fidelity && node --test
  ```
  The catalog suite asserts that every must-never bullet in the specification appears in some
  standard, and that every standard cites an item the inventory lists.
- **Dependencies:** section 01.

### Place the evaluation philosophy

- **Status:** COMPLETE
- **Purpose:** The brief requires the system to distinguish statistical, practically meaningful, and
  production-relevant improvement, and to carry uncertainty around comparisons. It is cross-cutting
  rather than a topic, so it is not a twenty-sixth standard.
- **Deliverables:** Standard 19 R3 hosts the three-way classification with the three bullets quoted
  verbatim; Standard 20 R1 hosts the uncertainty sentence; Standards 2 and 18 cross-reference both.
- **Acceptance Criteria:** the verbatim quotations pass the fidelity check, and the classification is
  stated as a requirement rather than as advice.
- **Verification:**
  ```bash
  npm run fidelity
  ```
- **Dependencies:** the specification.

## Gotchas this section discovered

Writing in cluster order rather than numeric order was worth doing: each batch settled vocabulary
that the next batch would otherwise have hardened differently. Standard 1 was written last, because
it references almost everything.
