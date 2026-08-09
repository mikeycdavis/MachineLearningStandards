/**
 * The four v1.1 remediations, each tested against the failure that was actually observed.
 *
 * Every test in this file is a mutation test in the strict sense: it reintroduces the defect the
 * fix removed and asserts the guard fires. A test that only checked today's fixtures were green
 * would pass just as happily against the broken version, which is how a guard rots without anyone
 * noticing.
 *
 * The observed failures are recorded in artifacts/adoption/. Each test names its source.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, cp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isScaffold, isSubstantive, sectionBody, documentAnswers, SCAFFOLD_MARKER } from "../scripts/scaffolding.mjs";
import { isUnownedPath, isVirtualenv, isNestedCheckout, resolveScope, gitTrackedFiles } from "../scripts/ownership.mjs";
import { evaluate, STATUS } from "../scripts/compliance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");

async function scratch(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-v11-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const run = (args, cwd) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* text mode or an error */ }
  return { code: r.status, json, out: r.stdout, err: r.stderr };
};

// ===========================================================================
// A — bootstrap artifacts cannot manufacture compliance
// Observed: artifacts/adoption/2026-08-09-first-adoption.md, Finding 1.
// ===========================================================================

test("A · the exact document that manufactured compliance is now rejected", () => {
  // Verbatim from the template that satisfied evaluation.baseline-exists in the first adoption.
  const row = "| Baseline — REPLACE with the strongest simple thing that could reasonably work | | | |";
  assert.equal(isSubstantive(row), false, "an instruction to replace a value is not a value");
});

test("A · running init no longer flips any rule to passed", async () => {
  // The headline failure: bootstrap a project, do no work, watch three required rules pass.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"), "import sklearn\nfrom sklearn.model_selection import train_test_split\nSEED=1\n");
    await writeFile(path.join(dir, "requirements.txt"), "scikit-learn==1.5.1\n");

    assert.equal(run(["init", `--dir=${dir}`]).code, 0);
    await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');

    const { json } = run(["evaluate", `--dir=${dir}`, "--json"]);
    for (const id of ["deployment.model-card", "data.provenance-documented", "evaluation.baseline-exists"]) {
      const r = json.results.find((x) => x.ruleId === id);
      assert.notEqual(r.status, "passed", `${id} was satisfied by scaffolding`);
      // Either unknown disposition is correct and they mean different things: the card and baseline
      // detectors ran and found the evidence missing; the provenance detector never ran, because
      // this fixture has no data for it to have an opinion about.
      assert.ok(["insufficient-evidence", "not-evaluated"].includes(r.disposition),
        `${id} reported ${r.disposition}, which is neither of the honest unknowns`);
    }
  });
});

