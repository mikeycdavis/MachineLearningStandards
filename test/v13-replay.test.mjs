/**
 * Normative replay for the v1.3 candidate.
 *
 * The question this file answers is not "does the new behaviour work". It is: **does each change
 * have exactly the semantic effect its disposition authorised, and no other?**
 *
 * Two instruments:
 *
 *   A TRUTH TABLE for the one normative modification (N10), enumerating the environment shapes and
 *   asserting which the amended claim establishes — including that the target which provoked the
 *   finding still fails, so the change cannot be a rationalisation of that repository.
 *
 *   A SEMANTIC-DELTA TEST for each clarification. A clarification that changes any project's
 *   disposition is not a clarification, it is a normative change wearing the word. The machine-
 *   readable contract of every rule that existed in v1.2.0 is snapshotted in
 *   test/fixtures/v13-rule-contracts.json and asserted unchanged.
 *
 * Dispositions: artifacts/review/2026-08-09-candidate-disposition.md, commit 80a5a82.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog } from "../scripts/catalog.mjs";
import { EVALUATED_RULES } from "../scripts/standards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");

/** The single rule this candidate is authorised to change the behaviour of. */
const AUTHORISED_BEHAVIOUR_CHANGE = "reproducibility.dependencies-pinned";
/** The single rule this candidate is authorised to add. */
const AUTHORISED_ADDITION = "evaluation.resampling-not-by-default";

/**
 * Contract changes made AFTER this candidate, by a later authorised disposition — FE-34,
 * implementing ADR 0012. They are named here rather than folded into the fixture because
 * `v13-rule-contracts.json` is the frozen 1.3.0 snapshot: rewriting it would destroy the
 * evidence these tests exist to replay. Listing the target values keeps the assertions sharp —
 * any other drift, or drift to a different value, still fails.
 */
const LATER_RECLASSIFIED = new Map([
  ["evaluation.improvement-classification", { kind: "requirement", level: "required", severity: "error" }],
  ["evaluation.uncertainty-reported", { kind: "requirement", level: "required", severity: "error" }],
]);
/** Entries added after this candidate, by that same disposition. */
const LATER_ADDITIONS = ["evaluation.unquantified-difference-not-claimed"];

async function scratch(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-v13-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const git = (dir, ...args) =>
  spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", windowsHide: true });

/** A committed ML project with the given dependency files, and nothing else of interest. */
async function projectWith(dir, files) {
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src/train.py"), "import sklearn\nSEED = 1\n");
  await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
  for (const [name, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), body);
  }
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "t@example.invalid");
  git(dir, "config", "user.name", "t");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "base");
}

function dispositionOf(dir, ruleId) {
  const r = spawnSync(process.execPath, [CLI, "evaluate", `--dir=${dir}`, "--json"], { encoding: "utf8" });
  const json = JSON.parse(r.stdout);
  const rule = json.results.find((x) => x.ruleId === ruleId);
  return rule ? rule.status : "absent";
}

// ===========================================================================
// N10 · the one normative modification — truth table
// ===========================================================================

const PINNED = "scikit-learn==1.5.1\nnumpy==1.26.4\n";
const RANGED = "scikit-learn>=1.5\nnumpy>=1.23\n";
const LOCK = '# resolved environment\nscikit-learn = "1.5.1"\n';

test("N10 · truth table — a resolved environment is established by pins or by a lock artifact", async () => {
  // Each row states the environment shape, what v1.2.0 concluded, and what the amended claim
  // authorises. Only row 3 is permitted to move; a change anywhere else is out of scope.
  const rows = [
    { name: "exact pins, no lock", files: { "requirements.txt": PINNED }, v12: "passed", want: "passed" },
    { name: "exact pins and a lock", files: { "requirements.txt": PINNED, "poetry.lock": LOCK }, v12: "passed", want: "passed" },
    { name: "ranged manifest with a lock", files: { "requirements.txt": RANGED, "poetry.lock": LOCK }, v12: "failed", want: "passed" },
    { name: "ranged manifest alone", files: { "requirements.txt": RANGED }, v12: "failed", want: "failed" },
    { name: "pyproject alone", files: { "pyproject.toml": "[project]\nname='t'\n" }, v12: "failed", want: "failed" },
    { name: "pyproject with a lock", files: { "pyproject.toml": "[project]\nname='t'\n", "uv.lock": LOCK }, v12: "passed", want: "passed" },
  ];

  for (const row of rows) {
    await scratch(async (dir) => {
      await projectWith(dir, row.files);
      assert.equal(dispositionOf(dir, AUTHORISED_BEHAVIOUR_CHANGE), row.want,
        `${row.name}: expected ${row.want}`);
    });
  }

  const moved = rows.filter((r) => r.v12 !== r.want);
  assert.equal(moved.length, 1, "exactly one row of the truth table moves");
  assert.equal(moved[0].name, "ranged manifest with a lock",
    "and it is the row the disposition authorised");
});

