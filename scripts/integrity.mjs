#!/usr/bin/env node
/**
 * Catalog integrity: has the standard itself been weakened?
 *
 * This is the first of the five mechanisms protecting invariant.standards-integrity
 * (artifacts/adr/0005-integrity-invariant-enforcement.md). The route it closes is the most direct
 * one there is: a required rule fails, a deadline is close, and the cheapest path to green is to
 * edit the rule rather than the work. An agent instructed to "make the checks pass" finds that path
 * immediately, and finds it faster than a person would.
 *
 * artifacts/catalog-baseline.json is a committed, human-reviewed lock of every rule's kind, level,
 * severity, verification, and exemptibility. This script compares the live catalog against it.
 *
 * The point is NOT that the catalog can never change — it must, as the framework grows. The point
 * is that it cannot change invisibly. A legitimate change updates the baseline deliberately and
 * records the reason in CHANGELOG.md, which converts a silent edit into a reviewable one.
 *
 * Exit 0 when the catalog matches its baseline, 3 when it has been weakened (an invariant
 * violation, distinct from an ordinary finding), 2 on invocation error.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { loadCatalog, CatalogError } from "./catalog.mjs";
import { SCHEMA_VERSION } from "./compliance.mjs";

const EXIT_OK = 0;
const EXIT_INVOCATION = 2;
const EXIT_BLOCKED = 3;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "artifacts/catalog-baseline.json");
const JSON_OUT = process.argv.includes("--json");

/** Obligation strength, for deciding whether a level change is a weakening or a strengthening. */
const RANK = { forbidden: 3, required: 3, recommended: 2, optional: 1 };

/**
 * How much a verification method can establish, ordered. Moving a rule from code-analysis to
 * manual-review removes a mechanical check; that may be right, and it must be visible.
 */
const VERIFICATION_RANK = {
  "manual-review": 0,
  document: 1,
  configuration: 2,
  "code-analysis": 3,
  structural: 4,
};

const ASSURANCE_RANK = { none: 0, partial: 1, full: 2 };

/**
 * Compare the live catalog against the reviewed baseline.
 * Exported so the tests can drive it with fixtures rather than by editing the real catalog.
 */
export function checkIntegrity(catalog, baseline) {
  const findings = [];
  const live = new Map();
  for (const rule of catalog.rules.values()) live.set(rule.id, rule);
  for (const rule of catalog.invariants.values()) live.set(rule.id, rule);

  const locked = new Map(baseline.rules.map((r) => [r.id, r]));

  for (const [id, was] of locked) {
    const now = live.get(id);

    if (!now) {
      findings.push({
        id,
        change: "removed",
        message: `${id} is in the reviewed baseline and no longer exists in the catalog.`,
        remediation:
          "Restore the rule. If its retirement is intended, set deprecatedIn/removedIn on the entry, " +
          "update the baseline, and record the reason in CHANGELOG.md.",
      });
      continue;
    }

    if (now.kind !== was.kind) {
      findings.push({
        id,
        change: "reclassified",
        message: `${id} was a ${was.kind} in the reviewed baseline and is now a ${now.kind}.`,
        remediation: `Restore kind "${was.kind}", or update the baseline deliberately and say why in CHANGELOG.md.`,
      });
    }

    if (now.level !== was.level && (RANK[now.level] ?? 0) < (RANK[was.level] ?? 0)) {
      findings.push({
        id,
        change: "weakened-level",
        message: `${id} was "${was.level}" in the reviewed baseline and is now "${now.level}".`,
        remediation: `Restore level "${was.level}". Lowering an obligation is a MAJOR version change, not an edit.`,
      });
    }

    if (was.nonExemptible === true && now.nonExemptible !== true) {
      findings.push({
        id,
        change: "made-exemptible",
        message: `${id} was non-exemptible in the reviewed baseline and now admits exceptions.`,
        remediation:
          "Restore nonExemptible: true. This flag marks rules where an exception would amount to " +
          "written permission to deceive; turning it off is exactly the weakening INV-1 forbids.",
      });
    }

    if ((VERIFICATION_RANK[now.verification] ?? 0) < (VERIFICATION_RANK[was.verification] ?? 0)) {
      findings.push({
        id,
        change: "weakened-verification",
        message:
          `${id} was verified by ${was.verification} in the reviewed baseline and is now verified by ` +
          `${now.verification}, which establishes less.`,
        remediation: `Restore ${was.verification} verification, or update the baseline and explain the change.`,
      });
    }

    if ((ASSURANCE_RANK[now.assurance] ?? 0) < (ASSURANCE_RANK[was.assurance] ?? 0)) {
      findings.push({
        id,
        change: "weakened-assurance",
        message: `${id} claimed ${was.assurance} assurance in the reviewed baseline and now claims ${now.assurance}.`,
        remediation:
          "A reduction in assurance is honest when the check genuinely got weaker and is a weakening " +
          "when the check did not change. Update the baseline only in the first case.",
      });
    }
  }

  // A rule present in the catalog and absent from the baseline is NOT a violation — adding rules is
  // how the framework grows. It is reported so the baseline can be kept current, because a baseline
  // that has stopped covering half the catalog is protecting half the catalog.
  const unlocked = [...live.keys()].filter((id) => !locked.has(id)).sort();

  return { findings, unlocked, lockedCount: locked.size, liveCount: live.size };
}

