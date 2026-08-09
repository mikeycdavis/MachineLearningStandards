# 03 — Catalog, invariants, schema, and the verdict engine

### Fix rule identity once

- **Status:** COMPLETE
- **Purpose:** Prevent the vocabulary fork that alias mechanisms exist to repair. Deciding this on
  day one costs a paragraph; deciding it late costs a migration and a permanent second spelling.
- **Deliverables:** canonical `category.kebab-case-name`, enforced by the catalog loader and by the
  schema's `propertyNames` pattern. No aliases, ever.
- **Acceptance Criteria:** filename, `category` field, and id prefix agree for every entry; a
  camelCase key in a policy fails validation rather than being accepted.
- **Verification:**
  ```bash
  node --test
  ```
  `test/policy.test.mjs` drives `non-canonical-id.yml` and asserts rejection.
- **Dependencies:** none.

### Author the catalog

- **Status:** COMPLETE
- **Purpose:** Make the standards machine-addressable without letting the machine redefine them.
- **Deliverables:** `rules/*.json` across nine categories, with `kind`, `evidenceExpected`,
  `triggers`, honest `assurance` with a note wherever it is below full, and an exemptibility note on
  every non-exemptible entry.
- **Acceptance Criteria:**
  - Every entry traces to a standard and to a real requirement or prohibition heading in it.
  - No entry claims full assurance from manual review or code analysis.
  - Kind and level agree: a prohibition is forbidden, a recommendation is recommended.
  - The lifecycle fields are present from the first release, as null.
- **Verification:**
  ```bash
  node --test
  ```
- **Dependencies:** section 02.

### Make the invariants enforceable

- **Status:** COMPLETE
- **Purpose:** The brief asks how the integrity rule can itself be protected and tested. An
  invariant stated only as a sentence reads as protection while providing none.
- **Deliverables:** `rules/invariants.json`; `artifacts/catalog-baseline.json`;
  `scripts/integrity.mjs`; policy weakening detection in both `scripts/policy.mjs` and the engine;
  the blocked status with its own exit code.
- **Acceptance Criteria:**
  - Each of the five enforcement routes has a test that performs the exact weakening and asserts
    the guard fires.
  - Each guard also has a negative case, so it cannot fire on legitimate change.
  - A policy naming an invariant anywhere is blocked.
  - Blocked outranks non-compliant.
- **Verification:**
  ```bash
  npm run integrity && node --test
  ```
- **Dependencies:** the catalog.

### Author the schema and the first real policy together

- **Status:** COMPLETE
- **Purpose:** Writing a policy is what reveals that "this rule has no subject here" and "this rule
  applies and we do not meet it" are different claims. Writing the schema alone collapses them.
- **Deliverables:** `schemas/project-policy.schema.json`; the repository's own `project-policy.yml`,
  declaring every rule not-applicable with a reason and a revisit condition.
- **Acceptance Criteria:** the schema separates applicability from exceptions; declaring a rule both
  ways is reported; every declaration in the repository's own policy carries a substantive reason.
- **Verification:**
  ```bash
  npm run policy && node --test
  ```
- **Dependencies:** the catalog.

## Gotchas this section discovered

Writing the tests exposed that `attestable` had been set on every rule, which would have let an
assertion satisfy a rule whose artifact either exists in the repository or does not. It is now
derived from the verification method and locked in the baseline. The plan had not anticipated this;
the negative test cases found it, which is the argument for writing them.
