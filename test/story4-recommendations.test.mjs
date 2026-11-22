/** Story 4 (issue #44, C7): two recommendations. They are MINOR-class additions: no requirement, no scan trigger change. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../scripts/catalog.mjs";

const catalog = await loadCatalog();
const IDS = new Map([
  ["evaluation.fairness-applicability-assessed", { standard: 25, requirement: "R6" }],
  ["data.subpopulations-identified-or-unknown", { standard: 3, requirement: "R10" }],
]);

test("story 4 adds two attestable manual-review recommendations, and no requirement", () => {
  for (const [id, home] of IDS) {
    const r = catalog.rules.get(id);
    assert.ok(r, `${id} exists`);
    assert.equal(r.kind, "recommendation");
    assert.equal(r.level, "recommended");
    assert.equal(r.verification, "manual-review");
    assert.equal(r.assurance, "none");
    assert.equal(r.attestable, true);
    assert.equal(r.nonExemptible, false);
    assert.equal(r.introducedIn, "1.2.0");
    assert.equal(r.standard, home.standard);
    assert.equal(r.requirement, home.requirement);
  }
});

test("nothing outside the unreleased 2.0.0 additions and these two claims a new requirement or prohibition", () => {
  const added = [...catalog.rules.values()].filter((r) => r.introducedIn === "1.2.0" && r.kind !== "recommendation");
  assert.deepEqual(added, []);
});

test("fairness assessment stays conditional: three outcomes, and no protected attribute is required (ADR 0009)", () => {
  const r = catalog.rules.get("evaluation.fairness-applicability-assessed");
  assert.match(r.description, /applicable/);
  assert.match(r.description, /not applicable/);
  assert.match(r.description, /not evaluated/);
  assert.match(r.rationale, /No protected attribute needs to be collected/);
});
