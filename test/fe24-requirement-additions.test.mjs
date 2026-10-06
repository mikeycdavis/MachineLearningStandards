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
import { readFile, writeFile, mkdtemp, cp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
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

// ---- Codex P1 on #64: conditional applicability is declared, not inferred from training code. ----
//
// N3, N5 and N8 each bind only under a condition no scan can see (a proxy label; a reported
// performance figure; a pretrained artifact or public benchmark in evaluation). A project that
// contains training code but lacks the condition declares not-applicable, and that declaration
// must not be reported back as contradicted because training code exists.

const CLI = path.join(ROOT, "scripts/standards.mjs");

test("P1 (Codex) · the three conditional additions carry no scan trigger, so training code cannot contradict a declaration", () => {
  for (const id of ADDITIONS.keys()) {
    assert.deepEqual(catalog.rules.get(id).triggers, [],
      `${id} is conditional on something no trigger detects; a training-code trigger would fire on every ML project`);
  }
});

async function inTrainingProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-fe24-"));
  try {
    await cp(path.join(ROOT, "test/fixtures/clean-repo"), dir, { recursive: true });
    const blocks = [...ADDITIONS.keys()].map((id) =>
      `  ${id}:
    status: not-applicable
    reason: "Trains from scratch on private data; the condition this rule is about is absent."
` +
      `    reviewedAt: "2026-10-05"
    revisitWhen: "A pretrained artifact, public benchmark, proxy label or reported figure is introduced."
`).join("");
    await writeFile(path.join(dir, "project-policy.yml"),
      `standardVersion: "1.0.0"
project: "trains-from-scratch"
applicability:
${blocks}exceptions: []
`);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("P1 (Codex) · a training project that correctly declares the conditions absent is not told its declaration drifted", async () => {
  await inTrainingProject((dir) => {
    const r = spawnSync(process.execPath, [CLI, "status", `--dir=${dir}`, "--json"], { encoding: "utf8" });
    const report = JSON.parse(r.stdout);
    const drift = report.items.filter((i) => i.kind === "applicability-drift").map((i) => i.rule);
    assert.deepEqual(drift, [], `declared-absent conditions were reported as drift: ${drift.join(", ")}`);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("P1 (Codex) · explain does not claim the scan observed the condition, and says applicability is declared", async () => {
  await inTrainingProject((dir) => {
    for (const id of ADDITIONS.keys()) {
      const r = spawnSync(process.execPath, [CLI, "explain", id, dir, "--json"], { encoding: "utf8" });
      const e = JSON.parse(r.stdout);
      const a = (e.explanations?.[0] ?? e).applicability;
      assert.deepEqual(a.triggersFired, [], id);
      assert.doesNotMatch(a.why, /scan observed/i, id);
    }
  });
});

test("P1 (Codex) · an undeclared project is still asked for the statement, so removing the trigger does not excuse anyone", () => {
  const verdict = evaluate({
    catalog, policy: { rules: {} }, findings: [], evaluated: [], invariantFindings: [],
    today: "2026-10-05", digests: new Map(),
  });
  for (const id of ADDITIONS.keys()) {
    assert.ok(verdict.evidenceRequests.some((r) => r.rule === id), `${id} still requests evidence when not declared`);
  }
});

// ---- Codex P2 on #64: the scope note's account of merged pull requests must match the history. ----

test("P2 (Codex) · scope.md does not claim main has no merged pull requests, and names the three it records", async () => {
  const scope = await readFile(path.join(ROOT, "artifacts/backlog/scope.md"), "utf8");
  assert.doesNotMatch(scope, /contains no merged pull requests/i,
    "main's history has merge commits for #1, #62 and #64");
  assert.doesNotMatch(scope, /nothing to run against|report NOT RUN rather/i,
    "the reconciliation check that matches evidence to merged pull requests is not empty here");
  for (const n of ["#1", "#62", "#64"]) {
    assert.ok(scope.includes(n), `scope.md names merged pull request ${n}`);
  }
});
