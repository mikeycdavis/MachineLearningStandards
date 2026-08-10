/**
 * The v1.2 remediations: epistemic correctness.
 *
 * v1.1 asked whether the right files were being read. v1.2 asks a harder question — whether the
 * evidence actually establishes the proposition the verdict claims it establishes. Three defects,
 * all found by the fourth adoption against an independently owned repository, all of them producing
 * unearned confidence rather than false alarms.
 *
 * Observed in artifacts/adoption/2026-08-09-fourth-adoption.md and the detector audit in
 * design/negative-evidence-audit.md. Each test names its source and, where a mutation is possible,
 * reintroduces the defect and proves the guard fires.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gitOwnedFiles, resolveScope } from "../scripts/ownership.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");

async function scratch(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-v12-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const run = (args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* text mode */ }
  return { code: r.status, json, out: r.stdout };
};

const git = (dir, ...args) =>
  spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", windowsHide: true });

/** A minimal committed ML repository, ready for documents to be added to it. */
async function mlRepo(dir) {
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(path.join(dir, "src/train.py"), "import sklearn\nSEED = 1\n");
  await writeFile(path.join(dir, "requirements.txt"), "scikit-learn==1.5.1\n");
  await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "t@example.invalid");
  git(dir, "config", "user.name", "t");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "base");
}

const MODEL_CARD = `# Model card

## Intended use
Ranking candidate records for manual review. Not a decision system, and not validated
for any use where a false negative carries safety consequences.

## Evaluation
Measured on the held-out 2024 quarter, which no model selection touched.

| Model | Split | AUC |
| --- | --- | --- |
| Baseline — most-frequent class | 2024Q4 | 0.500 |
| Gradient boosting | 2024Q4 | 0.731 |

## Limitations
Performance on records older than 2019 is untested, and the smallest segment
carries fewer than two hundred examples.
`;

// ===========================================================================
// A — ownership: owned is not the same as committed
// Observed: fourth adoption, defect 2.
// ===========================================================================

test("A · identical evidence receives an identical disposition before and after git add", async () => {
  // The acceptance test for the whole change, and the one that must never be allowed to rot.
  // Scope was `git ls-files --cached`, which equates owned with committed, so the documented
  // workflow — init, edit, evaluate — told operators the file they had just written did not exist.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await writeFile(path.join(dir, "MODEL_CARD.md"), MODEL_CARD);

    const before = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((r) => r.ruleId === "deployment.model-card");
    git(dir, "add", "MODEL_CARD.md");
    const after = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((r) => r.ruleId === "deployment.model-card");

    assert.equal(before.disposition, after.disposition,
      "staging a file changed the verdict on evidence that did not change");
    assert.equal(before.status, after.status);
    assert.equal(before.status, "passed", "and the completed card is accepted in both states");
  });
});

test("A · mutation — scoping to tracked files alone brings the defect back", async () => {
  // Reintroduce the v1.1 model directly: ask git only for what is committed. If the fix were
  // cosmetic the two lists would match; they do not, and the missing file is the operator's work.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await writeFile(path.join(dir, "MODEL_CARD.md"), MODEL_CARD);

    const trackedOnly = git(dir, "ls-files", "--cached", "--exclude-standard").stdout.split("\n").filter(Boolean);
    assert.ok(!trackedOnly.includes("MODEL_CARD.md"), "the old scope cannot see it");

    const owned = gitOwnedFiles(dir);
    assert.ok(owned.files.includes("MODEL_CARD.md"), "the new scope can");
    assert.ok(owned.untracked >= 1, "and the report can say how much of the scope is uncommitted");
  });
});

test("A · untracked does not mean unowned in the other direction either", async () => {
  // The risk the fix creates: `--others` would happily hand back a virtualenv nobody ignored, which
  // is the exact tree v1.1 was built to keep out. Structure decides, not the index.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await mkdir(path.join(dir, "test-env-3.11/Lib/site-packages/sklearn"), { recursive: true });
    await writeFile(path.join(dir, "test-env-3.11/pyvenv.cfg"), "home = /usr\n");
    await writeFile(path.join(dir, "test-env-3.11/Lib/site-packages/sklearn/leaky.py"),
      "from sklearn.preprocessing import StandardScaler\nStandardScaler().fit(X)\ntrain_test_split(X)\n");
    await mkdir(path.join(dir, "node_modules/pkg"), { recursive: true });
    await writeFile(path.join(dir, "node_modules/pkg/index.js"), "module.exports = 1;\n");

    const owned = gitOwnedFiles(dir);
    assert.ok(!owned.files.some((f) => f.includes("site-packages")), "an unignored virtualenv stays out");
    assert.ok(!owned.files.some((f) => f.startsWith("node_modules/")), "so does a dependency tree");

    const scope = resolveScope(dir);
    assert.equal(scope.basis, "git-owned");
    assert.match(scope.note, /untracked but not ignored/);
  });
});

test("A · an ignored file is still out of scope, because the project said so", async () => {
  await scratch(async (dir) => {
    await mlRepo(dir);
    await writeFile(path.join(dir, ".gitignore"), "scratch/\n");
    await mkdir(path.join(dir, "scratch"), { recursive: true });
    await writeFile(path.join(dir, "scratch/MODEL_CARD.md"), MODEL_CARD);

    const owned = gitOwnedFiles(dir);
    assert.ok(!owned.files.some((f) => f.startsWith("scratch/")),
      ".gitignore is the project's own statement about what it disowns");
  });
});

// ===========================================================================
// B — evidence subject fidelity
// Observed: fourth adoption, defect 1.
// ===========================================================================

