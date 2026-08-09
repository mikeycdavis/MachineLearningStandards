/**
 * End-to-end verdicts through the real command.
 *
 * The engine is unit-tested in compliance.test.mjs. This suite exists because a caller — a CI job,
 * or an agent — sees only the exit code and the report, and every one of those outcomes has to be
 * reachable through the actual binary rather than only through the exported function.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");
const fixture = (name) => path.join(ROOT, "test/fixtures", name);

function evaluate(dir) {
  const r = spawnSync(process.execPath, [CLI, "evaluate", `--dir=${dir}`, "--json"], { encoding: "utf8" });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* a configuration error writes to stderr and emits no report */
  }
  return { code: r.status, json, stderr: r.stderr };
}

/** Copy a fixture so a test can add a policy to it without mutating the committed tree. */
async function withCopy(name, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-eval-"));
  try {
    await cp(fixture(name), dir, { recursive: true });
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const POLICY = 'standardVersion: "1.0.0"\nproject: "under-test"\nexceptions: []\n';

test("a project with violations is non-compliant and exits 1", () => {
  const res = evaluate(fixture("leaky-repo"));
  assert.equal(res.code, 1);
  assert.equal(res.json.status, "NON_COMPLIANT");
  const failed = res.json.results.filter((r) => r.status === "failed").map((r) => r.ruleId);
  assert.ok(failed.includes("leakage.no-preprocessing-leakage"));
  assert.ok(failed.includes("split.no-test-set-tuning"));
});

test("a project with no policy exits 2, and produces no verdict at all", () => {
  const res = evaluate(fixture("clean-repo"));
  assert.equal(res.code, 2, "a missing policy is a configuration error, not a compliance failure");
  assert.equal(res.json, null, "nothing was evaluated, so nothing is reported");
  assert.match(res.stderr, /not a compliance result/);
});

test("a clean project with a policy is compliant and exits 0", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(path.join(dir, "project-policy.yml"), POLICY);
    const res = evaluate(dir);
    assert.equal(res.code, 0, JSON.stringify(res.json?.results?.filter((r) => r.status === "failed"), null, 2));
    assert.equal(res.json.status, "COMPLIANT");
  });
});

test("a policy that weakens a rule is blocked and exits 3, not merely non-compliant", async () => {
  // The route somebody takes when a rule fails and the deadline is close. Both things are true —
  // the project is non-compliant and the standard was weakened — and only the second is reported,
  // because a score computed against an altered ruler is not a score.
  await withCopy("leaky-repo", async (dir) => {
    await writeFile(
      path.join(dir, "project-policy.yml"),
      POLICY + "rules:\n  leakage.no-preprocessing-leakage:\n    level: optional\n",
    );
    const res = evaluate(dir);
    assert.equal(res.code, 3);
    assert.equal(res.json.status, "BLOCKED_BY_INVARIANT");
    assert.ok(res.json.results.some((r) => r.disposition === "invariant-violation"));
  });
});

test("a policy that names an invariant is blocked", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(
      path.join(dir, "project-policy.yml"),
      POLICY + 'applicability:\n  invariant.no-silent-pass:\n    status: not-applicable\n    reason: "We would prefer unexamined rules to count as passing here."\n',
    );
    const res = evaluate(dir);
    assert.equal(res.code, 3);
    assert.equal(res.json.status, "BLOCKED_BY_INVARIANT");
  });
});

test("an exception makes a real failure visible rather than invisible", async () => {
  await withCopy("leaky-repo", async (dir) => {
    await writeFile(
      path.join(dir, "project-policy.yml"),
      POLICY.replace("exceptions: []", "") +
        "exceptions:\n" +
        "  - rule: leakage.no-preprocessing-leakage\n" +
        '    reason: "Being fixed in the current sprint; the model is not deployed."\n' +
        '    approvedBy: "project-owner"\n' +
        '    approvedAt: "2026-08-01"\n',
    );
    const res = evaluate(dir);
    const excepted = res.json.results.find((r) => r.ruleId === "leakage.no-preprocessing-leakage");
    assert.equal(excepted.disposition, "excepted");
    assert.ok(excepted.exception.approvedBy, "the waiver names who accepted the risk");
    // Still non-compliant, because other rules fail; the exception did not hide the finding.
    assert.ok(res.json.status === "NON_COMPLIANT" || res.json.status === "COMPLIANT_WITH_EXCEPTIONS");
  });
});

test("an exception against a non-exemptible rule is rejected through the command", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(
      path.join(dir, "project-policy.yml"),
      POLICY.replace("exceptions: []", "") +
        "exceptions:\n" +
        "  - rule: integrity.no-fabricated-datasets\n" +
        '    reason: "We would like the generated rows to stay described as collected."\n' +
        '    approvedBy: "someone"\n' +
        '    approvedAt: "2026-08-01"\n',
    );
    const res = evaluate(dir);
    assert.equal(res.code, 1);
    assert.ok(res.json.results.some((r) => r.disposition === "rejected-exception"));
  });
});

test("the report separates evidence that can be produced from judgement that cannot", () => {
  const res = evaluate(fixture("leaky-repo"));
  const gaps = res.json.evidenceRequests.filter((r) => r.disposition === "insufficient-evidence");
  const judgement = res.json.evidenceRequests.filter((r) => r.disposition === "not-evaluated");
  assert.ok(gaps.length > 0, "some evidence is producible");
  assert.ok(judgement.length > 0, "and most of this domain is not");
  for (const g of gaps) assert.ok(g.needs && g.how, "a producible request says what and how");
  for (const j of judgement) assert.match(j.how, /attestation|satisfy it/i);
});

test("the assurance buckets sum to the applicable count in a real run", () => {
  const res = evaluate(fixture("leaky-repo"));
  const a = res.json.assurance;
  assert.equal(
    a.automated + a.manualReview + a.insufficientEvidence + a.notEvaluated,
    res.json.denominator.applicable,
  );
});

test("every result in a real envelope traces to its evidence or its judgement", () => {
  // Upward provenance: verdict → rule → finding or attestation → detector or reviewer.
  const res = evaluate(fixture("leaky-repo"));
  for (const r of res.json.results) {
    assert.ok(r.ruleId, "names its rule");
    assert.ok(r.disposition, "says how it was reached");
    if (r.status === "failed" || r.status === "warning") {
      assert.ok(r.evidence.length > 0 || r.attestation, `${r.ruleId} names what produced the verdict`);
    }
    if (r.status === "passed") {
      assert.ok(r.disposition === "evaluated" || r.disposition === "attested",
        `${r.ruleId} passed via ${r.disposition}, which is not an examination or a judgement`);
    }
  }
});

test("the envelope reports coverage beside the verdict, never inside it", () => {
  const res = evaluate(fixture("leaky-repo"));
  assert.ok(res.json.frameworkCoverage, "coverage is present");
  assert.ok(res.json.frameworkCoverage.evaluatedRules < res.json.frameworkCoverage.rules,
    "and it is honest about how much of the framework is examined");
  assert.equal(res.json.schemaVersion, "1.0.0");
});
