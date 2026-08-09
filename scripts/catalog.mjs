/**
 * The rule catalog: load rules/*.json into one addressable, validated set.
 *
 * The catalog owns rule identity and metadata. The project policy owns applicability. The evaluator
 * owns evidence. None of the three may redefine the others (design/architecture.md §4), and
 * `assertBindings` below is the mechanical half of that promise — without it the evaluator grows a
 * private copy of rule metadata within a week and two files begin disagreeing about what a rule is.
 *
 * The loader THROWS rather than loading partially. A catalog that half-loaded would leave the
 * evaluator judging a project against an unknown subset of the rules while reporting as though it
 * had judged them all, which is the false-green failure this repository exists to prevent.
 *
 * There is no alias mechanism and there will not be one. Aliases exist to reconcile a vocabulary
 * that was allowed to fork; this repository forbids the fork instead, and the policy schema rejects
 * any non-canonical spelling by pattern.
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES_DIR = path.join(ROOT, "rules");

export class CatalogError extends Error {
  constructor(message) {
    super(message);
    this.name = "CatalogError";
  }
}

/**
 * What sort of statement an entry is. Not a synonym for `level`: level is the obligation's strength
 * as a policy-settable value, kind is what the entry says and determines how it is reported,
 * whether it can be waived, and what a violation means (ADR 0003).
 */
export const KINDS = new Set(["requirement", "prohibition", "recommendation", "invariant"]);

export const LEVELS = new Set(["required", "recommended", "optional", "forbidden"]);
export const SEVERITIES = new Set(["error", "warning", "info"]);
export const VERIFICATION = new Set([
  "structural",
  "document",
  "configuration",
  "code-analysis",
  "manual-review",
]);
export const ASSURANCE = new Set(["full", "partial", "none"]);

/** Canonical rule identity: `category.kebab-case-name`. */
export const CANONICAL_ID = /^[a-z][a-z0-9]*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;

const REQUIRED_STRINGS = ["title", "description", "rationale", "remediation", "evidenceExpected", "introducedIn"];
const LIFECYCLE = ["deprecatedIn", "supersededBy", "removedIn"];

/** The level each kind must carry. A prohibition at `required` would be a requirement wearing a label. */
const KIND_LEVEL = {
  requirement: "required",
  prohibition: "forbidden",
  recommendation: "recommended",
  invariant: "required",
};

function check(condition, message) {
  if (!condition) throw new CatalogError(message);
}

function validateEntry(entry, file, seen) {
  const where = `${file}: ${entry.id ?? "<entry with no id>"}`;

  check(typeof entry.id === "string" && CANONICAL_ID.test(entry.id),
    `${where}: id must match ${CANONICAL_ID} (category.kebab-case-name)`);
  check(!seen.has(entry.id), `${where}: duplicate rule id`);

  check(KINDS.has(entry.kind), `${where}: kind must be one of ${[...KINDS].join(", ")}`);
  check(LEVELS.has(entry.level), `${where}: level must be one of ${[...LEVELS].join(", ")}`);
  check(entry.level === KIND_LEVEL[entry.kind],
    `${where}: a ${entry.kind} must be level ${KIND_LEVEL[entry.kind]}, not ${entry.level}`);
  check(SEVERITIES.has(entry.severity), `${where}: severity must be one of ${[...SEVERITIES].join(", ")}`);
  check(VERIFICATION.has(entry.verification),
    `${where}: verification must be one of ${[...VERIFICATION].join(", ")}`);
  check(ASSURANCE.has(entry.assurance), `${where}: assurance must be one of ${[...ASSURANCE].join(", ")}`);

  // An entry claiming full assurance from a method that cannot deliver it is the precise shape of
  // false confidence this repository forbids (ADR 0004). A human review and a heuristic scan are
  // both valuable and neither is proof.
  check(!(entry.assurance === "full" && (entry.verification === "manual-review" || entry.verification === "code-analysis")),
    `${where}: assurance "full" cannot be claimed from ${entry.verification} verification`);
  check(entry.assurance === "full" || typeof entry.$assuranceNote === "string",
    `${where}: assurance below "full" requires a $assuranceNote saying what a pass does not prove`);

  check(typeof entry.nonExemptible === "boolean", `${where}: nonExemptible must be a boolean`);
  check(!entry.nonExemptible || typeof entry.$exemptibilityNote === "string",
    `${where}: a nonExemptible rule requires a $exemptibilityNote`);

  for (const field of REQUIRED_STRINGS) {
    check(typeof entry[field] === "string" && entry[field].trim() !== "",
      `${where}: ${field} must be a non-empty string`);
  }

  // Present from the first release, even as null, so retiring a rule later is a value change rather
  // than a shape change.
  for (const field of LIFECYCLE) {
    check(field in entry, `${where}: ${field} must be present (null is the value before retirement)`);
    check(entry[field] === null || typeof entry[field] === "string",
      `${where}: ${field} must be a string or null`);
  }

  check(Array.isArray(entry.triggers), `${where}: triggers must be an array (empty when always applicable)`);
  check(entry.triggers.every((t) => typeof t === "string"), `${where}: every trigger must be a string`);

  const category = entry.id.slice(0, entry.id.indexOf("."));
  check(entry.category === category,
    `${where}: category "${entry.category}" must equal the id prefix "${category}"`);

  if (entry.kind === "invariant") {
    // An invariant's subject is the standards system, not the ML work, so it has no standard number
    // and takes no exception. Both are structural rather than conventional.
    check(!("standard" in entry) || entry.standard === null,
      `${where}: an invariant belongs to no numbered standard`);
    check(entry.nonExemptible === true, `${where}: an invariant must be nonExemptible`);
    check(entry.attestable === false, `${where}: an invariant cannot be attested`);
  } else {
    check(Number.isInteger(entry.standard), `${where}: standard must be an integer`);
    check(typeof entry.requirement === "string" && /^[RP]\d+$/.test(entry.requirement),
      `${where}: requirement must name the R<n> or P<n> heading this entry formalises`);
    check(typeof entry.attestable === "boolean", `${where}: attestable must be a boolean`);
  }
}