async function main() {
  if (!existsSync(BASELINE)) {
    process.stderr.write(
      `integrity: no reviewed baseline at artifacts/catalog-baseline.json.\n` +
        `Without it nothing detects a weakened rule. Create it from the current catalog and review it.\n`,
    );
    return EXIT_INVOCATION;
  }

  let catalog;
  let baseline;
  try {
    catalog = await loadCatalog();
    baseline = JSON.parse(await readFile(BASELINE, "utf8"));
  } catch (err) {
    const label = err instanceof CatalogError ? "catalog" : "baseline";
    process.stderr.write(`integrity: ${label} could not be read — ${err.message}\n`);
    return EXIT_INVOCATION;
  }

  const report = checkIntegrity(catalog, baseline);
  const blocked = report.findings.length > 0;

  if (JSON_OUT) {
    process.stdout.write(
      JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          status: blocked ? "BLOCKED_BY_INVARIANT" : "ok",
          invariant: "invariant.standards-integrity",
          baselineReviewedOn: baseline.reviewedOn ?? null,
          ...report,
        },
        null,
        2,
      ) + "\n",
    );
    return blocked ? EXIT_BLOCKED : EXIT_OK;
  }

  const out = [];
  out.push(`Catalog integrity (baseline reviewed ${baseline.reviewedOn ?? "date not recorded"})`);
  out.push(`  Locked rules: ${report.lockedCount}    Live rules: ${report.liveCount}`);
  out.push("");

  if (report.unlocked.length > 0) {
    out.push("  Not yet in the baseline (new rules are not violations, but the baseline should cover them):");
    for (const id of report.unlocked) out.push(`    + ${id}`);
    out.push("");
  }

  if (!blocked) {
    out.push("  The catalog matches its reviewed baseline. No standard has been weakened.");
  } else {
    out.push("  BLOCKED_BY_INVARIANT — invariant.standards-integrity");
    out.push("");
    for (const f of report.findings) {
      out.push(`    ${f.change}: ${f.message}`);
      out.push(`      → ${f.remediation}`);
    }
    out.push("");
    out.push("  A standard, its level, or its verification changed without the reviewed baseline");
    out.push("  changing with it. This is reported as blocked rather than as a compliance failure");
    out.push("  because a verdict computed against an altered ruler is not a verdict.");
  }

  process.stdout.write(out.join("\n") + "\n");
  return blocked ? EXIT_BLOCKED : EXIT_OK;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("integrity.mjs")) {
  process.exit(await main());
}
