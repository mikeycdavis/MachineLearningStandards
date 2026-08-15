/**
 * A positive verdict requires that something was actually established.
 *
 * THE DEFECT THIS CLOSES. `scripts/compliance.mjs` opens by claiming four load-bearing properties,
 * the first being that there is NO default-pass path. That property held for individual rules and did
 * not hold for the verdict built from them. The status ladder ended in a bare `else`, so a run in
 * which every applicable rule was skipped fell through `blocked`, `no policy`, `failures` and
 * `excepted` and arrived at COMPLIANT: nothing failed, therefore everything passed.
 *
 * It was found from outside, by StandardsEnforcer invoking this pack through its published contract
 * against a directory it had no business approving:
 *
 *     applicable:    46
 *     scored:         0
 *     notEvaluated:  46
 *     status:         COMPLIANT
 *     exit:           0
 *
 * `catalog.mjs` had already named the confusion exactly — COMPLIANT reads as "everything was checked"
 * when it means "everything checked passed". When nothing was checked, neither reading supports a
 * pass.
 *
 * WHAT THESE TESTS ARE FOR. The boundary is epistemic, and both sides of it matter: a guard that
 * refuses to conclude when nothing is known is only correct if it still concludes when something is.
 * So the cases below approach the boundary from both directions, and the last one removes the guard
 * from the source and proves the suite goes red — because a test named for an invariant establishes
 * nothing unless it actually bites.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluate, STATUS } from "../scripts/compliance.mjs";

const TODAY = "2026-08-09";
const COMPLIANCE = new URL("../scripts/compliance.mjs", import.meta.url);

function rule(over = {}) {
  return {
    id: "leakage.example",
    kind: "requirement",
    title: "Example",
    standard: 8,
    requirement: "R1",
    category: "leakage",
    level: "required",
    severity: "error",
    verification: "code-analysis",
    assurance: "partial",
    nonExemptible: false,
    attestable: false,
    triggers: [],
    introducedIn: "1.0.0",
    description: "d",
    rationale: "r",
    remediation: "fix it",
    evidenceExpected: "e",
    $assuranceNote: "n",
    deprecatedIn: null,
    supersededBy: null,
    removedIn: null,
    ...over,
  };
}

const catalogOf = (rules) => ({
  rules: new Map(rules.map((r) => [r.id, r])),
  invariants: new Map(),
  byCategory: new Map(),
  byKind: new Map(),
});

const run = (opts, evaluateFn = evaluate) =>
  evaluateFn({ findings: [], evaluated: [], invariantFindings: [], today: TODAY, digests: new Map(), ...opts });

/** Two rules, so "some but not all" is expressible. */
const TWO = [rule(), rule({ id: "leakage.second" })];

// ---- The boundary, from the side where nothing is known. ----

test("applicable rules with none evaluated cannot be COMPLIANT", () => {
  const v = run({ catalog: catalogOf(TWO), policy: { rules: {} }, evaluated: [] });
  assert.equal(v.denominator.applicable, 2);
  assert.equal(v.denominator.scored, 0);
  assert.notEqual(v.status, STATUS.COMPLIANT);
  assert.notEqual(v.status, STATUS.COMPLIANT_WITH_EXCEPTIONS);
  assert.equal(v.status, STATUS.NOT_EVALUATED);
});

test("the reproduction of the specimen that found this, in miniature", () => {
  // 46 applicable, 0 scored, every result skipped — the shape StandardsEnforcer observed.
  const many = Array.from({ length: 46 }, (_, i) => rule({ id: `leakage.r${i}` }));
  const v = run({ catalog: catalogOf(many), policy: { rules: {} }, evaluated: [] });
  assert.equal(v.denominator.applicable, 46);
  assert.equal(v.denominator.scored, 0);
  assert.equal(v.assurance.notEvaluated, 46);
  assert.equal(v.status, STATUS.NOT_EVALUATED);
});

test("evidence that was sought and absent does not establish a rule either", () => {
  // insufficient-evidence has its own assurance bucket precisely because it is not knowledge. A
  // verdict resting on it would be a pass built from rules the evaluator said it could not read.
  const v = run({
    catalog: catalogOf([rule({ verification: "manual-review", assurance: "none", attestable: true })]),
    policy: { rules: {} },
    evaluated: ["leakage.example"],
  });
  assert.notEqual(v.status, STATUS.COMPLIANT);
});

