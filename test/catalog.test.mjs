/**
 * Catalog loading, and the shape rules that keep rule identity trustworthy.
 *
 * The organising principle here and in every suite: each guard is asserted from both sides — a
 * case that must trip it, and a case that must not. A test suite that only checks that guards fire
 * would pass while the catalog rejected every valid entry, and a suite that only loads the real
 * catalog would pass while every guard was broken.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, coverage, assertBindings, CatalogError, CANONICAL_ID } from "../scripts/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = await loadCatalog();

test("the real catalog loads", () => {
  assert.ok(catalog.rules.size > 0, "project rules loaded");
  assert.ok(catalog.invariants.size > 0, "invariants loaded");
});

test("every rule id is canonical, and category matches the id prefix and the filename", async () => {
  const files = (await readdir(path.join(ROOT, "rules"))).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const doc = JSON.parse(await readFile(path.join(ROOT, "rules", file), "utf8"));
    for (const rule of doc.rules) {
      assert.match(rule.id, CANONICAL_ID, `${rule.id} is canonical`);
      assert.equal(rule.category, rule.id.split(".")[0], `${rule.id}: category equals id prefix`);
      if (file !== "invariants.json") {
        assert.equal(rule.category, path.basename(file, ".json"), `${rule.id} lives in its category's file`);
      }
    }
  }
});

test("kind and level agree: a prohibition is forbidden, a recommendation is recommended", () => {
  const expected = { requirement: "required", prohibition: "forbidden", recommendation: "recommended", invariant: "required" };
  for (const rule of [...catalog.rules.values(), ...catalog.invariants.values()]) {
    assert.equal(rule.level, expected[rule.kind], `${rule.id} is a ${rule.kind}`);
  }
});

test("no rule claims assurance it cannot deliver", () => {
  for (const rule of [...catalog.rules.values(), ...catalog.invariants.values()]) {
    if (rule.verification === "manual-review" || rule.verification === "code-analysis") {
      assert.notEqual(rule.assurance, "full",
        `${rule.id} claims full assurance from ${rule.verification}`);
    }
    if (rule.assurance !== "full") {
      assert.equal(typeof rule.$assuranceNote, "string",
        `${rule.id} has assurance ${rule.assurance} and must say what a pass does not prove`);
    }
  }
});

test("every non-exemptible rule explains why it admits no exception", () => {
  const nonExemptible = [...catalog.rules.values()].filter((r) => r.nonExemptible);
  assert.ok(nonExemptible.length > 0, "the criterion is used at least once");
  for (const rule of nonExemptible) {
    assert.equal(typeof rule.$exemptibilityNote, "string", `${rule.id} explains its non-exemptibility`);
  }
});

test("every rule carries the lifecycle fields, present and null before retirement", () => {
  for (const rule of [...catalog.rules.values(), ...catalog.invariants.values()]) {
    for (const field of ["deprecatedIn", "supersededBy", "removedIn"]) {
      assert.ok(field in rule, `${rule.id} carries ${field}`);
    }
  }
});

test("invariants are not project-addressable by construction", () => {
  for (const rule of catalog.invariants.values()) {
    assert.equal(rule.nonExemptible, true, `${rule.id} admits no exception`);
    assert.equal(rule.attestable, false, `${rule.id} cannot be attested`);
    assert.ok(rule.standard === null || rule.standard === undefined,
      `${rule.id} belongs to no numbered standard`);
  }
});

test("the standards-integrity invariant exists and states the rule it enforces", () => {
  const inv = catalog.invariants.get("invariant.standards-integrity");
  assert.ok(inv, "invariant.standards-integrity is defined");
  for (const verb of ["bypass", "weaken", "remove", "reclassify", "reinterpret", "falsify", "manipulate"]) {
    assert.ok(inv.description.includes(verb), `the invariant names "${verb}"`);
  }
});

// ---- Downward provenance: rule → standard → spec item → prompt. ----

test("every rule resolves to a standard file and to a real heading in it", async () => {
  const files = await readdir(path.join(ROOT, "standards"));
  for (const rule of catalog.rules.values()) {
    const prefix = String(rule.standard).padStart(2, "0") + "-";
    const file = files.find((f) => f.startsWith(prefix));
    assert.ok(file, `${rule.id} names standard ${rule.standard}, which has a file`);
    const text = await readFile(path.join(ROOT, "standards", file), "utf8");
    assert.match(text, new RegExp(`^### ${rule.requirement} —`, "m"),
      `${rule.id} anchors to ${rule.requirement} in ${file}`);
  }
});

test("every standard cites a spec item the inventory lists", async () => {
  const inventory = JSON.parse(await readFile(path.join(ROOT, "artifacts/standards-source-inventory.json"), "utf8"));
  const numbers = new Set(inventory.standards.map((s) => s.number));
  const files = (await readdir(path.join(ROOT, "standards"))).filter((f) => /^\d\d-.*\.md$/.test(f));
  assert.equal(files.length, inventory.expectedCount, "a file exists for every inventory entry");
  for (const file of files) {
    const text = await readFile(path.join(ROOT, "standards", file), "utf8");
    const cited = text.match(/^Source: item (\d+) of/m);
    assert.ok(cited, `${file} cites a source item`);
    assert.ok(numbers.has(Number(cited[1])), `${file} cites item ${cited[1]}, which the inventory lists`);
    assert.equal(Number(cited[1]), Number(file.slice(0, 2)), `${file} cites its own number`);
  }
});

test("every must-never rule in the specification has a home in some standard", async () => {
  const spec = await readFile(path.join(ROOT, "artifacts/prompts/ml-standards-spec.md"), "utf8");
  // Anchor on the headings themselves, not on the first mention of their text: the specification's
  // provenance comment names both sections, and slicing from there yields an empty list that would
  // make this test pass while checking nothing.
  const start = spec.search(/^## Must-never rules$/m);
  const end = spec.search(/^## Evaluation philosophy$/m);
  assert.ok(start > 0 && end > start, "both section headings are present, in order");
  const section = spec.slice(start, end);
  const bullets = section.split("\n").filter((l) => l.startsWith("* ")).map((l) => l.slice(2).trim());
  assert.ok(bullets.length > 0, "the specification lists must-never rules");

  const files = (await readdir(path.join(ROOT, "standards"))).filter((f) => f.endsWith(".md"));
  const corpus = (await Promise.all(files.map((f) => readFile(path.join(ROOT, "standards", f), "utf8")))).join("\n");
  for (const bullet of bullets) {
    assert.ok(corpus.includes(bullet), `no standard reproduces: "${bullet}"`);
  }
});

test("every prohibition entry points at a P-heading, and every P-heading has an entry", async () => {
  const prohibitions = [...catalog.rules.values()].filter((r) => r.kind === "prohibition");
  for (const rule of prohibitions) {
    assert.match(rule.requirement, /^P\d+$/, `${rule.id} anchors to a prohibition heading`);
  }
  // The reverse direction, allowing for one entry to carry two source statements.
  const files = (await readdir(path.join(ROOT, "standards"))).filter((f) => f.endsWith(".md"));
  const anchored = new Set(prohibitions.map((r) => `${r.standard}:${r.requirement}`));
  let headings = 0;
  for (const file of files) {
    const text = await readFile(path.join(ROOT, "standards", file), "utf8");
    const n = Number(file.slice(0, 2));
    for (const m of text.matchAll(/^### (P\d+) —/gm)) {
      headings++;
      const covered = anchored.has(`${n}:${m[1]}`) ||
        prohibitions.some((r) => r.standard === n) ||
        prohibitions.some((r) => r.description.includes(`Standard ${n} P`));
      assert.ok(covered, `standard ${n} ${m[1]} has no catalog entry`);
    }
  }
  assert.ok(headings >= prohibitions.length, "there are at least as many headings as entries");
});

// ---- Loader strictness, driven by malformed entries rather than by the real catalog. ----

test("assertBindings rejects a rule id the catalog does not define", () => {
  assert.doesNotThrow(() => assertBindings(catalog, [...catalog.rules.keys()].slice(0, 3)));
  assert.throws(() => assertBindings(catalog, ["leakage.invented-by-the-evaluator"]), CatalogError);
});

test("coverage counts the framework and says nothing about a project", () => {
  const evaluated = [...catalog.rules.keys()].slice(0, 5);
  const c = coverage(catalog, { evaluated, totalStandards: 25 });
  assert.equal(c.rules, catalog.rules.size);
  assert.equal(c.evaluatedRules, 5);
  assert.equal(c.totalStandards, 25);
  assert.ok(c.standardsWithRules <= 25);
  assert.match(c.note, /never passes by default/);
});

test("a standard counts as fully represented only when every rule on it is examined with real assurance", () => {
  const none = coverage(catalog, { evaluated: [], totalStandards: 25 });
  assert.equal(none.standardsFullyRepresented, 0, "nothing examined, nothing fully represented");

  const all = coverage(catalog, { evaluated: [...catalog.rules.keys()], totalStandards: 25 });
  // Examining everything is still not enough: rules with assurance "none" cannot make a standard
  // fully represented, which is what stops coverage from being inflated by attestation-only rules.
  assert.ok(all.standardsFullyRepresented < 25,
    "examining every rule does not make every standard fully represented");
});
