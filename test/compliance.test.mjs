/**
 * The verdict engine.
 *
 * Most of these tests are attempts to reach `passed` by a route that should not lead there. That is
 * deliberate: a false red has a complainant and gets fixed, while a false green has none, so the
 * suite is weighted toward the failures nobody would report.
 *
 * The engine is driven with a synthetic catalog rather than the real one, so that adding a rule to
 * rules/ cannot silently change what these tests assert.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, envelope, STATUS, SCHEMA_VERSION } from "../scripts/compliance.mjs";
import { loadCatalog, coverage } from "../scripts/catalog.mjs";

const TODAY = "2026-08-09";

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
    evidenceExpected: "the evidence this rule wants",
    $assuranceNote: "n",
    deprecatedIn: null,
    supersededBy: null,
    removedIn: null,
    ...over,
  };
}

function fakeCatalog(rules, invariants = []) {
  return {
    rules: new Map(rules.map((r) => [r.id, r])),
    invariants: new Map(invariants.map((r) => [r.id, r])),
    byCategory: new Map(),
    byKind: new Map(),
  };
}

const INV = rule({
  id: "invariant.standards-integrity",
  kind: "invariant",
  level: "required",
  standard: null,
  verification: "structural",
  nonExemptible: true,
  attestable: false,
});

const run = (opts) =>
  evaluate({ findings: [], evaluated: [], invariantFindings: [], today: TODAY, digests: new Map(), ...opts });

const only = (verdict, id) => verdict.results.find((r) => r.ruleId === id);

// ---- The safe default, from every direction. ----

test("with no policy, nothing is judged", () => {
  const v = run({ catalog: fakeCatalog([rule()]), policy: null });
  assert.equal(v.status, STATUS.NOT_EVALUATED);
});

test("a rule nothing examined is skipped, never passed", () => {
  const v = run({ catalog: fakeCatalog([rule()]), policy: { rules: {} }, evaluated: [] });
  const r = only(v, "leakage.example");
  assert.equal(r.status, "skipped");
  assert.equal(r.disposition, "not-evaluated");
  assert.notEqual(r.status, "passed");
});

test("a manual-review rule is not established by an automated run that found nothing", () => {
  const v = run({
    catalog: fakeCatalog([rule({ verification: "manual-review", assurance: "none", attestable: true })]),
    policy: { rules: {} },
    evaluated: ["leakage.example"],
  });
  assert.equal(only(v, "leakage.example").disposition, "not-evaluated");
});

test("an examined rule with no adverse finding passes", () => {
  const v = run({ catalog: fakeCatalog([rule()]), policy: { rules: {} }, evaluated: ["leakage.example"] });
  const r = only(v, "leakage.example");
  assert.equal(r.status, "passed");
  assert.equal(r.disposition, "evaluated");
});

// ---- The two kinds of "nothing is known", which route the reader differently. ----

test("a missing-evidence finding reports insufficient-evidence, not failure", () => {
  const v = run({
    catalog: fakeCatalog([rule()]),
    policy: { rules: {} },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "no manifest found", evidenceGap: true, evidence: ["data/"] }],
  });
  const r = only(v, "leakage.example");
  assert.equal(r.disposition, "insufficient-evidence");
  assert.equal(r.status, "skipped", "an absent artifact is not a violation");
  assert.equal(r.evidenceExpected, "the evidence this rule wants");
});

test("insufficient-evidence and not-evaluated are distinguished, and both produce a request", () => {
  const v = run({
    catalog: fakeCatalog([
      rule({ id: "leakage.gap" }),
      rule({ id: "leakage.nomech", verification: "manual-review", assurance: "none", attestable: true }),
    ]),
    policy: { rules: {} },
    evaluated: ["leakage.gap"],
    findings: [{ rule: "leakage.gap", message: "absent", evidenceGap: true }],
  });
  assert.equal(only(v, "leakage.gap").disposition, "insufficient-evidence");
  assert.equal(only(v, "leakage.nomech").disposition, "not-evaluated");

  const byRule = new Map(v.evidenceRequests.map((r) => [r.rule, r]));
  assert.equal(byRule.get("leakage.gap").disposition, "insufficient-evidence");
  assert.equal(byRule.get("leakage.nomech").disposition, "not-evaluated");
  // The point of the split: an agent can act on the first alone.
  assert.match(byRule.get("leakage.nomech").how, /attestation/i);
});

test("a real violation fails rather than reporting a gap", () => {
  const v = run({
    catalog: fakeCatalog([rule()]),
    policy: { rules: {} },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "scaler fitted before the split", evidence: ["train.py:12"] }],
  });
  const r = only(v, "leakage.example");
  assert.equal(r.status, "failed");
  assert.equal(v.status, STATUS.NON_COMPLIANT);
  assert.deepEqual(r.evidence, ["train.py:12"]);
});

test("a recommendation warns and does not make the project non-compliant", () => {
  const v = run({
    catalog: fakeCatalog([rule({ kind: "recommendation", level: "recommended", severity: "warning" })]),
    policy: { rules: {} },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "no seed found" }],
  });
  assert.equal(only(v, "leakage.example").status, "warning");
  assert.equal(v.status, STATUS.COMPLIANT);
});

// ---- Applicability, which is not an exception. ----

test("not-applicable is skipped and leaves the applicable denominator", () => {
  const v = run({
    catalog: fakeCatalog([rule()]),
    policy: { applicability: { "leakage.example": { status: "not-applicable", reason: "no ML code here at all" } } },
  });
  const r = only(v, "leakage.example");
  assert.equal(r.disposition, "not-applicable");
  assert.equal(v.denominator.applicable, 0);
  // Was COMPLIANT until 1.4.2. A project that declares its only rule not-applicable has established
  // nothing, and a verdict of COMPLIANT made "declare everything away" the cheapest route to a green
  // — the same false green as the all-skipped case, reached by declaration instead of by silence.
  // Whether this pack applies to the project at all is a question above this engine; what this
  // engine can say honestly is that it evaluated nothing.
  assert.equal(v.status, STATUS.NOT_EVALUATED);
  assert.equal(v.score, null, "nothing scored means no score, not a perfect one");
});

// ---- Exceptions. ----

test("an active exception waives a failure and is visible in the status", () => {
  const v = run({
    catalog: fakeCatalog([rule()]),
    policy: { exceptions: [{ rule: "leakage.example", reason: "r", approvedBy: "owner", approvedAt: "2026-01-01" }] },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "violation" }],
  });
  assert.equal(only(v, "leakage.example").disposition, "excepted");
  assert.equal(v.status, STATUS.COMPLIANT_WITH_EXCEPTIONS);
});

test("an expired exception stops waiving", () => {
  const v = run({
    catalog: fakeCatalog([rule()]),
    policy: {
      exceptions: [{ rule: "leakage.example", reason: "r", approvedBy: "o", approvedAt: "2025-01-01", expires: "2026-01-01" }],
    },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "violation" }],
  });
  assert.ok(v.results.some((r) => r.disposition === "expired-exception"));
  assert.equal(v.status, STATUS.NON_COMPLIANT);
});

test("an exception against a non-exemptible rule is rejected, not honoured", () => {
  const v = run({
    catalog: fakeCatalog([rule({ nonExemptible: true, $exemptibilityNote: "no" })]),
    policy: { exceptions: [{ rule: "leakage.example", reason: "r", approvedBy: "o", approvedAt: "2026-01-01" }] },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "violation" }],
  });
  assert.ok(v.results.some((r) => r.disposition === "rejected-exception"));
  assert.equal(v.status, STATUS.NON_COMPLIANT);
});

test("non-exemptibility is checked before expiry", () => {
  // Reporting a lapsed non-exemptible waiver as merely expired would imply that renewing it works.
  const v = run({
    catalog: fakeCatalog([rule({ nonExemptible: true, $exemptibilityNote: "no" })]),
    policy: {
      exceptions: [{ rule: "leakage.example", reason: "r", approvedBy: "o", approvedAt: "2025-01-01", expires: "2026-01-01" }],
    },
  });
  assert.ok(v.results.some((r) => r.disposition === "rejected-exception"));
  assert.ok(!v.results.some((r) => r.disposition === "expired-exception"));
});

// ---- Attestations: recorded human evidence, never a veto over a mechanism. ----

const attestable = () => rule({ verification: "manual-review", assurance: "none", attestable: true });
const approved = (over = {}) => ({
  status: "approved",
  reviewedBy: "reviewer",
  reviewedAt: "2026-08-01",
  evidence: "I read the pipeline and traced every feature.",
  ...over,
});

test("a valid attestation establishes the rule and counts as manual review", () => {
  const v = run({
    catalog: fakeCatalog([attestable()]),
    policy: { attestations: { "leakage.example": approved() } },
  });
  const r = only(v, "leakage.example");
  assert.equal(r.status, "passed");
  assert.equal(r.disposition, "attested");
  assert.equal(v.assurance.manualReview, 1);
  assert.equal(v.assurance.automated, 0, "human judgement is never counted as automated");
});

test("an attestation never overrides what a check observed", () => {
  const v = run({
    catalog: fakeCatalog([attestable()]),
    policy: { attestations: { "leakage.example": approved() } },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "the check found a violation" }],
  });
  const r = only(v, "leakage.example");
  assert.equal(r.disposition, "contradicted-attestation");
  assert.equal(r.status, "failed");
});

test("an attestation cannot bypass a non-exemptible rule", () => {
  // Not a separate prohibition: the automated failure simply survives the attestation.
  const v = run({
    catalog: fakeCatalog([rule({ verification: "manual-review", assurance: "none", attestable: true, nonExemptible: true, $exemptibilityNote: "no" })]),
    policy: { attestations: { "leakage.example": approved() } },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "observed" }],
  });
  assert.equal(only(v, "leakage.example").status, "failed");
});

test("an attestation on a rule the catalog does not mark attestable is invalid", () => {
  const v = run({
    catalog: fakeCatalog([rule({ attestable: false })]),
    policy: { attestations: { "leakage.example": approved() } },
  });
  assert.equal(only(v, "leakage.example").disposition, "invalid-attestation");
});

test("a recorded rejection is a failure, not silence", () => {
  const v = run({
    catalog: fakeCatalog([attestable()]),
    policy: { attestations: { "leakage.example": approved({ status: "rejected" }) } },
  });
  const r = only(v, "leakage.example");
  assert.equal(r.disposition, "attested-rejected");
  assert.equal(r.status, "failed");
});

test("an expired attestation returns the rule to unreviewed, not to failed", () => {
  const v = run({
    catalog: fakeCatalog([attestable()]),
    policy: { attestations: { "leakage.example": approved({ expires: "2026-01-01" }) } },
  });
  const r = only(v, "leakage.example");
  assert.equal(r.disposition, "not-evaluated");
  assert.notEqual(r.status, "passed");
});

test("an attestation goes stale when the material it reviewed changes", () => {
  const policy = {
    attestations: {
      "leakage.example": approved({ reviewedAgainst: { paths: ["train.py"], digest: "aaaaaaaaaaaaaaaa" } }),
    },
  };
  const fresh = run({
    catalog: fakeCatalog([attestable()]),
    policy,
    digests: new Map([["leakage.example", "aaaaaaaaaaaaaaaa"]]),
  });
  assert.equal(only(fresh, "leakage.example").disposition, "attested");

  const stale = run({
    catalog: fakeCatalog([attestable()]),
    policy,
    digests: new Map([["leakage.example", "bbbbbbbbbbbbbbbb"]]),
  });
  assert.equal(only(stale, "leakage.example").disposition, "not-evaluated");
});

// ---- Invariants, and their precedence. ----

test("naming an invariant anywhere in a policy is itself a violation", () => {
  for (const policy of [
    { rules: { "invariant.standards-integrity": { level: "optional" } } },
    { applicability: { "invariant.standards-integrity": { status: "not-applicable", reason: "inconvenient" } } },
    { attestations: { "invariant.standards-integrity": approved() } },
    { exceptions: [{ rule: "invariant.standards-integrity", reason: "r", approvedBy: "o", approvedAt: "2026-01-01" }] },
  ]) {
    const v = run({ catalog: fakeCatalog([rule()], [INV]), policy });
    assert.equal(v.status, STATUS.BLOCKED_BY_INVARIANT, `policy ${JSON.stringify(Object.keys(policy))} is blocked`);
  }
});

test("a policy that lowers a rule below its catalog level is blocked", () => {
  const v = run({
    catalog: fakeCatalog([rule()], [INV]),
    policy: { rules: { "leakage.example": { level: "optional" } } },
  });
  assert.equal(v.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.ok(v.results.some((r) => r.disposition === "invariant-violation"));
});

test("a policy that raises a rule is allowed", () => {
  const v = run({
    catalog: fakeCatalog([rule({ kind: "recommendation", level: "recommended", severity: "warning" })], [INV]),
    policy: { rules: { "leakage.example": { level: "required" } } },
  });
  assert.notEqual(v.status, STATUS.BLOCKED_BY_INVARIANT);
});

test("blocked outranks non-compliant", () => {
  const v = run({
    catalog: fakeCatalog([rule()], [INV]),
    policy: { rules: { "leakage.example": { level: "optional" } } },
    evaluated: ["leakage.example"],
    findings: [{ rule: "leakage.example", message: "also a real violation" }],
  });
  // Both are true; only one may be reported, because a verdict computed against an altered ruler
  // is not a verdict.
  assert.equal(v.status, STATUS.BLOCKED_BY_INVARIANT);
});

test("an integrity finding from outside the engine blocks too", () => {
  const v = run({
    catalog: fakeCatalog([rule()], [INV]),
    policy: { rules: {} },
    invariantFindings: [{ rule: "invariant.standards-integrity", message: "the catalog no longer matches its baseline" }],
  });
  assert.equal(v.status, STATUS.BLOCKED_BY_INVARIANT);
});

// ---- Accounting. ----

test("the assurance buckets account for every applicable rule", () => {
  const v = run({
    catalog: fakeCatalog([
      rule({ id: "a.one" }),
      rule({ id: "a.two", verification: "manual-review", assurance: "none", attestable: true }),
      rule({ id: "a.three" }),
      rule({ id: "a.four" }),
    ]),
    policy: {
      applicability: { "a.four": { status: "not-applicable", reason: "genuinely absent from this project" } },
      attestations: { "a.two": approved() },
    },
    evaluated: ["a.one", "a.three"],
    findings: [{ rule: "a.three", message: "absent", evidenceGap: true }],
  });
  const { automated, manualReview, insufficientEvidence, notEvaluated } = v.assurance;
  assert.equal(automated + manualReview + insufficientEvidence + notEvaluated, v.denominator.applicable);
  assert.equal(v.denominator.total, 4);
  assert.equal(v.denominator.applicable, 3);
});

test("the score's denominator is the evaluated obligations, and it is stated in words", () => {
  const v = run({
    catalog: fakeCatalog([rule({ id: "a.one" }), rule({ id: "a.two" })]),
    policy: { rules: {} },
    evaluated: ["a.one", "a.two"],
    findings: [{ rule: "a.two", message: "violation" }],
  });
  assert.equal(v.denominator.scored, 2);
  assert.equal(v.score, 50);
  assert.match(v.denominator.basis, /evaluated/);
});

test("coverage sits outside the verdict and cannot move the score", () => {
  const catalog = fakeCatalog([rule()]);
  const verdict = run({ catalog, policy: { rules: {} }, evaluated: ["leakage.example"] });
  const withCoverage = envelope({
    verdict, project: "p", standardVersion: "1.0.0", evaluatedAt: "t",
    frameworkCoverage: { rules: 45, evaluatedRules: 10 },
  });
  const without = envelope({ verdict, project: "p", standardVersion: "1.0.0", evaluatedAt: "t" });
  assert.equal(withCoverage.score, without.score);
  assert.equal(withCoverage.status, without.status);
  assert.ok("frameworkCoverage" in withCoverage, "coverage is reported, beside the verdict");
});

test("every envelope carries schemaVersion 1.0.0", () => {
  const v = run({ catalog: fakeCatalog([rule()]), policy: { rules: {} } });
  assert.equal(envelope({ verdict: v, evaluatedAt: "t" }).schemaVersion, "1.0.0");
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

test("every result carries the evidence or the judgement that produced it", async () => {
  // Upward provenance: verdict → rule → finding or attestation. A bare pass or fail is a bug.
  const real = await loadCatalog();
  const v = run({
    catalog: real,
    policy: { rules: {} },
    evaluated: ["data.version-pinned"],
    findings: [{ rule: "data.version-pinned", message: "no manifest", evidence: ["data/train.csv"] }],
  });
  for (const r of v.results) {
    assert.ok(r.ruleId && r.disposition && r.message, `${r.ruleId} carries id, disposition, and message`);
    if (r.status === "failed" || r.status === "warning") {
      assert.ok(r.evidence.length > 0 || r.attestation, `${r.ruleId} names what produced the verdict`);
    }
  }
  const c = coverage(real, { evaluated: ["data.version-pinned"], totalStandards: 25 });
  assert.equal(c.evaluatedRules, 1);
});
