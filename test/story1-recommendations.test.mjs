/** Story 1 (issue #44, C7): four recommendations. They are MINOR-class additions: no requirement, no scan trigger change. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../scripts/catalog.mjs";

const catalog = await loadCatalog();
const IDS = new Map([
  ["data.purpose-and-composition-recorded", { standard: 3, requirement: "R5" }],
  ["data.quality-limitations-recorded", { standard: 3, requirement: "R6" }],
  ["data.permitted-use-recorded", { standard: 3, requirement: "R7" }],
  ["framing.population-and-ml-motivation-stated", { standard: 1, requirement: "R7" }],
]);

test("story 1 adds four attestable manual-review recommendations, and no requirement", () => {
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

test("nothing outside the unreleased 2.0.0 additions and these four claims a new requirement or prohibition", () => {
  const added = [...catalog.rules.values()].filter((r) => r.introducedIn === "1.2.0" && r.kind !== "recommendation");
  assert.deepEqual(added, []);
});