test("N10 · the target that provoked the finding still fails", async () => {
  // ultralytics/yolov5 declares ranges and commits no lock artifact. A remedy that excused the
  // repository which prompted it would be the standard bending to a target, which is the thing four
  // adoptions were run to avoid.
  await scratch(async (dir) => {
    await projectWith(dir, {
      "requirements.txt": "matplotlib>=3.3\nnumpy>=1.23.5\npsutil\ntorch>=1.8.0\n",
    });
    assert.equal(dispositionOf(dir, AUTHORISED_BEHAVIOUR_CHANGE), "failed",
      "the amended rule must not absolve the target that motivated it");
  });
});

test("N10 · a bare range is still insufficient even where some entries are pinned", async () => {
  await scratch(async (dir) => {
    await projectWith(dir, { "requirements.txt": "scikit-learn==1.5.1\nnumpy>=1.23\n" });
    assert.equal(dispositionOf(dir, AUTHORISED_BEHAVIOUR_CHANGE), "failed");
  });
});

// ===========================================================================
// Clarifications · semantic-delta
// ===========================================================================

test("clarification delta — no rule that predates the normative work changed its machine-readable contract", async () => {
  // The operative question for N1, N2, N7, N9 and N12. The snapshot is taken from the 1.3.0
  // framework release, which is this candidate's parent and contains no normative change of its
  // own. Each clarification edited prose in a standard; none was
  // authorised to change what any rule requires, how it is verified, or what evidence satisfies it.
  // If one of them moved a contract field, it was a normative change and must re-enter disposition.
  const before = JSON.parse(await readFile(path.join(ROOT, "test/fixtures/v13-rule-contracts.json"), "utf8"));
  const catalog = await loadCatalog();
  const live = new Map();
  for (const r of [...catalog.rules.values(), ...catalog.invariants.values()]) live.set(r.id, r);

  const drifted = [];
  for (const [id, was] of Object.entries(before)) {
    const now = live.get(id);
    assert.ok(now, `${id} vanished; no disposition authorised removing a rule`);
    const nowContract = {
      kind: now.kind, level: now.level, severity: now.severity, verification: now.verification,
      assurance: now.assurance, nonExemptible: now.nonExemptible, attestable: now.attestable,
      standard: now.standard ?? null, requirement: now.requirement ?? null,
      triggers: (now.triggers ?? []).slice().sort(), evidenceExpected: now.evidenceExpected ?? null,
    };
    const authorised = LATER_RECLASSIFIED.get(id);
    for (const key of Object.keys(was)) {
      if (JSON.stringify(was[key]) === JSON.stringify(nowContract[key])) continue;
      // A later disposition may have moved this field, but only to the value it authorised.
      if (authorised && key in authorised && nowContract[key] === authorised[key]) continue;
      drifted.push(`${id}.${key}`);
    }
  }

  assert.deepEqual(drifted, [],
    "a clarification changed a rule's contract, which makes it a normative change, not a clarification");
});

test("clarification delta — the set of machine-examined rules is unchanged", () => {
  // A clarification that widened or narrowed automation would change which projects get a verdict
  // rather than which projects comply, and that is a different authorisation.
  assert.deepEqual([...EVALUATED_RULES].sort(), [
    "data.provenance-documented",
    "data.version-pinned",
    "deployment.model-card",
    "evaluation.baseline-exists",
    "leakage.no-preprocessing-leakage",
    "reproducibility.dependencies-pinned",
    "reproducibility.experiment-config-recorded",
    "reproducibility.notebook-hygiene",
    "reproducibility.seeds-recorded",
    "split.no-test-set-tuning",
  ]);
});

