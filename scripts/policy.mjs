#!/usr/bin/env node
/**
 * Validate a project policy on its own, without running a full evaluation.
 *
 * Two jobs. The first is schema conformance: the policy is a contract, and a policy that does not
 * satisfy it means something other than what its author believes. The second is the semantic checks
 * a schema cannot express — a waiver against a rule that admits none, a rule declared both
 * not-applicable and excepted, and any attempt to address an invariant.
 *
 * The weakening checks live BOTH here and in the evaluator, deliberately. A guard that exists in
 * only one command is a guard you bypass by running the other one.
 *
 * Usage:
 *   node scripts/policy.mjs [path/to/project-policy.yml] [--json] [--schema <path>]
 *
 * Exit 0 valid, 1 findings, 2 the policy could not be read or does not satisfy the schema,
 * 3 an invariant was violated.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { parseYaml, YamlError } from "./yaml.mjs";
import { validate, assertSchemaSupported, SchemaError } from "./jsonschema.mjs";
import { loadCatalog, CatalogError } from "./catalog.mjs";
import { SCHEMA_VERSION } from "./compliance.mjs";

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_INVOCATION = 2;
const EXIT_BLOCKED = 3;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_POLICY = path.join(ROOT, "project-policy.yml");
const DEFAULT_SCHEMA = path.join(ROOT, "schemas/project-policy.schema.json");

const RANK = { forbidden: 3, required: 3, recommended: 2, optional: 1 };

/**
 * Semantic checks over a schema-valid policy.
 * Exported for the tests, which drive it with fixtures rather than the repository's own policy.
 *
 * `today` is a parameter rather than a call to the clock so the expiry checks are deterministic and
 * a test does not start failing on a particular date.
 */
export function checkPolicy(policy, catalog, today) {
  const findings = [];
  const invariantViolations = [];

  const declared = policy.rules ?? {};
  const applicability = policy.applicability ?? {};
  const attestations = policy.attestations ?? {};
  const exceptions = Array.isArray(policy.exceptions) ? policy.exceptions : [];

  const known = (id) => catalog.rules.has(id) || catalog.invariants.has(id);

  // An id nobody defines is a typo that silently does nothing, which is worse than an error: the
  // author believes they configured something.
  const addressed = [
    ...Object.keys(declared).map((id) => [id, "rules"]),
    ...Object.keys(applicability).map((id) => [id, "applicability"]),
    ...Object.keys(attestations).map((id) => [id, "attestations"]),
    ...exceptions.map((e) => [e.rule, "exceptions"]),
  ];
  for (const [id, section] of addressed) {
    if (!known(id)) {
      findings.push({
        id: "policy.unknown-rule",
        rule: id,
        message: `${section} names "${id}", which the catalog does not define.`,
        remediation: "Correct the id. A policy cannot configure a rule that does not exist.",
      });
    }
  }

  // Invariants are not project-adjustable. Naming one anywhere is an attempt to make an
  // unadjustable rule adjustable, which is itself the weakening INV-1 forbids.
  for (const [id, section] of addressed) {
    if (catalog.invariants.has(id)) {
      invariantViolations.push({
        id: "policy.invariant-addressed",
        rule: id,
        message: `${section} addresses the invariant "${id}". Invariants are not project-adjustable.`,
        remediation: `Remove every reference to ${id} from the policy.`,
      });
    }
  }

  // A policy may raise an obligation and may never lower one.
  for (const [id, setting] of Object.entries(declared)) {
    const rule = catalog.rules.get(id);
    if (!rule || !setting?.level) continue;
    if ((RANK[setting.level] ?? 0) < (RANK[rule.level] ?? 0)) {
      invariantViolations.push({
        id: "policy.weakened-standard",
        rule: id,
        message: `${id} is set to "${setting.level}" but the catalog defines it as "${rule.level}".`,
        remediation:
          `Restore "${rule.level}". If the rule has no subject here, declare it not-applicable with a ` +
          "reason; if it applies and is knowingly unmet, write an exception with an approver.",
      });
    }
  }

  // A prohibition dismissed as not-applicable without a substantive reason is the quiet form of the
  // same weakening. The schema already requires a reason string; this catches the placeholder.
  for (const [id, decl] of Object.entries(applicability)) {
    const rule = catalog.rules.get(id);
    if (!rule || decl?.status !== "not-applicable") continue;
    const reason = (decl.reason ?? "").trim();
    if (rule.kind === "prohibition" && reason.length < 20) {
      invariantViolations.push({
        id: "policy.unreasoned-prohibition-dismissal",
        rule: id,
        message:
          `the prohibition ${id} is declared not-applicable with a reason of ${reason.length} characters. ` +
          "Dismissing a prohibition requires saying why its subject does not exist here.",
        remediation:
          `Explain what about this project means ${id} has nothing to bite on, or remove the declaration.`,
      });
    }
  }

  for (const entry of exceptions) {
    const rule = catalog.rules.get(entry.rule);
    if (!rule) continue;

    // Checked before expiry: a non-exemptible waiver is invalid whether or not it has lapsed, and
    // reporting it as expired would imply that renewing it would work.
    if (rule.nonExemptible) {
      findings.push({
        id: "policy.non-exemptible-rule",
        rule: entry.rule,
        message: `${entry.rule} is non-exemptible; the exception against it is rejected, not applied.`,
        remediation: rule.$exemptibilityNote ?? "Remove the exception and satisfy the rule.",
      });
      continue;
    }
    if (entry.expires && entry.expires < today) {
      findings.push({
        id: "policy.expired-exception",
        rule: entry.rule,
        message: `the exception for ${entry.rule} expired on ${entry.expires}.`,
        remediation: "Renew it with a fresh approval, or satisfy the rule.",
      });
    }
  }

  // A rule cannot both have no subject here and be a subject this project knowingly fails.
  for (const entry of exceptions) {
    if (applicability[entry.rule]?.status === "not-applicable") {
      findings.push({
        id: "policy.conflicting-classification",
        rule: entry.rule,
        message:
          `${entry.rule} is declared not-applicable and also carries an exception. ` +
          "The two are different claims and cannot both be true.",
        remediation:
          "Decide which is meant. Not-applicable = the rule has no subject here. Exception = it applies " +
          "and is knowingly unmet.",
      });
    }
  }

  // An attestation on a rule the catalog does not mark attestable is an assertion standing in for a
  // mechanism that exists. Caught here as well as in the evaluator.
  for (const [id, attestation] of Object.entries(attestations)) {
    const rule = catalog.rules.get(id);
    if (!rule) continue;
    if (!rule.attestable) {
      findings.push({
        id: "policy.non-attestable-rule",
        rule: id,
        message: `${id} is evaluated by ${rule.verification}, not by human review, so it cannot be attested.`,
        remediation: "Remove the attestation and let the mechanism evaluate the rule.",
      });
    }
    if (attestation.expires && attestation.expires < today) {
      findings.push({
        id: "policy.expired-attestation",
        rule: id,
        message: `the attestation for ${id} expired on ${attestation.expires}; the rule is unreviewed again.`,
        remediation: "Re-review the rule and record a fresh attestation.",
      });
    }
  }

  return { findings, invariantViolations };
}