// ---- The boundary, from the side where something is known. The guard must not overreach. ----

test("one rule genuinely evaluated does not collapse to NOT_EVALUATED", () => {
  const v = run({ catalog: catalogOf(TWO), policy: { rules: {} }, evaluated: ["leakage.example"] });
  assert.equal(v.denominator.scored, 1);
  assert.equal(v.status, STATUS.COMPLIANT, "one established rule is enough to have concluded something");
});

test("all applicable rules genuinely passing is still COMPLIANT", () => {
  const v = run({
    catalog: catalogOf(TWO),
    policy: { rules: {} },
    evaluated: ["leakage.example", "leakage.second"],
  });
  assert.equal(v.status, STATUS.COMPLIANT);
  assert.equal(v.score, 100);
});

test("a real violation still reports NON_COMPLIANT", () => {
  const v = run({
    catalog: catalogOf(TWO),
    policy: { rules: {} },
    evaluated: ["leakage.example", "leakage.second"],
    findings: [{ rule: "leakage.example", message: "target leaked into features" }],
  });
  assert.equal(v.status, STATUS.NON_COMPLIANT);
});

test("an invariant violation still outranks the new guard", () => {
  // Blocked means the ruler is untrustworthy, which is a different and louder claim than "nothing was
  // measured". If the evidence guard preceded it, a tampered catalog would report as merely unevaluated.
  const inv = rule({ id: "invariant.standards-integrity", kind: "invariant", nonExemptible: true });
  const v = run({
    catalog: { rules: new Map(), invariants: new Map([[inv.id, inv]]), byCategory: new Map(), byKind: new Map() },
    policy: { rules: {} },
    invariantFindings: [{ rule: inv.id, message: "the catalog has been edited" }],
  });
  assert.equal(v.status, STATUS.BLOCKED_BY_INVARIANT);
});

test("an exception still reports COMPLIANT_WITH_EXCEPTIONS", () => {
  const v = run({
    catalog: catalogOf(TWO),
    policy: {
      rules: {},
      exceptions: [{ rule: "leakage.example", reason: "r", approvedBy: "owner", approvedAt: "2026-01-01" }],
    },
    evaluated: ["leakage.example", "leakage.second"],
    findings: [{ rule: "leakage.example", message: "violation" }],
  });
  assert.equal(v.status, STATUS.COMPLIANT_WITH_EXCEPTIONS);
});

// ---- The guard is proven to bite. ----

test("MUTATION: removing the guard restores the false green", async () => {
  // The point of this test is not the mutation; it is that the tests above would pass without the
  // guard if they were weaker than they look. Here the guard is deleted from a copy of the source and
  // the zero-evidence case is re-run. If it still refuses COMPLIANT, something other than the guard
  // is doing the work and the guard is not what these tests are protecting.
  const source = fs.readFileSync(COMPLIANCE, "utf8");
  const GUARD = "  else if (established.length === 0) status = STATUS.NOT_EVALUATED;\n";
  assert.ok(source.includes(GUARD), "the guard is no longer where this mutation expects it");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ml-mutation-"));
  // The copy sits beside the original so its relative import of catalog.mjs still resolves.
  //
  // fileURLToPath rather than trimming the leading slash off `.pathname`: the trim happens to
  // produce a valid absolute path on Windows (`/F:/…` → `F:/…`) and a broken relative one
  // everywhere else (`/work/…` → `work/…`). The test was therefore Windows-only, and this
  // repository's CI runs on Linux. Found by running the suite inside the local CI container.
  const mutated = path.join(path.dirname(fileURLToPath(COMPLIANCE)), "compliance.mutated.mjs");
  try {
    fs.writeFileSync(mutated, source.replace(GUARD, ""));
    const { evaluate: mutatedEvaluate, STATUS: MUTATED_STATUS } = await import(pathToFileURL(mutated).href);
    const v = run({ catalog: catalogOf(TWO), policy: { rules: {} }, evaluated: [] }, mutatedEvaluate);
    assert.equal(
      v.status,
      MUTATED_STATUS.COMPLIANT,
      "without the guard this must report the false green; if it does not, the guard is not the thing under test",
    );
  } finally {
    fs.rmSync(mutated, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