test("B · versioning a model does not establish that the data is versioned", async () => {
  // Verbatim in shape from the target: four log_artifact sites, every one of them type="model",
  // and a required rule reported "no violation observed" on a repository with no dataset
  // versioning of any kind. Same activity, different subject.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await mkdir(path.join(dir, "data"), { recursive: true });
    await writeFile(path.join(dir, "data/coco.yaml"), "train: train.txt\nval: val.txt\n");
    await writeFile(path.join(dir, "src/log.py"),
      'import wandb\nart = wandb.Artifact(name="run_model", type="model")\nart.add_file("best.pt")\nwandb.log_artifact(art)\n');
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "logging");

    const r = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((x) => x.ruleId === "data.version-pinned");
    assert.notEqual(r.status, "passed", "model-artifact logging was read as dataset versioning");
    assert.equal(r.disposition, "insufficient-evidence");
  });
});

test("B · versioning the data does establish it, so the check is not merely stricter", async () => {
  // The converse constraint. A guard that rejected genuine evidence would be switched off within a
  // week, and every subject test in here is asserted from both directions.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await mkdir(path.join(dir, "data"), { recursive: true });
    await writeFile(path.join(dir, "data/coco.yaml"), "train: train.txt\n");
    await writeFile(path.join(dir, "src/log.py"),
      'import wandb\nwandb.use_artifact("training-set:v3", type="dataset")\n');
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "dataset artifact");

    const r = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((x) => x.ruleId === "data.version-pinned");
    assert.equal(r.status, "passed", "a dataset artifact reference is evidence about the dataset");
  });
});

test("B · opening a tracking run does not establish that parameters were recorded", async () => {
  // Found by the audit rather than by the adoption, and it is the same defect: `wandb.init()`
  // starts a session, and the rule asks for the parameter set. On the adoption target the call did
  // pass `config=`, so the target's own verdict is unchanged — which is how a fix should behave.
  await scratch(async (dir) => {
    await mlRepo(dir);
    await writeFile(path.join(dir, "src/track.py"), 'import wandb\nwandb.init(project="p")\n');
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "tracking");

    const bare = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((x) => x.ruleId === "reproducibility.experiment-config-recorded");
    assert.notEqual(bare.status, "passed", "a bare init was read as a recorded parameter set");

    await writeFile(path.join(dir, "src/track.py"), 'import wandb\nwandb.init(project="p", config=opt)\n');
    const withConfig = run(["evaluate", `--dir=${dir}`, "--json"]).json
      .results.find((x) => x.ruleId === "reproducibility.experiment-config-recorded");
    assert.equal(withConfig.status, "passed", "handing the tracker the parameters does establish it");
  });
});

// ===========================================================================
// C — negative evidence: silence is probative only with subject coverage
// Observed: fourth adoption, candidate 3, promoted after the detector audit.
// ===========================================================================

test("C · a detector with no subject to read does not produce a pass", async () => {
  // The adoption target contained no scikit-learn at all. Two detectors that read only that dialect
  // found nothing, and two nonExemptible prohibitions reported passed on a repository whose
  // hyperparameter search they had never looked at.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"),
      "import torch\nfor epoch in range(10):\n    loss.backward()\n");
    await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
    git(dir, "init", "-q");
    git(dir, "config", "user.email", "t@example.invalid");
    git(dir, "config", "user.name", "t");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "torch only");

    const results = run(["evaluate", `--dir=${dir}`, "--json"]).json.results;
    for (const id of ["leakage.no-preprocessing-leakage", "split.no-test-set-tuning"]) {
      const r = results.find((x) => x.ruleId === id);
      assert.notEqual(r.status, "passed", `${id} passed on a dialect its detector cannot read`);
      assert.equal(r.disposition, "not-evaluated");
      assert.match(r.message, /not probative here/,
        "and the report says why, because an unexplained unknown is not actionable");
    }
  });
});

test("C · the same rules still pass where the detector could have seen a violation", async () => {
  // The converse. If subject coverage were treated as absent whenever nothing was found, every
  // correct pass would collapse into a shrug and the check would be worthless.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"), [
      "from sklearn.model_selection import train_test_split",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.pipeline import Pipeline",
      "X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)",
      "pipe = Pipeline([('s', StandardScaler()), ('m', model)])",
      "pipe.fit(X_train, y_train)",
      "",
    ].join("\n"));
    await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
    git(dir, "init", "-q");
    git(dir, "config", "user.email", "t@example.invalid");
    git(dir, "config", "user.name", "t");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "sklearn, done correctly");

    const results = run(["evaluate", `--dir=${dir}`, "--json"]).json.results;
    for (const id of ["leakage.no-preprocessing-leakage", "split.no-test-set-tuning"]) {
      const r = results.find((x) => x.ruleId === id);
      assert.equal(r.status, "passed",
        `${id} lost a legitimate pass: the idiom is present and correct here`);
    }
  });
});

test("C · a rule demoted for lack of coverage still asks for what would resolve it", async () => {
  // An unknown that names no remedy is a dead end. These route to human judgement, because no
  // further file will give the detector the dialect it reads.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "src"), { recursive: true });
    await writeFile(path.join(dir, "src/train.py"), "import torch\n");
    await writeFile(path.join(dir, "project-policy.yml"), 'standardVersion: "1.0.0"\nproject: "t"\nexceptions: []\n');
    git(dir, "init", "-q");
    git(dir, "config", "user.email", "t@example.invalid");
    git(dir, "config", "user.name", "t");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "torch");

    const json = run(["evaluate", `--dir=${dir}`, "--json"]).json;
    const req = json.evidenceRequests.find((r) => r.rule === "split.no-test-set-tuning");
    assert.ok(req, "the demoted rule appears in the evidence requests");
    assert.ok(req.needs && req.needs.length > 0, "and says what evidence would settle it");
    assert.match(req.how, /could not see this rule's subject/);
  });
});
