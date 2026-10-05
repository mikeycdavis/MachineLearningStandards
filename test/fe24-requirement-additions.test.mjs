/**
 * FE-24: the three requirement additions N3, N5 and N8, and the evidence request N3 emits.
 *
 * `introducedIn: "2.0.0"` is an UNRELEASED MAJOR on this tree. VERSION stays at 1.1.0 and no tag
 * exists for it; it is deliberately not the same release as the 2.0.0 described on the
 * `design/publication-state-correction` branch. The tests pin the three entries individually so
 * the allowance cannot be borrowed by a fourth requirement.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../scripts/catalog.mjs";
import { parseYaml } from "../scripts/yaml.mjs";
import { evaluate } from "../scripts/compliance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = await loadCatalog();

const ADDITIONS = new Map([
  ["framing.proxy-label-relationship-recorded", { standard: 1, requirement: "R6" }],
  ["evaluation.external-validation-stated", { standard: 5, requirement: "R6" }],
  ["leakage.pretraining-contamination-stated", { standard: 8, requirement: "R5" }],
]);

test("the three additions are manual-review requirements, pinned to the unreleased 2.0.0 MAJOR", () => {
  for (const [id, home] of ADDITIONS) {
    const rule = catalog.rules.get(id);
    assert.ok(rule, `${id} is in the catalog`);
    assert.equal(rule.kind, "requirement");
    assert.equal(rule.level, "required");
    assert.equal(rule.verification, "manual-review");
    assert.equal(rule.assurance, "none");
    assert.equal(rule.nonExemptible, false);
    assert.equal(rule.attestable, true);
    assert.equal(rule.introducedIn, "2.0.0");
    assert.equal(rule.standard, home.standard);
    assert.equal(rule.requirement, home.requirement);
  }
});

test("no other requirement or prohibition claims the unreleased 2.0.0", () => {
  const claimed = [...catalog.rules.values()]
    .filter((r) => r.introducedIn === "2.0.0" && r.kind !== "recommendation")
    .map((r) => r.id)
    .sort();
  assert.deepEqual(claimed, [...ADDITIONS.keys()].sort());
});

test("the reviewed baseline locks exactly those three, and still names the version this tree holds", async () => {
  const baseline = JSON.parse(await readFile(path.join(ROOT, "artifacts/catalog-baseline.json"), "utf8"));
  const version = (await readFile(path.join(ROOT, "VERSION"), "utf8")).trim();
  assert.equal(baseline.frameworkVersion, version,
    "the baseline may not name a version the tree does not hold");
  for (const id of ADDITIONS.keys()) {
    const locked = baseline.rules.find((r) => r.id === id);
    assert.ok(locked, `${id} is locked in the baseline`);
    assert.equal(locked.kind, "requirement");
    assert.equal(locked.nonExemptible, false);
  }
});

test("this repository's policy declares each addition, with a reason and a revisit condition", async () => {
  const policy = parseYaml(await readFile(path.join(ROOT, "project-policy.yml"), "utf8"));
  for (const id of ADDITIONS.keys()) {
    const entry = policy.applicability?.[id];
    assert.ok(entry, `${id} is addressed in project-policy.yml, so it is not excluded by omission`);
    assert.equal(entry.status, "not-applicable");
    assert.ok(entry.reason && entry.revisitWhen, `${id} states why and when to revisit`);
  }
});

// ---- P1: a project whose predicted and decided quantities are the same owes nothing. ----

const PROXY = "framing.proxy-label-relationship-recorded";

function proxyRequest() {
  const verdict = evaluate({
    catalog, policy: { rules: {} }, findings: [], evaluated: [], invariantFindings: [],
    today: "2026-10-05", digests: new Map(),
  });
  return verdict.evidenceRequests.find((r) => r.rule === PROXY);
}

test("P1 · the evidence requested for N3 asks for the proxy relationship where quantities differ", () => {
  const request = proxyRequest();
  assert.ok(request, "an unattested project is asked for evidence");
  assert.match(request.needs, /differ/i);
  assert.match(request.needs, /proxy relationship/i);
  assert.match(request.needs, /known divergences/i);
});

test("P1 · the evidence requested for N3 does not require a statement when the quantities are identical", () => {
  const { needs } = proxyRequest();
  assert.doesNotMatch(needs, /do(es)? not differ|are the same|is the same|same quantity|identical/i,
    "R6 applies only where R1 and R3 name different quantities; an equal pair carries no obligation");
  const rule = catalog.rules.get(PROXY);
  assert.equal(rule.evidenceExpected, needs, "the request is the catalog text, so the catalog text is what is tested");
  assert.match(rule.remediation, /same quantity, nothing is required/i,
    "the remediation keeps the exclusion that the evidence request must agree with");
});
