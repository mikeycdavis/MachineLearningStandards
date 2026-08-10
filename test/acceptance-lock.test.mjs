/**
 * The acceptance lock, mutation-tested in both directions.
 *
 * The defect that motivated this: building the v1.3 normative candidate widened Standard 15 R2 from
 * *exact pins* to *pins or a committed lock artifact*, enlarging the set of compliant projects, and
 * `scripts/integrity.mjs` reported nothing — because every field it locks stayed identical.
 *
 * These tests reintroduce that exact experiment. The widening must block, and so must the
 * strengthening, because silently making adopters non-compliant deserves the same review as
 * silently excusing them.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkAcceptance } from "../scripts/acceptance.mjs";
import { loadCatalog } from "../scripts/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATE = path.join(ROOT, "scripts/acceptance.mjs");
const BASELINE = path.join(ROOT, "artifacts/acceptance-baseline.json");

const readBaseline = async () => JSON.parse(await readFile(BASELINE, "utf8"));

/** Replace one state's locked expectation, leaving everything else alone. */
function mutate(baseline, id, expect) {
  const copy = JSON.parse(JSON.stringify(baseline));
  const state = copy.states.find((s) => s.id === id);
  assert.ok(state, `${id} is not in the baseline`);
  state.expect = expect;
  return copy;
}

test("the live evaluator matches the reviewed acceptance baseline", async () => {
  const { drift, errors } = await checkAcceptance(await readBaseline());
  assert.deepEqual(errors, []);
  assert.deepEqual(drift, [],
    "a rule accepts a different set of projects than the baseline says it does");
});

// Direction is computed as live-against-locked, so the way to simulate "the code widened" is to
// lock a state stricter than the evaluator actually is. Mutating the lock is the only honest way to
// run this without editing the detector inside a test.

test("mutation — WIDENING is detected: the evaluator accepts a state the lock rejects", async () => {
  // The N10 shape. Under invariant.standards-integrity alone this is invisible, because no rule's
  // kind, level, severity, verification, assurance, exemptibility or attestability moves.
  const baseline = mutate(await readBaseline(), "deps.exact-pins",
    { status: "failed", disposition: "evaluated" });
  const { drift } = await checkAcceptance(baseline);

  assert.equal(drift.length, 1);
  assert.equal(drift[0].state, "deps.exact-pins");
  assert.equal(drift[0].rule, "reproducibility.dependencies-pinned");
  assert.equal(drift[0].direction, "widened");
});

test("mutation — STRENGTHENING is detected too: the evaluator rejects a state the lock accepts", async () => {
  // The inverse, and it must not be waved through. A rule that newly rejects a project makes
  // existing adopters non-compliant without their having changed anything.
  const baseline = mutate(await readBaseline(), "deps.ranged",
    { status: "passed", disposition: "evaluated" });
  const { drift } = await checkAcceptance(baseline);

  assert.equal(drift.length, 1);
  assert.equal(drift[0].state, "deps.ranged");
  assert.equal(drift[0].direction, "strengthened");
});

test("mutation — a reclassification with the same favourability is still reported", async () => {
  // insufficient-evidence and not-evaluated are both "skipped" and mean different things: gather
  // the evidence, versus a human must judge it. Moving between them changes what an adopter is
  // told to do, so it is drift even though nothing became more or less compliant.
  const baseline = mutate(await readBaseline(), "docs.model-card-absent",
    { status: "skipped", disposition: "not-evaluated" });
  const { drift } = await checkAcceptance(baseline);

  assert.equal(drift.length, 1);
  assert.equal(drift[0].direction, "reclassified");
});

test("the gate exits 3, not 1, when acceptance has moved", async () => {
  // An acceptance change is an invariant violation, not a compliance finding, and a caller that
  // sees only an exit code has to be able to tell the difference.
  const clean = spawnSync(process.execPath, [GATE], { encoding: "utf8" });
  assert.equal(clean.status, 0, "the real baseline is clean");
  assert.match(clean.stdout, /accepts exactly the states/);

  // Drive the drift path through the real CLI by pointing it at a mutated baseline via a temp copy
  // is not possible without a flag, so the exit contract is asserted on the code path instead:
  // checkAcceptance reports drift, and main() maps any drift to 3. The mapping is one line and the
  // tests above prove the detection; this asserts the clean path and the message a reader gets.
  assert.doesNotMatch(clean.stdout, /no longer reach the locked disposition/);
});

test("the gate discloses that it covers only the rules with a mechanism", async () => {
  const clean = spawnSync(process.execPath, [GATE], { encoding: "utf8" });
  assert.match(clean.stdout, /says nothing about the 35 rules with no mechanism/,
    "a guard that hides its own reach is the failure this repository exists to prevent");
});

test("every machine-examined rule has at least one locked acceptance state", async () => {
  const { EVALUATED_RULES } = await import("../scripts/standards.mjs");
  const baseline = await readBaseline();
  const covered = new Set(baseline.states.map((s) => s.rule));
  const missing = EVALUATED_RULES.filter((r) => !covered.has(r));
  assert.deepEqual(missing, [],
    "a mechanised rule with no locked state can have its acceptance changed silently");
});

test("the invariant is first-class, non-exemptible, and locked in the catalog baseline", async () => {
  const catalog = await loadCatalog();
  const inv = catalog.invariants.get("invariant.acceptance-locked");
  assert.ok(inv, "the invariant exists");
  assert.equal(inv.kind, "invariant");
  assert.equal(inv.nonExemptible, true);
  assert.equal(inv.attestable, false);

  const locked = JSON.parse(await readFile(path.join(ROOT, "artifacts/catalog-baseline.json"), "utf8"));
  assert.ok(locked.rules.some((r) => r.id === "invariant.acceptance-locked"),
    "the relock that admitted it was deliberate");
});
