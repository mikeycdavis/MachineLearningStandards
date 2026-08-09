/**
 * The catalog baseline: the guard against a standard being edited rather than met.
 *
 * These tests are mutation tests by nature. Each one takes the real catalog, performs the exact
 * weakening somebody under deadline pressure would perform, and asserts the guard notices. A guard
 * that passes its own unit test while failing on the real edit is the failure mode this style
 * exists to catch — the sibling framework once shipped a freshness checker that compared only first
 * lines and therefore reported clean on precisely the edit it was written to detect.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../scripts/catalog.mjs";
import { checkIntegrity } from "../scripts/integrity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts/integrity.mjs");
const catalog = await loadCatalog();
const baseline = JSON.parse(await readFile(path.join(ROOT, "artifacts/catalog-baseline.json"), "utf8"));

/** Return a catalog identical to the real one except for one rule, mutated. */
function mutate(id, changes) {
  const clone = {
    rules: new Map([...catalog.rules].map(([k, v]) => [k, { ...v }])),
    invariants: new Map([...catalog.invariants].map(([k, v]) => [k, { ...v }])),
  };
  const target = clone.rules.get(id) ?? clone.invariants.get(id);
  Object.assign(target, changes);
  return clone;
}

function without(id) {
  const clone = {
    rules: new Map([...catalog.rules].map(([k, v]) => [k, { ...v }])),
    invariants: new Map([...catalog.invariants].map(([k, v]) => [k, { ...v }])),
  };
  clone.rules.delete(id);
  clone.invariants.delete(id);
  return clone;
}

const changes = (report) => new Set(report.findings.map((f) => f.change));

// ---- The control. ----

test("the live catalog matches its reviewed baseline", () => {
  const report = checkIntegrity(catalog, baseline);
  assert.deepEqual(report.findings, [], "no standard has been weakened");
  assert.deepEqual(report.unlocked, [], "the baseline covers every rule");
  assert.equal(report.lockedCount, report.liveCount);
});

test("the baseline locks every property that could be weakened", () => {
  for (const entry of baseline.rules) {
    for (const field of ["kind", "level", "severity", "verification", "assurance", "nonExemptible", "attestable"]) {
      assert.ok(field in entry, `${entry.id} locks ${field}`);
    }
  }
});

// ---- Each mutation is a route somebody actually takes to make a failing rule stop failing. ----

test("deleting a rule is caught", () => {
  const report = checkIntegrity(without("leakage.no-target-in-features"), baseline);
  assert.ok(changes(report).has("removed"));
});

test("lowering a rule's level is caught", () => {
  const report = checkIntegrity(mutate("data.version-pinned", { level: "optional" }), baseline);
  assert.ok(changes(report).has("weakened-level"));
});

test("reclassifying a prohibition as a recommendation is caught", () => {
  const report = checkIntegrity(
    mutate("evaluation.no-hidden-segments", { kind: "recommendation", level: "recommended" }),
    baseline,
  );
  assert.ok(changes(report).has("reclassified"));
});

test("turning off non-exemptibility is caught", () => {
  const report = checkIntegrity(mutate("integrity.no-fabricated-datasets", { nonExemptible: false }), baseline);
  assert.ok(changes(report).has("made-exemptible"));
});

test("making a document rule attestable is caught", () => {
  // The subtlest route: leave the rule at required, and permit an assertion to satisfy it.
  const report = checkIntegrity(mutate("deployment.model-card", { attestable: true }), baseline);
  assert.ok(changes(report).has("made-attestable"));
});

test("downgrading a rule's verification method is caught", () => {
  const report = checkIntegrity(
    mutate("leakage.no-preprocessing-leakage", { verification: "manual-review" }),
    baseline,
  );
  assert.ok(changes(report).has("weakened-verification"));
});

test("quietly reducing a rule's claimed assurance is caught", () => {
  const report = checkIntegrity(mutate("data.version-pinned", { assurance: "none" }), baseline);
  assert.ok(changes(report).has("weakened-assurance"));
});

test("weakening an invariant is caught like any other rule", () => {
  const report = checkIntegrity(mutate("invariant.standards-integrity", { nonExemptible: false }), baseline);
  assert.ok(changes(report).has("made-exemptible"));
});

// ---- The guard must not fire on legitimate change, or it will be disabled. ----

test("raising a rule's level is not a weakening", () => {
  const report = checkIntegrity(
    mutate("reproducibility.seeds-recorded", { level: "required", kind: "recommendation" }),
    baseline,
  );
  assert.ok(!changes(report).has("weakened-level"), "a strengthened obligation is allowed");
});

test("strengthening verification is not a weakening", () => {
  const report = checkIntegrity(
    mutate("evaluation.no-hidden-segments", { verification: "code-analysis" }),
    baseline,
  );
  assert.ok(!changes(report).has("weakened-verification"));
});

test("a new rule is reported for coverage, not as a violation", () => {
  const clone = {
    rules: new Map([...catalog.rules].map(([k, v]) => [k, { ...v }])),
    invariants: new Map([...catalog.invariants].map(([k, v]) => [k, { ...v }])),
  };
  clone.rules.set("data.newly-added", { ...catalog.rules.get("data.version-pinned"), id: "data.newly-added" });
  const report = checkIntegrity(clone, baseline);
  assert.deepEqual(report.findings, [], "adding a rule is how the framework grows");
  assert.deepEqual(report.unlocked, ["data.newly-added"], "but the baseline should be brought up to date");
});

// ---- The exit contract, which is what CI and an agent actually see. ----

test("the integrity command exits 0 on the real repository", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/integrity.mjs"), "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.status, "ok");
  assert.equal(out.schemaVersion, "1.0.0");
});

test("a catalog that no longer matches its baseline exits 3, not 1", async () => {
  // Exit 3 is what makes the refusal machine-visible to CI, or to an agent that sees only a code.
  // A tampered baseline models the same disagreement as a tampered catalog — the check is symmetric
  // about which side moved — and lets the real command be exercised without editing rules/.
  const tampered = JSON.parse(JSON.stringify(baseline));
  const entry = tampered.rules.find((r) => r.id === "integrity.no-fabricated-datasets");
  entry.level = "required";
  entry.kind = "requirement";

  const file = path.join(await mkdtemp(path.join(tmpdir(), "mls-integrity-")), "baseline.json");
  await writeFile(file, JSON.stringify(tampered));

  const r = spawnSync(process.execPath, [SCRIPT, `--baseline=${file}`, "--json"], { encoding: "utf8" });
  assert.equal(r.status, 3, `expected exit 3, got ${r.status}: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.status, "BLOCKED_BY_INVARIANT");
  assert.equal(out.invariant, "invariant.standards-integrity");
  assert.ok(out.findings.some((f) => f.change === "reclassified"));
});

test("a missing baseline exits 2, never 0", () => {
  // Nothing checked must never read as nothing weakened.
  const r = spawnSync(process.execPath, [SCRIPT, "--baseline=./no-such-baseline.json"], { encoding: "utf8" });
  assert.equal(r.status, 2, "an absent baseline is a configuration error, not a clean result");
  assert.match(r.stderr, /nothing detects a weakened rule/);
});
