/**
 * What this repository's own evaluation actually establishes.
 *
 * `project-policy.yml` says it plainly: the invariants are not in the policy, and they, plus the test
 * suite, are "what self-evaluation in this repository actually exercises". Every domain rule is
 * declared not-applicable — correctly, because there is no ML work in a standards repository.
 *
 * Until 1.4.2 that produced COMPLIANT: nothing was applicable, so nothing failed, so everything
 * passed. The pack's own dogfooding was the same false green it was later found returning to
 * StandardsEnforcer, and nothing in the suite noticed because nothing asserted it.
 *
 * This test pins the honest outcome, and pins it in a way that fires if the situation changes. If ML
 * work ever lands here, `applicable` becomes non-zero and this goes red — which is the correct moment
 * to re-read the not-applicable declarations rather than to keep passing.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const verdict = (() => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "standards.mjs"), "evaluate", ROOT, "--json"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  return { code: r.status, report: JSON.parse(r.stdout) };
})();

test("this repository establishes nothing about itself, and says so", () => {
  assert.equal(verdict.report.denominator.applicable, 0, "an applicable rule means ML work arrived here");
  assert.equal(verdict.report.denominator.scored, 0);
  assert.equal(verdict.report.status, "NOT_EVALUATED");
});

test("and it does not report a pass for having evaluated nothing", () => {
  // The assertion that would have caught the defect from inside, had it existed.
  assert.notEqual(verdict.report.status, "COMPLIANT");
  assert.notEqual(verdict.report.status, "COMPLIANT_WITH_EXCEPTIONS");
  assert.notEqual(verdict.code, 0, "exit 0 here would tell CI a standard was satisfied");
});

test("no score is offered for a verdict that rests on nothing", () => {
  assert.equal(verdict.report.score, null);
});
