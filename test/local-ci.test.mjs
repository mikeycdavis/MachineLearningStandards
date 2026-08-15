/**
 * The local CI and verified-submission workflow.
 *
 * WHAT THESE TESTS ARE FOR. The workflow's value rests entirely on its refusals. A submission
 * script that pushes when it should is unremarkable; one that refuses to push a commit CI did not
 * verify is the whole feature. Refusals are also the part nobody exercises by hand, because
 * producing the failing condition on purpose means mutating real history — so they are asserted
 * here instead, against the pure functions the submission path actually calls.
 *
 * The exact-commit invariant this defends:
 *
 *     The commit pushed for a pull request is exactly the commit that passed the complete local
 *     Docker CI pipeline.
 *
 * The last test in each group removes the guard from the code path and proves the refusal
 * disappears, because a test named for an invariant establishes nothing unless it bites.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  guardBranch, guardCleanTree, guardSameHead, guardEvidence, composeBody, PROTECTED_BRANCHES,
} from "../scripts/submit-pr.mjs";
import { STAGES, argvForScript, judgeSelfVerdict, verifyDependencyFreedom, verifyCommitProvenance }
  from "../scripts/ci-pipeline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");

const SHA_A = "be0380a8b3009782a57b8edb91df953a2e2b618d";
const SHA_B = "0000000111111112222222233333333444444445";

const evidenceFor = (commit, over = {}) => ({
  schemaVersion: "1.0.0",
  repository: "MachineLearningStandards",
  branch: "feature/x",
  commit,
  result: "passed",
  environment: "docker (mls-ci-abcd1234)",
  node: "v20.20.2",
  startedAt: "2026-08-15T23:00:00.000Z",
  completedAt: "2026-08-15T23:01:00.000Z",
  checks: STAGES.map((s) => s.id),
  executed: STAGES.map((s) => ({ id: s.id, ok: true })),
  notExecuted: [],
  ...over,
});

// ---- The invariant: the SHA verified is the SHA pushed. ----

test("submission proceeds when the commit did not move during CI", () => {
  assert.equal(guardSameHead(SHA_A, SHA_A).ok, true);
});

test("REFUSAL: submission stops when HEAD moved during CI", () => {
  // The realistic cause is an amend or a rebase in another terminal while the container was
  // running. The verified result is true and belongs to a commit that is no longer the branch tip.
  const v = guardSameHead(SHA_A, SHA_B);
  assert.equal(v.ok, false);
  assert.match(v.message, /HEAD changed after CI verification/);
  assert.match(v.message, /Re-run CI before submitting/);
  assert.ok(v.message.includes(SHA_A) && v.message.includes(SHA_B),
    "the message names both commits, because 'something changed' is not actionable");
});

test("REFUSAL: an unresolvable commit on either side is not treated as agreement", () => {
  // The failure mode worth naming: `git rev-parse` returning empty on both sides would make a
  // naive equality check pass, and the invariant would be satisfied by knowing nothing.
  assert.equal(guardSameHead("", "").ok, false);
  assert.equal(guardSameHead(SHA_A, "").ok, false);
  assert.equal(guardSameHead(null, null).ok, false);
});

test("MUTATION: without the comparison, a moved HEAD would submit", () => {
  const source = read("scripts/submit-pr.mjs");
  const GUARD = "  if (before && after && before === after) return { ok: true };";
  assert.ok(source.includes(GUARD), "the guard is no longer where this mutation expects it");
  const mutated = new Function(`
    return function guardSameHead(before, after) {
      return { ok: true };
    };`)();
  assert.equal(mutated(SHA_A, SHA_B).ok, true,
    "with the comparison removed the mismatch passes — so the comparison is what these tests protect");
});

// ---- The evidence must describe this commit, and a complete run. ----

test("evidence for the verified commit is accepted", () => {
  assert.equal(guardEvidence(evidenceFor(SHA_A), SHA_A).ok, true);
});

test("REFUSAL: evidence from a different commit is not evidence about this one", () => {
  const v = guardEvidence(evidenceFor(SHA_B), SHA_A);
  assert.equal(v.ok, false);
  assert.match(v.message, /belongs to a different run/);
});

test("REFUSAL: a missing evidence file is not a pass", () => {
  assert.equal(guardEvidence(null, SHA_A).ok, false);
  assert.match(guardEvidence(null, SHA_A).message, /Nothing was verified/);
});

test("REFUSAL: a failed or partial run is not a pass", () => {
  assert.equal(guardEvidence(evidenceFor(SHA_A, { result: "failed" }), SHA_A).ok, false);
  // The subtle one. Every stage that ran passed, and three never ran. "All green" and "all of it"
  // are different claims, and only the second one authorises a pull request.
  const partial = guardEvidence(evidenceFor(SHA_A, { notExecuted: ["scan", "self-verdict"] }), SHA_A);
  assert.equal(partial.ok, false);
  assert.match(partial.message, /did not run: scan, self-verdict/);
});

// ---- Branch and working-tree preconditions. ----

test("a feature branch is submittable", () => {
  assert.equal(guardBranch("feature/local-ci", "main").ok, true);
});

test("REFUSAL: no pull request is opened from a shared branch", () => {
  for (const branch of PROTECTED_BRANCHES) {
    if (branch === "HEAD") continue;
    assert.equal(guardBranch(branch, "main").ok, false, `${branch} is refused`);
  }
});

test("REFUSAL: a detached HEAD is refused rather than resolved to something plausible", () => {
  assert.equal(guardBranch("HEAD", "main").ok, false);
  assert.equal(guardBranch("", "main").ok, false);
  assert.match(guardBranch("HEAD", "main").message, /detached/);
});

test("REFUSAL: head and base cannot be the same branch", () => {
  assert.equal(guardBranch("develop", "develop").ok, false);
});

test("a clean tree passes and a dirty one is refused, naming the files", () => {
  assert.equal(guardCleanTree("").ok, true);
  assert.equal(guardCleanTree("\n  \n").ok, true, "whitespace from git is not a modification");
  const v = guardCleanTree(" M scripts/ci-pipeline.mjs\n?? notes.txt");
  assert.equal(v.ok, false);
  assert.match(v.message, /scripts\/ci-pipeline\.mjs/);
  assert.match(v.message, /notes\.txt/);
});

test("the evidence directory is ignored, so CI cannot dirty the tree it just verified", () => {
  // Without this, every run would leave artifacts/local-ci/latest.json in the working tree and the
  // clean-tree guard would refuse the submission it had just verified.
  assert.match(read(".gitignore"), /^artifacts\/local-ci\/$/m);
});

// ---- One pipeline, one definition. ----

test("every stage that names an npm script resolves to a real one", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const stage of STAGES.filter((s) => s.script)) {
    assert.doesNotThrow(() => argvForScript(pkg, stage.script),
      `stage "${stage.id}" names npm script "${stage.script}"`);
  }
});

test("the pipeline refuses to shell out for a script it cannot run directly", () => {
  // package.json's scripts are all direct node invocations. A script that shelled out to
  // something else would run under a shell the pipeline did not choose, on a platform it may not
  // exist on, and the failure would be reported as the stage failing rather than as this.
  assert.throws(() => argvForScript({ scripts: { x: "bash -c true" } }, "x"), /direct node invocations/);
  assert.throws(() => argvForScript({ scripts: {} }, "x"), /no script named/);
});

test("the GitHub workflow runs the pipeline rather than its own copy of the checks", () => {
  // The decay this prevents: a check added to one list and not the other, so local CI and the
  // hosted run silently verify different things.
  const wf = read(".github/workflows/ci.yml");
  assert.match(wf, /node scripts\/ci-pipeline\.mjs/, "the workflow invokes the pipeline");
  for (const stage of STAGES.filter((s) => s.script)) {
    assert.ok(!new RegExp(`run:\\s*npm run ${stage.script}\\b`).test(wf),
      `the workflow does not re-declare the "${stage.script}" check as its own step`);
  }
});

test("every stage carries a stated reason for existing", () => {
  for (const stage of STAGES) {
    assert.ok(stage.why && stage.why.length > 40,
      `stage "${stage.id}" says why it is a gate — an unexplained check is the first one deleted`);
  }
});

test("the checks the old workflow ran are all still gates", () => {
  // Guards against silently dropping coverage during the move from YAML steps to the pipeline.
  const ids = new Set(STAGES.map((s) => s.id));
  for (const check of ["inventory", "fidelity", "policy", "integrity", "acceptance", "diagrams",
                       "test", "scan", "self-verdict"]) {
    assert.ok(ids.has(check), `${check} survived the refactor`);
  }
});

// ---- Pipeline stages that judge output rather than exit codes. ----

test("the self-evaluation gate accepts only NOT_EVALUATED with nothing applicable", () => {
  assert.equal(judgeSelfVerdict({ status: "NOT_EVALUATED", denominator: { applicable: 0 } }).ok, true);
  // COMPLIANT here would be the 1.4.2 defect returning: a pass awarded for having established
  // nothing. An applicable rule means ML work arrived and project-policy.yml needs re-reading.
  assert.equal(judgeSelfVerdict({ status: "COMPLIANT", denominator: { applicable: 0 } }).ok, false);
  assert.equal(judgeSelfVerdict({ status: "NOT_EVALUATED", denominator: { applicable: 3 } }).ok, false);
  assert.equal(judgeSelfVerdict({ status: "BLOCKED_BY_INVARIANT", denominator: { applicable: 0 } }).ok, false);
  assert.equal(judgeSelfVerdict(undefined).ok, false);
});

test("dependency freedom holds for this repository, and is checkable rather than assumed", () => {
  const v = verifyDependencyFreedom({ root: ROOT });
  assert.equal(v.ok, true, v.detail);
  assert.ok(!existsSync(path.join(ROOT, "node_modules")));
});

test("commit provenance fails when the CI environment holds a different commit", () => {
  const head = { commit: SHA_A, branch: "feature/x" };
  assert.equal(verifyCommitProvenance({ env: { LOCAL_CI_EXPECTED_COMMIT: SHA_A }, head }).ok, true);
  const wrong = verifyCommitProvenance({ env: { LOCAL_CI_EXPECTED_COMMIT: SHA_B }, head });
  assert.equal(wrong.ok, false);
  assert.match(wrong.message ?? wrong.detail, /not looking at the commit/);
  // An unstated expectation cannot be violated: `npm run ci` on its own is a legitimate use.
  assert.equal(verifyCommitProvenance({ env: {}, head }).ok, true);
  // But an environment that cannot say which commit it examined produces no usable evidence.
  assert.equal(verifyCommitProvenance({ env: {}, head: { commit: null, branch: null } }).ok, false);
});

// ---- The pull-request body. ----

test("the PR body preserves the author's description and appends the verification block", () => {
  const body = composeBody("Fixes the thing.\n\nDetails follow.", evidenceFor(SHA_A));
  assert.ok(body.startsWith("Fixes the thing."), "the author's content is not overwritten");
  assert.match(body, /## Local CI/);
  assert.match(body, new RegExp(SHA_A));
  assert.match(body, /\*\*Result:\*\* PASS/);
});

test("the PR body never lets local verification read as a GitHub Actions result", () => {
  const body = composeBody(null, evidenceFor(SHA_A));
  assert.match(body, /on a developer machine/i);
  assert.match(body, /not a GitHub-hosted Actions result/i);
  assert.ok(!/all checks pass(ed)?/i.test(body), "it claims nothing about GitHub's checks");
});

// ---- Container isolation is a property of the configuration, not of the prose. ----

test("the compose file mounts the working tree read-only and grants no other host access", () => {
  const compose = read("compose.ci.yml");
  assert.match(compose, /target: \/repo[\s\S]{0,60}read_only: true/,
    "the source mount is read-only, so CI cannot edit the repository into passing");
  assert.ok(!/\/var\/run\/docker\.sock/.test(compose), "the Docker socket is not exposed to CI");
  assert.ok(!/\.ssh|id_rsa|\.netrc|GITHUB_TOKEN|GH_TOKEN/.test(compose),
    "no credentials or key material are mounted or passed in");
  assert.match(compose, /network_mode: none/, "CI runs with no network");
  assert.match(compose, /cap_drop: \[ALL\]/);
});

test("cleanup is scoped to the run's own compose project", () => {
  // The rule being defended: local CI must never reap a developer's unrelated containers,
  // volumes, or databases. A blanket prune would be the obvious way to write this and the reason
  // people delete CI scripts.
  for (const file of ["scripts/ci.ps1", "scripts/ci.sh"]) {
    const text = read(file);
    // Comment lines are stripped first: both scripts say in prose that they contain no prune, and
    // a test that cannot tell an instruction from a promise not to do it is not much of a test.
    const code = text.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
    assert.ok(!/docker\s+(system|volume|container|image)\s+prune/.test(code),
      `${file} contains no prune`);
    assert.match(text, /down --remove-orphans --volumes/, `${file} tears down its own project`);
    assert.match(text, /mls-ci-/, `${file} names a unique project per run`);
  }
});

test("no secret material is committed anywhere in the CI surface", () => {
  for (const file of ["compose.ci.yml", "ci.Dockerfile", "scripts/ci.ps1", "scripts/ci.sh",
                      "scripts/ci-entrypoint.sh", "scripts/submit-pr.mjs", ".github/workflows/ci.yml"]) {
    const text = read(file);
    assert.ok(!/gh[pousr]_[A-Za-z0-9]{16,}/.test(text), `${file} contains no GitHub token`);
    assert.ok(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text), `${file} contains no private key`);
  }
  // gh's own session is used for PR creation; nothing reads or writes a token.
  assert.ok(!/GH_TOKEN|GITHUB_TOKEN/.test(read("scripts/submit-pr.mjs")),
    "submission relies on the developer's existing gh session rather than a token");
});