test("A · mutation — treating template existence as evidence brings the failure back", async () => {
  // Reintroduce the v1.0 logic: a heading anywhere in any markdown file satisfies the rule. If the
  // fix were cosmetic, this would still fail; it passes, which is what makes the fix load-bearing.
  await scratch(async (dir) => {
    const card = await readFile(path.join(ROOT, "templates/MODEL-CARD.md"), "utf8");

    const v10Satisfied = /^##+\s*(Model card|Limitations)\s*$/im.test(card);
    assert.equal(v10Satisfied, true, "the v1.0 check accepted this template — this is the defect");

    const v11 = documentAnswers(card, /^##+\s*(Model card|Limitations|Intended use)\s*$/i);
    assert.equal(v11.satisfied, false, "the v1.1 check rejects it");
    assert.match(v11.reason, /template/);
  });
});

test("A · the guard survives deletion of the marker", async () => {
  // The obvious way round the first signal: delete the marker line and change nothing else. The
  // substance check alone does not catch this — a template's guidance prose is real prose — which
  // is why the framework also compares against what it ships.
  const templates = await Promise.all(
    ["MODEL-CARD.md", "DATASET-CARD.md"].map((f) => readFile(path.join(ROOT, "templates", f), "utf8")),
  );
  const card = templates[0].split("\n").filter((l) => !l.includes(SCAFFOLD_MARKER)).join("\n");

  assert.equal(isScaffold(card), false, "the marker is gone");
  assert.equal(documentAnswers(card, /^##+\s*Limitations\s*$/i, templates).satisfied, false,
    "and it is still recognised as the shipped template");
  assert.match(documentAnswers(card, /^##+\s*Limitations\s*$/i, templates).reason, /shipped template/);
});

test("A · a document edited into something real is not mistaken for the template", async () => {
  const templates = [await readFile(path.join(ROOT, "templates/MODEL-CARD.md"), "utf8")];
  const real = await readFile(path.join(ROOT, "test/fixtures/clean-repo/MODEL_CARD.md"), "utf8");
  assert.equal(documentAnswers(real, /^##+\s*Limitations\s*$/i, templates).satisfied, true,
    "the template-similarity signal must not fire on genuine work");
});

test("A · a genuinely completed document is still accepted", async () => {
  // The converse matters as much: a check that rejected real work would be switched off.
  const real = await readFile(path.join(ROOT, "test/fixtures/clean-repo/MODEL_CARD.md"), "utf8");
  assert.equal(documentAnswers(real, /^##+\s*Limitations\s*$/i).satisfied, true);
  assert.equal(documentAnswers(real, /^##+\s*Intended use\s*$/i).satisfied, true);
});

test("A · absence of any evaluation write-up is a gap, not a pass", async () => {
  // The second-order defect the fix exposed: with no evaluation document, the baseline detector
  // never ran, and a rule in the evaluated set with no finding reports passed.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"), "import sklearn\nSEED=1\n");
    await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
    const { json } = run(["evaluate", `--dir=${dir}`, "--json"]);
    const r = json.results.find((x) => x.ruleId === "evaluation.baseline-exists");
    assert.notEqual(r.status, "passed", "no evaluation document is not a baseline");
  });
});

// ===========================================================================
// B — scanner ownership and scope
// Observed: first adoption Finding 2, third adoption.
// ===========================================================================

test("B · a virtualenv is recognised by structure, not by name", async () => {
  // The adoption that exposed this used `test-env-3.11`, which no name list would have contained.
  await scratch(async (dir) => {
    const venv = path.join(dir, "test-env-3.11");
    await mkdir(path.join(venv, "Lib", "site-packages"), { recursive: true });
    assert.equal(isVirtualenv(venv), true, "recognised by its site-packages tree");

    const other = path.join(dir, "weirdly-named-env");
    await mkdir(other, { recursive: true });
    await writeFile(path.join(other, "pyvenv.cfg"), "home = /usr\n");
    assert.equal(isVirtualenv(other), true, "and by pyvenv.cfg");

    const real = path.join(dir, "src");
    await mkdir(real, { recursive: true });
    assert.equal(isVirtualenv(real), false, "an ordinary source directory is not an environment");
  });
});

test("B · the specific trees that produced false positives are unowned", () => {
  for (const p of [
    "test-env-3.11/Lib/site-packages/sklearn/tests/test_pipeline.py",
    ".claude/worktrees/agent-a0a8a1af/competitions/train.py",
    "node_modules/foo/index.js",
    "build/generated.py",
    "some/pkg.egg-info/PKG-INFO",
  ]) {
    assert.equal(isUnownedPath(p), true, `${p} is not the project's own work`);
  }
  for (const p of ["src/train.py", "tests/test_train.py", "notebooks/eda.ipynb", "scripts/prepare.py"]) {
    assert.equal(isUnownedPath(p), false, `${p} IS the project's own work`);
  }
});

test("B · a project's own tests stay in scope", () => {
  // The sklearn false positives were LIBRARY tests. A project's own test suite is owned code and
  // excluding it would hide real leakage in exactly the files most likely to contain a shortcut.
  assert.equal(isUnownedPath("tests/test_leakage.py"), false);
  assert.equal(isUnownedPath("src/model/tests/test_split.py"), false);
});

test("B · a nested checkout is not this project", async () => {
  await scratch(async (dir) => {
    const nested = path.join(dir, "vendored-thing");
    await mkdir(path.join(nested, ".git"), { recursive: true });
    assert.equal(isNestedCheckout(nested, dir), true);
    assert.equal(isNestedCheckout(dir, dir), false, "the target itself is not nested");
  });
});

test("B · mutation — traversing into a fixture virtualenv brings the false positives back", async () => {
  // Build the exact shape that produced twelve false leakage findings: a leaky file inside a
  // virtualenv, and clean project code outside it.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"),
      "from sklearn.pipeline import Pipeline\nfrom sklearn.model_selection import train_test_split\n" +
      "X_train, X_test = train_test_split(1, random_state=1)\n");

    const venv = path.join(dir, "test-env-3.11", "Lib", "site-packages", "sklearn", "tests");
    await mkdir(venv, { recursive: true });
    await writeFile(path.join(venv, "test_pipeline.py"),
      "from sklearn.preprocessing import StandardScaler\nfrom sklearn.model_selection import train_test_split\n" +
      "s = StandardScaler()\ns.fit_transform(X)\ntrain_test_split(X)\n");

    const scoped = run(["scan", `--dir=${dir}`, "--json"]);
    const scopedIds = scoped.json.findings.map((f) => f.id);
    assert.ok(!scopedIds.includes("preprocessing-fit-before-split"),
      "with the ownership model, the library's own test suite is not the project's leakage");

    // The mutation: re-enable traversal into unowned trees.
    const unscoped = run(["scan", `--dir=${dir}`, "--json", "--include-unowned"]);
    const unscopedIds = unscoped.json.findings.map((f) => f.id);
    assert.ok(unscopedIds.includes("preprocessing-fit-before-split"),
      "and without it, the false positive returns — which is what the scope model is for");
    assert.match(unscoped.json.findings.find((f) => f.id === "preprocessing-fit-before-split").evidence[0],
      /site-packages/);
  });
});

test("B · git tracking decides scope when the target is a repository", () => {
  const scope = resolveScope(ROOT);
  assert.equal(scope.basis, "git-tracked");
  assert.ok(scope.tracked.size > 0);
  assert.ok(scope.tracked.has("package.json"), "a tracked file is in scope");
  assert.ok(!scope.tracked.has("node_modules/x"), "an untracked path is not");
});

test("B · a non-repository falls back to structure rather than to nothing", async () => {
  await scratch(async (dir) => {
    const answer = gitTrackedFiles(dir);
    assert.equal(answer.files, null, "git has no answer here");
    assert.ok(answer.why, "and it says why");
    const scope = resolveScope(dir);
    assert.equal(scope.basis, "heuristic");
    assert.equal(scope.tracked, null);
    // Falling back to an empty scope would report every project as clean, which is the worst
    // available failure for a tool whose job is to find problems.
  });
});

test("B · a declined repository is not reported as 'not a repository'", () => {
  // Observed on a real target: git refused under safe.directory, and the report said the project
  // was not a git repository. That is a false statement about someone's own work, and the two cases
  // lead to different actions — fix your git config, versus this is not version-controlled.
  const scope = resolveScope(ROOT);
  assert.equal(scope.basis, "git-tracked", "the control: this repository answers");

  const answer = gitTrackedFiles(path.join(ROOT, "no-such-directory-here"));
  assert.equal(answer.files, null);
  assert.ok(answer.why && answer.why.length > 0, "the reason is carried, not discarded");
  assert.ok(!/^Not a git repository$/.test(answer.why), "and it is not a guess");
});

test("B · the report states how scope was decided", () => {
  const { json } = run(["scan", `--dir=${ROOT}`, "--json"]);
  assert.ok(json.scope, "the envelope carries the scope");
  assert.equal(json.scope.basis, "git-tracked");
  assert.match(json.scope.note, /tracks/);
  // A clean result means something different at 41 files than at 20,000, and a reader deciding how
  // much to trust it needs to be told which.
});

test("B · the ownership model keeps a real repository under the file cap", () => {
  const { json } = run(["scan", `--dir=${ROOT}`, "--json"]);
  assert.ok(json.filesScanned < 20000, "no truncation");
  assert.ok(!json.findings.some((f) => f.id === "scan-truncated"));
});

// ===========================================================================
// C — blocked means unscored
// Observed: first adoption Finding 4.
// ===========================================================================

const ruleStub = (over = {}) => ({
  id: "leakage.example", kind: "requirement", title: "t", standard: 8, requirement: "R1",
  category: "leakage", level: "required", severity: "error", verification: "code-analysis",
  assurance: "partial", nonExemptible: false, attestable: false, triggers: [],
  introducedIn: "1.0.0", description: "d", rationale: "r", remediation: "fix",
  evidenceExpected: "e", $assuranceNote: "n", deprecatedIn: null, supersededBy: null, removedIn: null,
  ...over,
});

test("C · a blocked verdict carries no score", () => {
  const catalog = {
    rules: new Map([["leakage.example", ruleStub()]]),
    invariants: new Map([["invariant.standards-integrity", ruleStub({ id: "invariant.standards-integrity", kind: "invariant", standard: null, nonExemptible: true, attestable: false })]]),
  };
  const blocked = evaluate({
    catalog,
    policy: { rules: { "leakage.example": { level: "optional" } } },
    findings: [], evaluated: ["leakage.example"], invariantFindings: [], today: "2026-08-09", digests: new Map(),
  });
  assert.equal(blocked.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.equal(blocked.score, null, "a number computed with an altered ruler is not published");

  // And the same evaluation without the weakening does produce one, so the suppression is targeted.
  const ok = evaluate({
    catalog, policy: { rules: {} }, findings: [], evaluated: ["leakage.example"],
    invariantFindings: [], today: "2026-08-09", digests: new Map(),
  });
  assert.equal(ok.status, STATUS.COMPLIANT);
  assert.equal(ok.score, 100);
});

test("C · the rendered report refuses to print a score when blocked", async () => {
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"), "import sklearn\nSEED=1\n");
    await writeFile(path.join(dir, "project-policy.yml"),
      'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\nrules:\n  data.version-pinned:\n    level: optional\n');
    const r = run(["evaluate", `--dir=${dir}`]);
    assert.equal(r.code, 3);
    assert.match(r.out, /BLOCKED_BY_INVARIANT/);
    assert.match(r.out, /Score:\s+not computed/);
    assert.ok(!/Score:\s+\d+%/.test(r.out), "no percentage appears anywhere in a blocked report");
  });
});

// ===========================================================================
// D — explain emits resolvable paths
// Observed: first adoption Finding 5.
// ===========================================================================

test("D · every location explain emits is a real file and a real anchor", () => {
  const out = execFileSync(process.execPath, [CLI, "explain", "--all", ROOT, "--json"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const { explanations } = JSON.parse(out);

  let checked = 0;
  for (const e of explanations) {
    if (!e.standard) continue; // invariants belong to no numbered standard
    checked++;
    assert.ok(e.location, `${e.rule} has a location`);
    assert.ok(!e.location.path.includes("*"), `${e.rule} names a file, not a glob`);
    assert.ok(existsSync(path.join(ROOT, e.location.path)), `${e.rule} names a file that exists`);
    assert.ok(e.location.anchor, `${e.rule} names an anchor`);

    const text = readFileSync(path.join(ROOT, e.location.path), "utf8");
    const slugs = [...text.matchAll(/^### ((?:R|P)\d+) — (.+)$/gm)]
      .map((m) => `${m[1]} — ${m[2]}`.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"));
    assert.ok(slugs.includes(e.location.anchor), `${e.rule}: anchor ${e.location.anchor} is in the file`);
  }
  assert.ok(checked > 0);
});

test("D · the rendered line is openable", () => {
  const r = run(["explain", "leakage.no-target-in-features", ROOT]);
  const line = r.out.split("\n").find((l) => l.includes("Standard 9"));
  assert.ok(line, "the standard is cited");
  assert.ok(!line.includes("*"), "no glob");
  const [file, anchor] = line.split("— ")[1].trim().split("#");
  assert.ok(existsSync(path.join(ROOT, file)));
  assert.ok(anchor && anchor !== "null", "and the anchor is real");
});