test("clarification delta — no project's disposition moves on any rule but the authorised one", async () => {
  // The direct form of the question the disposition process asks of a clarification: what project
  // was compliant before and is not now, and the reverse. The answer must be none.
  await scratch(async (dir) => {
    await projectWith(dir, { "requirements.txt": PINNED });
    const r = spawnSync(process.execPath, [CLI, "evaluate", `--dir=${dir}`, "--json"], { encoding: "utf8" });
    const results = JSON.parse(r.stdout).results;

    // Standards touched by clarifications: 1 (N17 withdrawn), 10 (N2), 11 (N1), 13 (N9), 19 (N12),
    // 20 (N7). No rule belonging to any of them may report an evaluated outcome, because none of
    // them is machine-examined and none of the clarifications gave one a mechanism.
    const touched = [10, 11, 13, 19, 20];
    for (const res of results) {
      if (!touched.includes(res.standard)) continue;
      if (res.ruleId === AUTHORISED_ADDITION) continue;
      assert.notEqual(res.disposition, "evaluated",
        `${res.ruleId} became machine-evaluated, which no clarification authorised`);
    }
  });
});

// ===========================================================================
// N16 · the one addition, and its boundary
// ===========================================================================

test("N16 · the added rule is a recommendation and is locked in the baseline", async () => {
  const catalog = await loadCatalog();
  const rule = catalog.rules.get(AUTHORISED_ADDITION);
  assert.ok(rule, "the recommendation was added");
  assert.equal(rule.kind, "recommendation",
    "a requirement here would be MAJOR and would contradict its own disposition");
  assert.equal(rule.level, "recommended");
  assert.equal(rule.severity, "warning");
  assert.equal(rule.introducedIn, "1.4.0");

  const baseline = JSON.parse(await readFile(path.join(ROOT, "artifacts/catalog-baseline.json"), "utf8"));
  const locked = baseline.rules.find((r) => r.id === AUTHORISED_ADDITION);
  assert.ok(locked, "the relock was deliberate and the new rule is covered");
  assert.equal(locked.kind, "recommendation");
});

test("N16 · the recommendation carries its own boundary, so it cannot be read as a prohibition", async () => {
  const text = await readFile(path.join(ROOT, "standards/11-class-imbalance.md"), "utf8");
  const section = text.slice(text.indexOf("### R6"));
  for (const exempted of ["weak learner", "reweighting", "rare-event"]) {
    assert.ok(new RegExp(exempted, "i").test(section),
      `the standard must name where the evidence does not reach: ${exempted}`);
  }
  assert.ok(/SHOULD NOT/.test(section) && !/MUST NOT/.test(section),
    "a prohibition would be wrong in named, common cases");
});

// ===========================================================================
// Additions held back, recorded so their absence is deliberate
// ===========================================================================

test("held back — no new requirement or prohibition entered the catalog", async () => {
  // N3, N5 and N8 are supported additions and are NOT in this candidate: adding a requirement is
  // MAJOR under the versioning policy in CHANGELOG.md, and a 1.3.0 cannot carry one. Asserting it
  // here means a later edit cannot slip one in under a MINOR release.
  const before = JSON.parse(await readFile(path.join(ROOT, "test/fixtures/v13-rule-contracts.json"), "utf8"));
  const catalog = await loadCatalog();
  const added = [...catalog.rules.values(), ...catalog.invariants.values()]
    .filter((r) => !(r.id in before));
  const expected = [AUTHORISED_ADDITION, ...LATER_ADDITIONS].sort();
  assert.deepEqual(added.map((r) => r.id).sort(), expected);
  // The claim this test makes is unchanged and still holds: every addition is a recommendation,
  // so no requirement or prohibition has entered the catalog under a MINOR release.
  assert.deepEqual(added.map((r) => r.kind), added.map(() => "recommendation"));
});