function parseArgs(argv) {
  const args = { policy: null, schema: DEFAULT_SCHEMA, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--schema") args.schema = path.resolve(argv[++i] ?? "");
    else if (arg.startsWith("--schema=")) args.schema = path.resolve(arg.slice("--schema=".length));
    else if (!arg.startsWith("--")) args.policy = path.resolve(arg);
  }
  args.policy ??= DEFAULT_POLICY;
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.policy)) {
    process.stderr.write(`policy: no policy file at ${args.policy}\n`);
    return EXIT_INVOCATION;
  }

  let catalog;
  let schema;
  let policy;
  try {
    catalog = await loadCatalog();
    schema = JSON.parse(await readFile(args.schema, "utf8"));
    assertSchemaSupported(schema);
    policy = parseYaml(await readFile(args.policy, "utf8"));
  } catch (err) {
    const label =
      err instanceof CatalogError ? "catalog" :
      err instanceof YamlError ? "policy" :
      err instanceof SchemaError ? "schema" : "input";
    process.stderr.write(`policy: ${label} could not be read — ${err.message}\n`);
    return EXIT_INVOCATION;
  }

  const schemaErrors = validate(policy, schema);
  if (schemaErrors.length > 0) {
    if (args.json) {
      process.stdout.write(
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, status: "invalid", schemaErrors }, null, 2) + "\n",
      );
    } else {
      process.stderr.write(`policy: ${args.policy} does not satisfy the schema.\n`);
      for (const e of schemaErrors) process.stderr.write(`  ${e.path || "(root)"}: ${e.message}\n`);
      process.stderr.write(
        "\nThis is a configuration error, not a compliance failure. Nothing was evaluated.\n",
      );
    }
    return EXIT_INVOCATION;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { findings, invariantViolations } = checkPolicy(policy, catalog, today);
  const status = invariantViolations.length > 0 ? "BLOCKED_BY_INVARIANT" : findings.length > 0 ? "findings" : "ok";

  if (args.json) {
    process.stdout.write(
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, status, findings, invariantViolations }, null, 2) + "\n",
    );
  } else {
    const out = [`Policy: ${path.relative(ROOT, args.policy) || args.policy}`, ""];
    out.push(`  Schema: valid`);
    out.push(`  Declares standardVersion ${policy.standardVersion}`);
    out.push("");
    if (invariantViolations.length > 0) {
      out.push("  BLOCKED_BY_INVARIANT — invariant.standards-integrity");
      for (const f of invariantViolations) {
        out.push(`    ${f.id}: ${f.message}`);
        out.push(`      → ${f.remediation}`);
      }
      out.push("");
    }
    if (findings.length > 0) {
      out.push("  Findings:");
      for (const f of findings) {
        out.push(`    ${f.id}: ${f.message}`);
        out.push(`      → ${f.remediation}`);
      }
    } else if (invariantViolations.length === 0) {
      out.push("  No findings. The policy is valid and internally consistent.");
      out.push("  This says nothing about whether the project complies — run `standards evaluate` for that.");
    }
    process.stdout.write(out.join("\n") + "\n");
  }

  if (invariantViolations.length > 0) return EXIT_BLOCKED;
  return findings.length > 0 ? EXIT_FINDINGS : EXIT_OK;
}

if (process.argv[1]?.endsWith("policy.mjs")) {
  process.exit(await main());
}
