# 05 — Documentation, templates, and the self-evaluation

### Write the adoption guide and hold it to the code

- **Status:** COMPLETE
- **Purpose:** A standards repository whose own guide describes a previous version has demonstrated
  the failure it exists to prevent. Documentation rots silently — nothing fails when a command is
  renamed and the guide is not — so the guide is tested against the code.
- **Deliverables:** `INSTRUCTIONS.md`; `test/instructions.test.mjs`.
- **Acceptance Criteria:**
  - The guide names every subcommand the CLI implements, and none it does not.
  - Every path and script it references exists.
  - It states the exit contract including the blocked code, separates applicability from
    exceptions, distinguishes the two unknown dispositions, and lists the tooling's current gaps.
  - No document hardcodes a rule count in prose.
- **Verification:**
  ```bash
  node --test
  ```
- **Dependencies:** section 04.

### Ship the templates a project is judged against

- **Status:** COMPLETE
- **Purpose:** The card checks look for documents with particular sections, so the framework must
  ship the conforming form. These are the compliant examples the brief asks for.
- **Deliverables:** `templates/` — project policy, manifest, agent instructions, model card, dataset
  card.
- **Acceptance Criteria:**
  - The template policy satisfies the real schema, so init never writes something the validator
    would reject.
  - The card templates carry the headings their detectors look for.
  - The bootstrap documents are shorter than a typical standard, and should get shorter as the
    standards grow, because they route rather than restate.
- **Verification:**
  ```bash
  node --test
  ```
- **Dependencies:** section 04.

### Generate the architecture documentation

- **Status:** COMPLETE
- **Purpose:** Give a reader arriving cold a map of how the pieces fit, kept honest by a freshness
  check rather than by intention.
- **Deliverables:** `docs/architecture.md` and `docs/architecture.mmd`, with the diagram source
  embedded in the document.
- **Acceptance Criteria:** the embedded copy matches its source exactly, and no rendered image is
  committed, because rendering one would require a dependency.
- **Verification:**
  ```bash
  npm run diagrams
  ```
- **Dependencies:** section 04.

### Evaluate the repository against itself

- **Status:** COMPLETE
- **Purpose:** Dogfooding rather than special-casing. Declaring the rules not-applicable with
  reasons demonstrates the lifecycle the framework asks every adopter to use, and an unstated
  exclusion is indistinguishable from an oversight.
- **Deliverables:** `project-policy.yml` addressing every rule; eight CI gates.
- **Acceptance Criteria:** the repository's own evaluation is compliant with every
  machine-learning rule not-applicable and none passing by default, and every declaration carries a
  revisit condition.
- **Verification:**
  ```bash
  npm run inventory && npm run fidelity && npm run policy && npm run integrity && npm run diagrams && npm test && npm run scan && npm run evaluate
  ```
- **Dependencies:** all previous sections.

### Report the suite results

- **Status:** COMPLETE
- **Purpose:** The brief's closing deliverable: run the complete validation suite and report what it
  says, including the coverage figure, rather than only the status.
- **Deliverables:** the reported results, with framework coverage stated beside the verdict.
- **Acceptance Criteria:** all eight gates exit 0, and the report states coverage honestly rather
  than quoting a status alone.
- **Verification:** the command sequence above, with every exit code 0.
- **Dependencies:** everything.