/**
 * Load and validate every rule file. Returns { rules, byCategory, byKind, invariants }.
 * `rules` holds project-facing entries only; invariants are kept separate because a policy may
 * never address them and the evaluator treats them differently.
 */
export async function loadCatalog() {
  let files;
  try {
    files = (await readdir(RULES_DIR)).filter((f) => f.endsWith(".json")).sort();
  } catch (err) {
    throw new CatalogError(`cannot read rules directory: ${err.message}`);
  }
  check(files.length > 0, "no rule files found in rules/");

  const rules = new Map();
  const invariants = new Map();
  const byCategory = new Map();
  const byKind = new Map();
  const seen = new Set();

  for (const file of files) {
    let doc;
    const full = path.join(RULES_DIR, file);
    try {
      doc = JSON.parse(await readFile(full, "utf8"));
    } catch (err) {
      throw new CatalogError(`${file}: malformed JSON — ${err.message}`);
    }
    check(Array.isArray(doc.rules), `${file}: must contain a "rules" array`);

    const expectedCategory = path.basename(file, ".json");
    for (const entry of doc.rules) {
      validateEntry(entry, file, seen);
      // Filename, category field, and id prefix must all agree. Letting them drift is how a reader
      // ends up looking for a rule in the wrong file, and how two rules quietly share a category
      // that reports as one.
      if (expectedCategory !== "invariants") {
        check(entry.category === expectedCategory,
          `${file}: rule ${entry.id} has category "${entry.category}" but lives in ${file}`);
      }
      seen.add(entry.id);

      if (entry.kind === "invariant") {
        invariants.set(entry.id, entry);
      } else {
        rules.set(entry.id, entry);
      }
      if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
      byCategory.get(entry.category).push(entry);
      if (!byKind.has(entry.kind)) byKind.set(entry.kind, []);
      byKind.get(entry.kind).push(entry);
    }
  }

  check(invariants.size > 0, "rules/invariants.json must define at least the standards-integrity invariant");
  return { rules, invariants, byCategory, byKind };
}

/** Resolve a rule id to its entry, searching project rules then invariants. */
export function resolve(catalog, id) {
  return catalog.rules.get(id) ?? catalog.invariants.get(id) ?? null;
}

/**
 * Assert that every rule id the evaluator reports against is one the catalog defines.
 *
 * This is the mechanical half of the three-way separation. Its failure mode without the check is
 * quiet: a detector bound to a rule id that no longer exists simply stops mattering, and the rule
 * it was meant to enforce reports as unexamined forever while the detector still runs.
 */
export function assertBindings(catalog, ids) {
  const unknown = [...new Set(ids)].filter((id) => !resolve(catalog, id));
  if (unknown.length > 0) {
    throw new CatalogError(
      `the evaluator reports against rule id(s) the catalog does not define: ${unknown.join(", ")}. ` +
        "Add them to rules/, or correct the binding. The evaluator may not invent rule identity.",
    );
  }
}

/**
 * Framework maturity: how much of the framework is machine-represented and machine-examined.
 *
 * This travels BESIDE the verdict and never inside it (invariant.coverage-outside-verdict). Without
 * it, COMPLIANT reads as "everything was checked" when it means "everything checked passed" — and
 * in this domain most rules cannot be checked at all, so the gap is large and must stay visible.
 */
export function coverage(catalog, { evaluated, totalStandards }) {
  const examined = new Set(evaluated ?? []);
  const standards = new Set();
  const standardsFullyRepresented = new Set();
  const perStandard = new Map();

  for (const rule of catalog.rules.values()) {
    standards.add(rule.standard);
    if (!perStandard.has(rule.standard)) perStandard.set(rule.standard, []);
    perStandard.get(rule.standard).push(rule);
  }
  for (const [standard, entries] of perStandard) {
    // Deliberately strict: a standard counts as fully represented only when every one of its rules
    // is both examined by the evaluator AND carries assurance better than none.
    if (entries.every((r) => examined.has(r.id) && r.assurance !== "none")) {
      standardsFullyRepresented.add(standard);
    }
  }

  const kinds = {};
  for (const [kind, entries] of catalog.byKind) kinds[kind] = entries.length;

  return {
    rules: catalog.rules.size,
    invariants: catalog.invariants.size,
    kinds,
    evaluatedRules: [...catalog.rules.keys()].filter((id) => examined.has(id)).length,
    standardsWithRules: standards.size,
    totalStandards: totalStandards ?? null,
    standardsFullyRepresented: standardsFullyRepresented.size,
    note:
      "Coverage describes the framework, not the project. A rule with no mechanism reports " +
      "not-evaluated; it never passes by default.",
  };
}
