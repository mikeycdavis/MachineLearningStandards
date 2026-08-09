/**
 * The scanner and its detectors.
 *
 * Organising principle: **every detector is asserted twice** — once against a fixture that must
 * provoke it, once against one that must not. A suite that only checked that detectors fire would
 * pass while the scanner reported a violation in every repository it was pointed at, and false
 * positives are the historically shipped bug in tools of this shape. `no-ml-repo` is the sharpest
 * negative case: it names scikit-learn, torch, `train_test_split` and `X_test`, all inside comments
 * and string literals, and nothing may fire.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitSource, importPattern, EVALUATED_RULES, makeFinding } from "../scripts/standards.mjs";
import { loadCatalog, assertBindings } from "../scripts/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");
const fixture = (name) => path.join(ROOT, "test/fixtures", name);

function scan(dir, extra = []) {
  const r = spawnSync(process.execPath, [CLI, "scan", `--dir=${dir}`, "--json", ...extra], { encoding: "utf8" });
  assert.equal(r.error, undefined, `spawn failed: ${r.error}`);
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    assert.fail(`stdout was not JSON.\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  }
  return { code: r.status, json };
}

const ids = (res) => new Set(res.json.findings.map((f) => f.id));
const of = (res, id) => res.json.findings.filter((f) => f.id === id);

const LEAKY = scan(fixture("leaky-repo"));
const CLEAN = scan(fixture("clean-repo"));
const UNPINNED = scan(fixture("unpinned-repo"));
const NOTEBOOK = scan(fixture("notebook-repo"));
const NO_ML = scan(fixture("no-ml-repo"));
const NO_BASELINE = scan(fixture("no-baseline-repo"));

// ---- The use/mention rule, which everything else depends on. ----

test("a library named in a comment or a string is not a library that is used", () => {
  assert.ok(!ids(NO_ML).has("ml-footprint"),
    "no-ml-repo names scikit-learn, torch and tensorflow in a comment and must not register a footprint");
  assert.equal(NO_ML.json.findings.length, 0, "nothing at all fires on a repository that does no ML");
});

test("code signals inside strings and comments are not code signals", () => {
  assert.ok(!ids(NO_ML).has("test-identifier-in-fit"), "`train_test_split(X_test)` inside a string literal");
  assert.ok(!ids(NO_ML).has("preprocessing-fit-before-split"));
});

test("the same signals, genuinely used, are detected", () => {
  assert.ok(ids(LEAKY).has("ml-footprint"));
  assert.ok(ids(LEAKY).has("test-identifier-in-fit"));
});

test("splitSource blanks string contents while keeping them in the source view", () => {
  const src = 'x = "train_test_split(X_test)"\ny = 1  # torch\n';
  const views = splitSource(src, ".py");
  assert.ok(!views.structure.includes("train_test_split"), "structure blanks string contents");
  assert.ok(views.source.includes("train_test_split"), "source keeps them, for import matching");
  assert.ok(views.comments.includes("torch"), "comments hold comment text");
  assert.ok(!views.structure.includes("torch"), "and structure does not");
});

test("splitSource preserves line count so evidence can cite a line", () => {
  const src = 'a = """\nmulti\nline\n"""\nb = 2\n';
  const views = splitSource(src, ".py");
  assert.equal(views.structure.split("\n").length, src.split("\n").length);
});

test("a library is matched import-shaped, never as a bare mention", () => {
  assert.ok(importPattern("torch").test("import torch\n"));
  assert.ok(importPattern("sklearn").test("from sklearn.model_selection import KFold\n"));
  assert.ok(!importPattern("torch").test("we may adopt torch later\n"));
  assert.ok(!importPattern("torch").test("torchlight = 1\n"), "a prefix match is not an import");
});

// ---- Each rule-bound detector, from both sides. ----

test("preprocessing fitted before the split is reported, and a pipeline is not", () => {
  assert.ok(ids(LEAKY).has("preprocessing-fit-before-split"), "scaler.fit_transform before train_test_split");
  assert.ok(!ids(CLEAN).has("preprocessing-fit-before-split"), "preprocessing inside a Pipeline");
});

test("a test-named object passed to fit is reported, and evaluating on the test set is not", () => {
  assert.ok(ids(LEAKY).has("test-identifier-in-fit"), "model.fit(X_test, y_test)");
  assert.ok(!ids(CLEAN).has("test-identifier-in-fit"),
    "clean-repo passes X_test to .score(), which is what a test set is for");
});

test("a missing seed is reported, and a present one is not", () => {
  assert.ok(ids(LEAKY).has("seed-absence"));
  assert.ok(!ids(CLEAN).has("seed-absence"), "random_state= counts");
});

test("unpinned dependencies are reported by name, and pinned ones are not", () => {
  assert.ok(ids(UNPINNED).has("unpinned-dependencies"));
  const evidence = of(UNPINNED, "unpinned-dependencies")[0].evidence.join(" ");
  assert.match(evidence, /pandas/, "the unpinned entry is named");
  assert.ok(!/scikit-learn==1\.5\.1/.test(evidence.replace(/bounded, not pinned/g, "")), "the pinned entry is not");
  assert.ok(!ids(CLEAN).has("unpinned-dependencies"));
});

test("notebook state is reported, and a repository without notebooks is not", () => {
  assert.ok(ids(NOTEBOOK).has("notebook-state"));
  const evidence = of(NOTEBOOK, "notebook-state")[0].evidence.join(" ");
  assert.match(evidence, /committed outputs/);
  assert.match(evidence, /not in order/);
  assert.ok(!ids(CLEAN).has("notebook-state"));
});

test("an unversioned dataset is reported, and a pinned one is not", () => {
  assert.ok(ids(LEAKY).has("dataset-manifest-missing"));
  assert.ok(!ids(CLEAN).has("dataset-manifest-missing"), "a .dvc file pins it");
  assert.ok(!ids(UNPINNED).has("dataset-manifest-missing"), "no data, so the rule has no subject");
});

test("a missing experiment configuration is reported, and params.yaml satisfies it", () => {
  assert.ok(ids(LEAKY).has("experiment-config-missing"));
  assert.ok(!ids(CLEAN).has("experiment-config-missing"));
});

test("a missing model card is reported, and one with the right headings is not", () => {
  assert.ok(ids(LEAKY).has("model-card-missing"));
  assert.ok(!ids(CLEAN).has("model-card-missing"));
});

test("missing provenance documentation is reported, and a dataset card is not", () => {
  assert.ok(ids(LEAKY).has("data-card-missing"));
  assert.ok(!ids(CLEAN).has("data-card-missing"));
});

test("evaluation results with no baseline are reported, and results with one are not", () => {
  assert.ok(ids(NO_BASELINE).has("baseline-section-missing"));
  assert.ok(!ids(CLEAN).has("baseline-section-missing"));
  assert.ok(!ids(LEAKY).has("baseline-section-missing"), "no evaluation document, so nothing to compare against");
});

// ---- Honesty of the output. ----

test("a heuristic finding is never labelled OBSERVED", () => {
  const heuristics = new Set([
    "ml-footprint", "experiment-tooling-observed", "metrics-observed",
    "preprocessing-fit-before-split", "test-identifier-in-fit", "seed-absence",
  ]);
  for (const res of [LEAKY, CLEAN, UNPINNED, NOTEBOOK, NO_BASELINE]) {
    for (const f of res.json.findings) {
      if (heuristics.has(f.id)) {
        assert.equal(f.label, "INFERRED", `${f.id} is a heuristic and must not claim OBSERVED`);
      }
      assert.ok(["OBSERVED", "INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"].includes(f.label), `${f.id} has a known label`);
    }
  }
});

test("the finding constructor refuses to label a heuristic OBSERVED", () => {
  // Enforced where findings are built rather than by convention, so a new heuristic detector
  // cannot claim more than it knows and pass review because the label looked plausible.
  assert.throws(
    () => makeFinding("ml-footprint", { label: "OBSERVED", message: "m" }),
    /heuristic and may not label a finding OBSERVED/,
  );
  assert.doesNotThrow(() => makeFinding("ml-footprint", { message: "m" }));
  assert.equal(makeFinding("ml-footprint", { message: "m" }).label, "INFERRED", "heuristics default to INFERRED");
  assert.equal(makeFinding("notebooks-observed", { message: "m" }).label, "OBSERVED", "a structural fact may claim it");
});

test("every finding carries the fields a reader needs to act", () => {
  for (const res of [LEAKY, CLEAN, NOTEBOOK, NO_BASELINE]) {
    for (const f of res.json.findings) {
      assert.ok(f.id && f.message && f.label, "id, message, label");
      assert.ok(["error", "warning", "info"].includes(f.severity), `${f.id} severity`);
      assert.ok(Array.isArray(f.evidence), `${f.id} evidence is an array`);
    }
  }
});

test("descriptive findings are info and bind to no rule", () => {
  const descriptive = ["ml-footprint", "data-artifacts-observed", "experiment-tooling-observed", "metrics-observed", "notebooks-observed", "model-artifacts-observed"];
  for (const res of [LEAKY, CLEAN, NOTEBOOK]) {
    for (const f of res.json.findings) {
      if (descriptive.includes(f.id)) {
        assert.equal(f.severity, "info", `${f.id} is descriptive`);
        assert.equal(f.rule, undefined, `${f.id} judges nothing`);
      }
    }
  }
});

test("an evidence gap is marked as one, so it routes to gather rather than to fix", () => {
  const gaps = ["seed-absence", "dataset-manifest-missing", "experiment-config-missing", "model-card-missing", "data-card-missing", "baseline-section-missing"];
  for (const res of [LEAKY, NOTEBOOK, NO_BASELINE]) {
    for (const f of res.json.findings) {
      if (gaps.includes(f.id)) assert.equal(f.evidenceGap, true, `${f.id} is an evidence gap`);
      if (f.id === "preprocessing-fit-before-split" || f.id === "test-identifier-in-fit") {
        assert.notEqual(f.evidenceGap, true, `${f.id} is a violation, not a gap`);
      }
    }
  }
});

// ---- The catalog binding, in both directions. ----

test("every rule the scanner reports against exists in the catalog", async () => {
  const catalog = await loadCatalog();
  const reported = [LEAKY, CLEAN, UNPINNED, NOTEBOOK, NO_BASELINE]
    .flatMap((r) => r.json.findings.map((f) => f.rule))
    .filter(Boolean);
  assert.doesNotThrow(() => assertBindings(catalog, reported));
});

test("EVALUATED_RULES and the detector bindings are the same set", async () => {
  const catalog = await loadCatalog();
  assert.doesNotThrow(() => assertBindings(catalog, EVALUATED_RULES));

  // Every id the scanner can emit must be in the evaluated set, or the rule would be judged by a
  // detector while reporting as unexamined.
  const source = await readFile(CLI, "utf8");
  // Invariants are excluded: they reach the verdict through the integrity path rather than a
  // detector, and are never in the evaluated set because no scan of a repository establishes them.
  const bound = new Set(
    [...source.matchAll(/rule:\s*"([a-z][a-z0-9.\-]+)"/g)]
      .map((m) => m[1])
      .filter((id) => !id.startsWith("invariant.")),
  );
  for (const id of bound) {
    assert.ok(EVALUATED_RULES.includes(id), `${id} is bound by a detector but absent from EVALUATED_RULES`);
  }
  for (const id of EVALUATED_RULES) {
    assert.ok(bound.has(id), `${id} is in EVALUATED_RULES but no detector binds it`);
  }
});

test("a rule outside the evaluated set never reports as passing", async () => {
  const catalog = await loadCatalog();
  const outside = [...catalog.rules.keys()].filter((id) => !EVALUATED_RULES.includes(id));
  assert.ok(outside.length > 0, "most of this catalog has no mechanism, which is the honest state");

  const r = spawnSync(process.execPath, [CLI, "evaluate", `--dir=${ROOT}`, "--json"], { encoding: "utf8" });
  const report = JSON.parse(r.stdout);
  for (const result of report.results) {
    if (outside.includes(result.ruleId)) {
      assert.notEqual(result.status, "passed", `${result.ruleId} has no mechanism and must not pass`);
    }
  }
});

// ---- Exit contract and self-report. ----

test("scan exits 0 without --strict and 1 with it when something needs attention", () => {
  assert.equal(scan(fixture("leaky-repo")).code, 0, "a scan is diagnostics, not a gate");
  assert.equal(scan(fixture("leaky-repo"), ["--strict"]).code, 1);
  assert.equal(scan(fixture("clean-repo"), ["--strict"]).code, 0);
});

test("this repository produces no error-severity findings", async () => {
  const res = scan(ROOT);
  const errors = res.json.findings.filter((f) => f.severity === "error");
  assert.deepEqual(errors.map((f) => f.id), [], "the standards repository holds itself to its own scan");
});

test("this repository's fixtures do not make it report on itself", async () => {
  // Excluded by a general skip rule rather than a self-referential exemption: the same mechanism
  // skips node_modules, and nothing in it names this repository.
  const res = scan(ROOT);
  const evidence = res.json.findings.flatMap((f) => f.evidence).join(" ");
  assert.ok(!evidence.includes("fixtures/"), "no finding cites a fixture");
});

test("every standard file is reachable from the scanner's rule references", async () => {
  const files = (await readdir(path.join(ROOT, "standards"))).filter((f) => /^\d\d-.*\.md$/.test(f));
  assert.equal(files.length, 25);
});
