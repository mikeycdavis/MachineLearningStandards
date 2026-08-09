/**
 * Policy validation: the schema, and the semantic checks a schema cannot express.
 *
 * Every fixture in test/fixtures/policies/ is here for a reason, and most of them are attempts to
 * get a rule to stop applying without satisfying it. `valid.yml` is the control: without it, a
 * suite that only checks rejection would pass while the validator rejected everything.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml, YamlError } from "../scripts/yaml.mjs";
import { validate } from "../scripts/jsonschema.mjs";
import { loadCatalog } from "../scripts/catalog.mjs";
import { checkPolicy } from "../scripts/policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = "2026-08-09";

const catalog = await loadCatalog();
const schema = JSON.parse(await readFile(path.join(ROOT, "schemas/project-policy.schema.json"), "utf8"));

const load = async (name) =>
  parseYaml(await readFile(path.join(ROOT, "test/fixtures/policies", name), "utf8"));

const schemaErrors = (policy) => validate(policy, schema);
const semantics = (policy) => checkPolicy(policy, catalog, TODAY);
const ids = (list) => new Set(list.map((f) => f.id));

// ---- The control. ----

test("a valid policy passes both the schema and the semantic checks", async () => {
  const policy = await load("valid.yml");
  assert.deepEqual(schemaErrors(policy), []);
  const { findings, invariantViolations } = semantics(policy);
  assert.deepEqual(findings, []);
  assert.deepEqual(invariantViolations, []);
});

test("the repository's own policy is valid", async () => {
  const policy = parseYaml(await readFile(path.join(ROOT, "project-policy.yml"), "utf8"));
  assert.deepEqual(schemaErrors(policy), []);
  const { findings, invariantViolations } = semantics(policy);
  assert.deepEqual(invariantViolations, [], "the repository does not weaken its own standards");
  assert.deepEqual(findings, []);
});

test("the repository declares applicability rather than letting rules fall silent", async () => {
  const policy = parseYaml(await readFile(path.join(ROOT, "project-policy.yml"), "utf8"));
  const declared = Object.keys(policy.applicability ?? {});
  assert.equal(declared.length, catalog.rules.size,
    "every rule in the catalog is addressed, so nothing is excluded by omission");
  for (const [id, decl] of Object.entries(policy.applicability)) {
    assert.ok(decl.reason && decl.reason.length > 40, `${id} gives a substantive reason`);
    assert.ok(decl.revisitWhen, `${id} says what would make this determination wrong`);
  }
});

// ---- Schema conformance. ----

test("an unknown top-level key is rejected rather than ignored", async () => {
  const errors = schemaErrors(await load("invalid-shape.yml"));
  assert.ok(errors.length > 0, "the schema rejects it");
});

test("a non-canonical rule id is rejected by pattern, with no alias mechanism to fall back on", async () => {
  const errors = schemaErrors(await load("non-canonical-id.yml"));
  assert.ok(errors.length > 0, "data.versionPinned does not match the canonical pattern");
});

test("the schema requires standardVersion and a semver shape", () => {
  assert.ok(schemaErrors({}).length > 0, "missing standardVersion");
  assert.ok(schemaErrors({ standardVersion: "1.0" }).length > 0, "a two-component version is not semver");
  assert.deepEqual(schemaErrors({ standardVersion: "1.0.0" }), []);
});

test("the YAML parser does not coerce a version into a number", () => {
  // If it did, the semver pattern above would never get the chance to reject it.
  const parsed = parseYaml('standardVersion: 1.0\n');
  assert.equal(parsed.standardVersion, "1.0");
  assert.equal(typeof parsed.standardVersion, "string");
});

test("the YAML parser refuses constructs it does not support rather than guessing", () => {
  assert.throws(() => parseYaml("a: &anchor value\n"), YamlError, "anchors");
  assert.throws(() => parseYaml("a: |\n  block\n"), YamlError, "block scalars");
  assert.throws(() => parseYaml("a: 1\na: 2\n"), YamlError, "duplicate keys");
  assert.throws(() => parseYaml("a:\n\tb: 1\n"), YamlError, "tabs");
});

test("an exception requires an approver and a reason", () => {
  const missing = { standardVersion: "1.0.0", exceptions: [{ rule: "data.version-pinned" }] };
  assert.ok(schemaErrors(missing).length > 0, "an exception with no approver is a mute button");
});

test("an attestation requires evidence", () => {
  const bare = {
    standardVersion: "1.0.0",
    attestations: { "leakage.no-target-in-features": { status: "approved", reviewedBy: "x", reviewedAt: "2026-08-01" } },
  };
  assert.ok(schemaErrors(bare).length > 0, "an attestation without evidence is an assertion");
});

// ---- Weakening: the routes past the integrity invariant. ----

test("lowering a rule below its catalog level is an invariant violation", async () => {
  const { invariantViolations } = semantics(await load("weakened-level.yml"));
  assert.ok(ids(invariantViolations).has("policy.weakened-standard"));
});

test("addressing an invariant in any section is an invariant violation", async () => {
  for (const fixture of ["invariant-addressed.yml", "invariant-excepted.yml"]) {
    const { invariantViolations } = semantics(await load(fixture));
    assert.ok(ids(invariantViolations).has("policy.invariant-addressed"), `${fixture} is blocked`);
  }
});

test("dismissing a prohibition without a substantive reason is an invariant violation", async () => {
  const { invariantViolations } = semantics(await load("unreasoned-prohibition-dismissal.yml"));
  assert.ok(ids(invariantViolations).has("policy.unreasoned-prohibition-dismissal"));
});

test("a substantive not-applicable declaration on a prohibition is accepted", async () => {
  // The guard must distinguish a placeholder from a real determination, or it would force every
  // honest project to carry a rule that has no subject.
  const policy = {
    standardVersion: "1.0.0",
    applicability: {
      "leakage.no-target-in-features": {
        status: "not-applicable",
        reason: "This repository trains no models, so there is no feature set for a target to enter.",
      },
    },
  };
  const { invariantViolations } = semantics(policy);
  assert.deepEqual(invariantViolations, []);
});

// ---- Exceptions and attestations. ----

test("an exception against a non-exemptible rule is reported", async () => {
  const { findings } = semantics(await load("non-exemptible-exception.yml"));
  assert.ok(ids(findings).has("policy.non-exemptible-rule"));
});

test("an expired exception is reported", async () => {
  const { findings } = semantics(await load("expired-exception.yml"));
  assert.ok(ids(findings).has("policy.expired-exception"));
});

test("a rule cannot be both not-applicable and excepted", async () => {
  const { findings } = semantics(await load("conflicting-classification.yml"));
  assert.ok(ids(findings).has("policy.conflicting-classification"));
});

test("an attestation on a rule with an available mechanism is reported", async () => {
  const { findings } = semantics(await load("non-attestable-rule.yml"));
  assert.ok(ids(findings).has("policy.non-attestable-rule"),
    "a model card either exists in the repository or does not; asserting it is not evidence");
});

test("an attestation on an attestable rule is accepted", async () => {
  const { findings, invariantViolations } = semantics(await load("attested-valid.yml"));
  assert.deepEqual(invariantViolations, []);
  assert.deepEqual(findings, []);
});

test("an expired attestation is reported as unreviewed", async () => {
  const { findings } = semantics(await load("attested-expired.yml"));
  assert.ok(ids(findings).has("policy.expired-attestation"));
});

test("a rule id nobody defines is reported rather than silently doing nothing", async () => {
  const { findings } = semantics(await load("unknown-rule.yml"));
  assert.ok(ids(findings).has("policy.unknown-rule"));
});

// ---- Mutation: reintroduce the defect and confirm the guard fires. ----

test("mutation — removing the weakening check would let weakened-level.yml pass", async () => {
  // The guard depends on comparing against the catalog's level. Simulate the catalog forgetting it.
  const policy = await load("weakened-level.yml");
  const blinded = { ...catalog, rules: new Map([...catalog.rules].map(([k, v]) => [k, { ...v, level: "optional" }])) };
  const { invariantViolations } = checkPolicy(policy, blinded, TODAY);
  assert.deepEqual(invariantViolations, [],
    "with the catalog level lost, nothing detects the weakening — which is why the level is locked in the baseline");
  const real = semantics(policy);
  assert.ok(real.invariantViolations.length > 0, "and with the real catalog, it is caught");
});
