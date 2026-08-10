#!/usr/bin/env node
/**
 * The command-line interface: init, scan, evaluate, explain, status.
 *
 * Designed against design/ml-audit-detectors.md, which was written first so that detector
 * capability could not quietly define what the standards are.
 *
 * Two disciplines in here are load-bearing rather than stylistic:
 *
 *   The use/mention rule. Every code file is split into three views — structure (comments removed,
 *   string contents blanked), source (strings intact, for import matching only), and comments — and
 *   each detector reads exactly one. Without it, prose that names scikit-learn is reported as use of
 *   scikit-learn and a commented-out train_test_split counts as a split.
 *
 *   EVALUATED_RULES. A rule outside that set is never reported as passing, whatever the scan did or
 *   did not find. Absence of a finding is not evidence of compliance.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseYaml, YamlError } from "./yaml.mjs";
import { validate, assertSchemaSupported } from "./jsonschema.mjs";
import { loadCatalog, resolve, assertBindings, coverage, CatalogError } from "./catalog.mjs";
import { evaluate, envelope, STATUS, SCHEMA_VERSION } from "./compliance.mjs";
import { checkIntegrity } from "./integrity.mjs";
import { plan as initPlan, apply as initApply, renderPlan } from "./init.mjs";
import { anyDocumentAnswers, isScaffold, isSubstantive, sectionBody } from "./scaffolding.mjs";
import { resolveScope, isUnownedPath, isVirtualenv, isNestedCheckout } from "./ownership.mjs";

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_INVOCATION = 2;
const EXIT_BLOCKED = 3;

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = path.join(HERE, "scripts", "standards.mjs");

const MAX_FILES = 20000;
const MAX_READ_BYTES = 400_000;
const MAX_EVIDENCE = 12;

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", ".next", ".nuxt", ".venv", "venv",
  "__pycache__", "target", "vendor", "coverage", ".pytest_cache", ".idea", ".vscode",
  // The repository's own fixtures contain deliberate violations. Excluding them by a general
  // mechanism rather than by a self-referential exemption is the difference between a tool that
  // ignores test data and a tool that ignores itself.
  "fixtures",
]);

const COMMANDS = new Set(["init", "scan", "evaluate", "explain", "status"]);

/** The rule ids the evaluator actually examines. Everything else reports not-evaluated. */
export const EVALUATED_RULES = [
  "leakage.no-preprocessing-leakage",
  "split.no-test-set-tuning",
  "reproducibility.seeds-recorded",
  "reproducibility.dependencies-pinned",
  "reproducibility.notebook-hygiene",
  "data.version-pinned",
  "reproducibility.experiment-config-recorded",
  "deployment.model-card",
  "data.provenance-documented",
  "evaluation.baseline-exists",
];

// ---------------------------------------------------------------------------
// Source views: the use/mention rule.
// ---------------------------------------------------------------------------

const LINE_COMMENT = { ".py": "#", ".js": "//", ".mjs": "//", ".ts": "//", ".r": "#", ".jl": "#", ".sh": "#", ".yml": "#", ".yaml": "#" };

/**
 * Split a file into { structure, source, comments }.
 *
 * `structure` keeps code shape but blanks the CONTENTS of strings, so a docstring mentioning
 * `X_test` cannot be read as a reference to a variable. `source` keeps strings, because an import
 * specifier is a string and library matching needs it.
 */
export function splitSource(text, ext) {
  const lineToken = LINE_COMMENT[ext] ?? "#";
  const structure = [];
  const source = [];
  const comments = [];

  let i = 0;
  let quote = null;
  let quoteLen = 0;
  while (i < text.length) {
    const ch = text[i];

    if (quote) {
      const closes = text.startsWith(quote, i);
      if (closes) {
        structure.push(quote);
        source.push(quote);
        i += quoteLen;
        quote = null;
        continue;
      }
      // Inside a string: keep the character in `source`, blank it in `structure` (preserving
      // newlines so line numbers survive).
      source.push(ch);
      structure.push(ch === "\n" ? "\n" : " ");
      i++;
      continue;
    }

    // Python triple quotes, which are also how docstrings are written.
    if (ext === ".py" && (text.startsWith('"""', i) || text.startsWith("'''", i))) {
      quote = text.slice(i, i + 3);
      quoteLen = 3;
      structure.push(quote);
      source.push(quote);
      i += 3;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      quoteLen = 1;
      structure.push(ch);
      source.push(ch);
      i++;
      continue;
    }

    if (text.startsWith(lineToken, i)) {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      comments.push(text.slice(i, stop));
      comments.push("\n");
      structure.push(" ".repeat(stop - i));
      source.push(" ".repeat(stop - i));
      i = stop;
      continue;
    }
    if ((ext === ".js" || ext === ".mjs" || ext === ".ts") && text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      comments.push(text.slice(i, stop), "\n");
      for (const c of text.slice(i, stop)) {
        structure.push(c === "\n" ? "\n" : " ");
        source.push(c === "\n" ? "\n" : " ");
      }
      i = stop;
      continue;
    }

    structure.push(ch);
    source.push(ch);
    i++;
  }

  return { structure: structure.join(""), source: source.join(""), comments: comments.join("") };
}

/** Match a library import-shaped, never as a bare mention. */
export function importPattern(pkg) {
  const p = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|\\n)\\s*(?:import\\s+${p}\\b|from\\s+${p}[\\s.]|import\\s*\\{[^}]*\\}\\s*from\\s*['"]${p}|require\\(['"]${p})`,
  );
}

// ---------------------------------------------------------------------------
// Scanning.
// ---------------------------------------------------------------------------

const CODE_EXT = new Set([".py", ".js", ".mjs", ".ts", ".r", ".jl"]);
const TEXT_EXT = new Set([...CODE_EXT, ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".cfg", ".ini"]);

async function walk(root, scope) {
  const files = [];
  let truncated = false;
  let excluded = 0;
  const rel = (f) => path.relative(root, f).split(path.sep).join("/");

  // The fast path. When git has told us what the project tracks, there is nothing to walk and
  // nothing to guess: the list is the answer, and it is exact rather than approximate.
  if (scope.tracked) {
    for (const r of scope.tracked) {
      if (files.length >= MAX_FILES) { truncated = true; break; }
      // Tracked is not the same as in scope. A repository legitimately commits test fixtures,
      // vendored snapshots, and sample projects; those are owned but they are not the work being
      // judged. The same skip list that excludes them from a heuristic walk applies here.
      if (r.split("/").some((segment) => SKIP_DIRS.has(segment))) { excluded++; continue; }
      files.push(path.join(root, r));
    }
    return { files, truncated, excluded };
  }

  async function visit(dir) {
    if (files.length >= MAX_FILES) { truncated = true; return; }
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) { truncated = true; return; }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (scope.basis !== "everything") {
          // Structure before names: a virtualenv is recognised by carrying pyvenv.cfg or a
          // site-packages tree, because the directory it lives in can be called anything.
          if (isUnownedPath(rel(full)) || isVirtualenv(full) || isNestedCheckout(full, root)) {
            excluded++;
            continue;
          }
        }
        if (SKIP_DIRS.has(entry.name) && scope.basis !== "everything") continue;
        await visit(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  await visit(root);
  return { files, truncated, excluded };
}

/** Read the repository once into the shape every detector consumes. */
async function readRepo(root, options = {}) {
  const scope = resolveScope(root, options);
  const { files, truncated, excluded } = await walk(root, scope);
  const rel = (f) => path.relative(root, f).split(path.sep).join("/");

  const entries = [];
  for (const full of files) {
    const ext = path.extname(full).toLowerCase();
    const relPath = rel(full);
    const entry = { path: relPath, ext, text: null, views: null, notebook: null };

    if (path.resolve(full) === SELF) {
      // The scanner names every library it searches for; reading itself would report a footprint
      // that is a property of the tool rather than of the project.
      entries.push(entry);
      continue;
    }

    if (TEXT_EXT.has(ext) || ext === ".ipynb") {
      let info;
      try {
        info = await stat(full);
      } catch {
        entries.push(entry);
        continue;
      }
      if (info.size > MAX_READ_BYTES) {
        entry.truncated = true;
        entries.push(entry);
        continue;
      }
      try {
        entry.text = await readFile(full, "utf8");
      } catch {
        entries.push(entry);
        continue;
      }
      if (ext === ".ipynb") {
        try {
          const nb = JSON.parse(entry.text);
          const cells = Array.isArray(nb.cells) ? nb.cells : [];
          const code = cells.filter((c) => c.cell_type === "code");
          entry.notebook = {
            cells: code,
            withOutputs: code.filter((c) => Array.isArray(c.outputs) && c.outputs.length > 0).length,
            counts: code.map((c) => c.execution_count).filter((n) => typeof n === "number"),
          };
          const src = code.map((c) => (Array.isArray(c.source) ? c.source.join("") : c.source ?? "")).join("\n");
          entry.views = splitSource(src, ".py");
        } catch {
          entry.notebook = null;
        }
      } else if (CODE_EXT.has(ext)) {
        entry.views = splitSource(entry.text, ext);
      }
    }
    entries.push(entry);
  }
  return { entries, truncated, fileCount: files.length, scope, excluded, templates: shippedTemplateBodies() };
}

// ---------------------------------------------------------------------------
// Detectors.
// ---------------------------------------------------------------------------

const ML_LIBRARIES = ["sklearn", "torch", "tensorflow", "keras", "xgboost", "lightgbm", "catboost", "statsmodels", "transformers"];
const TRACKING_LIBRARIES = ["mlflow", "wandb", "hydra", "sacred", "optuna"];
const PREPROCESSORS = ["StandardScaler", "MinMaxScaler", "RobustScaler", "OneHotEncoder", "SimpleImputer", "TfidfVectorizer", "PCA", "LabelEncoder"];
const SPLITTERS = ["train_test_split", "KFold", "TimeSeriesSplit", "GroupKFold", "StratifiedKFold", "ShuffleSplit"];
const SEED_SIGNALS = ["random_state=", "np.random.seed(", "numpy.random.seed(", "torch.manual_seed(", "tf.random.set_seed(", "random.seed(", "seed_everything(", "set_seed("];
const METRIC_SIGNALS = ["accuracy_score(", "f1_score(", "roc_auc_score(", "mean_squared_error(", "mean_absolute_error(", "log_loss(", "precision_score(", "recall_score(", "r2_score("];
const MODEL_BINARY = new Set([".pkl", ".joblib", ".pt", ".pth", ".h5", ".onnx", ".pb", ".safetensors"]);
const DATA_EXT = new Set([".csv", ".parquet", ".feather", ".tsv", ".arrow"]);

/** Heuristic detectors, whose findings are labelled INFERRED and never OBSERVED. */
const HEURISTIC = new Set([
  "ml-footprint", "experiment-tooling-observed", "metrics-observed",
  "preprocessing-fit-before-split", "test-identifier-in-fit", "seed-absence",
]);

export function makeFinding(id, over) {
  const label = over.label ?? (HEURISTIC.has(id) ? "INFERRED" : "OBSERVED");
  if (HEURISTIC.has(id) && label === "OBSERVED") {
    // invariant.honest-evidence-labels, enforced at the point of construction rather than by
    // convention: a heuristic that claimed OBSERVED would overstate what the tool knows.
    throw new Error(`detector ${id} is heuristic and may not label a finding OBSERVED`);
  }
  return {
    id,
    severity: "info",
    label,
    evidence: [],
    ...over,
    ...(over.evidence ? { evidence: over.evidence.slice(0, MAX_EVIDENCE) } : {}),
  };
}

export function detect(repo) {
  const findings = [];
  const add = (id, over) => findings.push(makeFinding(id, over));

  /**
   * The rules whose detector actually ran against THIS target.
   *
   * Distinct from EVALUATED_RULES, which is the set the evaluator can examine in principle. Several
   * detectors are gated behind a trigger — the provenance check only runs where data exists — and a
   * gated detector that never ran produced no finding, which the engine previously read as a pass.
   * That is invariant.no-silent-pass failing in its general form, and it was found by a test asking
   * why a project with no data was credited with documenting its data.
   */
  const examined = new Set();
  const examine = (...ids) => ids.forEach((id) => examined.add(id));

  /**
   * Rules whose detector ran but had no subject to read, with the reason.
   *
   * The distinction the fourth adoption forced. A detector's silence carries two different
   * propositions — "no violation was observed" and "the prohibition was established as satisfied" —
   * and only the first is always true. Absence of a finding is probative only where the detector had
   * sufficient subject coverage for absence to mean something.
   *
   * The case that showed it: a target containing no scikit-learn at all. Two detectors that read
   * only the scikit-learn idiom found nothing, and two nonExemptible prohibitions reported passed on
   * a repository whose hyperparameter search they had never looked at. Nothing was wrong with the
   * detectors; the wrong thing was converting their silence into a pass.
   */
  const coverageGaps = new Map();
  const noCoverage = (id, why) => coverageGaps.set(id, why);
  const files = repo.entries;
  const codeFiles = files.filter((f) => f.views && CODE_EXT.has(f.ext));
  const notebooks = files.filter((f) => f.notebook);
  const has = (p) => files.some((f) => f.path === p);
  const find = (re) => files.filter((f) => re.test(f.path));

  // ---- Descriptive ----

  const mlHits = [];
  for (const f of [...codeFiles, ...notebooks]) {
    if (!f.views) continue;
    for (const lib of ML_LIBRARIES) {
      if (importPattern(lib).test(f.views.source)) { mlHits.push(f.path); break; }
    }
  }
  const trainingNamed = find(/(^|\/)(train|training)[^/]*\.py$|_train\.py$/i).map((f) => f.path);
  const mlFootprint = [...new Set([...mlHits, ...trainingNamed])];
  if (mlFootprint.length > 0) {
    add("ml-footprint", {
      message: `Machine-learning code observed in ${mlFootprint.length} file(s).`,
      evidence: mlFootprint,
    });
  }

  const dataFiles = files.filter((f) => DATA_EXT.has(f.ext)).map((f) => f.path);
  const dataDirs = find(/^data\//).map((f) => f.path);
  const dataArtifacts = [...new Set([...dataFiles, ...dataDirs])];
  if (dataArtifacts.length > 0) {
    add("data-artifacts-observed", {
      message: `${dataArtifacts.length} data artifact(s) present.`,
      evidence: dataArtifacts,
    });
  }

  const tracking = [];
  for (const f of codeFiles) {
    for (const lib of TRACKING_LIBRARIES) {
      if (importPattern(lib).test(f.views.source)) { tracking.push(f.path); break; }
    }
  }
  const configArtifacts = files.filter((f) => /^params\.ya?ml$|^conf(ig)?s?\//.test(f.path)).map((f) => f.path);
  if (tracking.length > 0 || configArtifacts.length > 0) {
    add("experiment-tooling-observed", {
      message: "Experiment tooling or configuration present. An import is a mention, not evidence of tracked runs.",
      evidence: [...tracking, ...configArtifacts],
    });
  }

  const metrics = new Set();
  const metricFiles = [];
  for (const f of [...codeFiles, ...notebooks]) {
    if (!f.views) continue;
    let hit = false;
    for (const m of METRIC_SIGNALS) {
      if (f.views.structure.includes(m)) { metrics.add(m.replace("(", "")); hit = true; }
    }
    if (hit) metricFiles.push(f.path);
  }
  if (metrics.size > 0) {
    add("metrics-observed", {
      message: `Metrics appearing in code: ${[...metrics].sort().join(", ")}. Reported, not judged — whether a metric suits the problem depends on the base rate and the cost of an error, neither of which is visible here.`,
      evidence: metricFiles,
    });
  }

  if (notebooks.length > 0) {
    add("notebooks-observed", {
      message: `${notebooks.length} notebook(s) present.`,
      evidence: notebooks.map((f) => f.path),
    });
  }

  const binaries = files.filter((f) => MODEL_BINARY.has(f.ext)).map((f) => f.path);
  if (binaries.length > 0) {
    add("model-artifacts-observed", {
      message: `${binaries.length} serialized model artifact(s) committed.`,
      evidence: binaries,
    });
  }

  // The applicability gate. Everything below is about ML work; without a footprint there is no
  // subject, and reporting on it would be reporting on nothing.
  const isML = mlFootprint.length > 0;
  const triggers = {
    "ml-footprint": isML,
    "training-code": isML,
    "data-artifacts": dataArtifacts.length > 0,
    "notebooks-present": notebooks.length > 0,
    "deployment-surface": binaries.length > 0 || find(/(^|\/)(serve|inference|predict|api)[^/]*\.py$/i).length > 0,
    "temporal-signals": isML && [...codeFiles, ...notebooks].some((f) => f.views && /TimeSeriesSplit\(/.test(f.views.structure)),
  };

  // ---- Rule-bound ----

  // A1 — preprocessing fitted before the split, in the same file.
  examine("leakage.no-preprocessing-leakage", "split.no-test-set-tuning");
  const a1 = [];
  let sawPreprocessor = false;
  let sawSplitter = false;
  for (const f of [...codeFiles, ...notebooks]) {
    if (!f.views || (f.ext !== ".py" && f.ext !== ".ipynb")) continue;
    const s = f.views.structure;
    if (PREPROCESSORS.some((p) => s.includes(p + "("))) sawPreprocessor = true;
    if (SPLITTERS.some((sp) => s.includes(sp + "("))) sawSplitter = true;
    let earliestFit = -1;
    for (const p of PREPROCESSORS) {
      const ctor = s.indexOf(p + "(");
      if (ctor === -1) continue;
      const fitIdx = Math.min(
        ...[".fit(", ".fit_transform("].map((m) => { const k = s.indexOf(m, ctor); return k === -1 ? Infinity : k; }),
      );
      if (fitIdx !== Infinity && (earliestFit === -1 || fitIdx < earliestFit)) earliestFit = fitIdx;
    }
    if (earliestFit === -1) continue;
    let earliestSplit = Infinity;
    for (const sp of SPLITTERS) {
      const k = s.indexOf(sp + "(");
      if (k !== -1 && k < earliestSplit) earliestSplit = k;
    }
    if (earliestSplit !== Infinity && earliestFit < earliestSplit) {
      a1.push(`${f.path}:${s.slice(0, earliestFit).split("\n").length}`);
    }
  }
  // The detector reads one dialect: a scikit-learn preprocessor fitted before a scikit-learn
  // splitter. Where neither appears, it has examined nothing about this rule, and its silence says
  // nothing about whether preprocessing sees data it should not.
  if (!sawPreprocessor || !sawSplitter) {
    noCoverage(
      "leakage.no-preprocessing-leakage",
      "the fit-before-split check reads scikit-learn preprocessing and splitting calls, and " +
        `this project uses ${sawPreprocessor ? "no recognised splitter" : sawSplitter ? "no recognised preprocessor" : "neither"}`,
    );
  }
  if (a1.length > 0) {
    add("preprocessing-fit-before-split", {
      rule: "leakage.no-preprocessing-leakage",
      severity: "warning",
      message: "A preprocessing transformation is fitted before the split in the same file. Order in a file is a proxy for order in the dataflow, so this is evidence rather than proof.",
      evidence: a1,
    });
  }

  // A2 — a test-named identifier passed to a fit-family call.
  const a2 = [];
  const TEST_IDENT = /\b(X_test|y_test|x_test|test_X|test_y|df_test|test_df|X_holdout|y_holdout)\b/;
  let sawTestIdent = false;
  let sawFitCall = false;
  for (const f of [...codeFiles, ...notebooks]) {
    if (!f.views) continue;
    const s = f.views.structure;
    if (TEST_IDENT.test(s)) sawTestIdent = true;
    for (const m of s.matchAll(/\.fit(?:_transform)?\s*\(([^)]*)\)/g)) {
      sawFitCall = true;
      if (TEST_IDENT.test(m[1])) {
        a2.push(`${f.path}:${s.slice(0, m.index).split("\n").length}`);
        break;
      }
    }
  }
  // Same reasoning as A1. This detector reads a naming convention passed to a fit-family call, so
  // where the convention or the call shape is absent it has no subject, and a project that names its
  // holdout differently — or trains through a loop rather than a `.fit()` — is invisible to it.
  if (!sawTestIdent || !sawFitCall) {
    noCoverage(
      "split.no-test-set-tuning",
      "the test-set-tuning check reads a conventionally test-named object passed to a fit-family " +
        `call, and this project shows ${sawTestIdent ? "no such call" : sawFitCall ? "no such naming convention" : "neither"}`,
    );
  }
  if (a2.length > 0) {
    add("test-identifier-in-fit", {
      rule: "split.no-test-set-tuning",
      severity: "error",
      message: "A conventionally test-named object is passed to a fit-family call. This detects the naming convention only; a test set named otherwise is invisible to it.",
      evidence: a2,
    });
  }

  // A3 — no seed anywhere in a project that does ML.
  if (isML) {
    examine("reproducibility.seeds-recorded");
    const seeded = [...codeFiles, ...notebooks].some(
      (f) => f.views && SEED_SIGNALS.some((sig) => f.views.structure.includes(sig)),
    );
    if (!seeded) {
      add("seed-absence", {
        rule: "reproducibility.seeds-recorded",
        severity: "warning",
        evidenceGap: true,
        message: "No seed-setting expression was found anywhere in the machine-learning code.",
        evidence: mlFootprint,
        remediation: "Set and record a seed for each source of randomness, then verify determinism by running twice.",
      });
    }
  }

  // A4 — declared dependencies that name no exact version.
  const unpinned = [];
  if (files.some((f) => /requirements[^/]*\.txt$|(^|\/)pyproject\.toml$|environment\.ya?ml$/.test(f.path))) {
    examine("reproducibility.dependencies-pinned");
  }
  for (const f of files) {
    if (!f.text) continue;
    if (/^requirements[^/]*\.txt$/.test(f.path) || /\/requirements[^/]*\.txt$/.test(f.path)) {
      for (const raw of f.text.split("\n")) {
        const line = raw.split("#")[0].trim();
        if (!line || line.startsWith("-")) continue;
        if (!/[=<>~!]=|@\s*(git\+|https?:)/.test(line)) unpinned.push(`${f.path}: ${line}`);
        else if (!/==|===|@\s*(git\+|https?:)/.test(line)) unpinned.push(`${f.path}: ${line} (bounded, not pinned)`);
      }
    }
    if (f.path.endsWith("environment.yml") || f.path.endsWith("environment.yaml")) {
      for (const raw of f.text.split("\n")) {
        const line = raw.replace(/^\s*-\s*/, "").split("#")[0].trim();
        if (!line || line.endsWith(":") || line === "dependencies:") continue;
        if (!/[=<>]/.test(line)) unpinned.push(`${f.path}: ${line}`);
      }
    }
  }
  const hasPyproject = has("pyproject.toml");
  const hasPyLock = ["poetry.lock", "uv.lock", "pdm.lock", "requirements.lock"].some(has);
  if (hasPyproject && !hasPyLock) unpinned.push("pyproject.toml: no lockfile committed");
  if (unpinned.length > 0) {
    add("unpinned-dependencies", {
      rule: "reproducibility.dependencies-pinned",
      severity: "error",
      message: `${unpinned.length} declared dependency entr${unpinned.length === 1 ? "y names" : "ies name"} no exact version.`,
      evidence: unpinned,
    });
  }

  // A5 — notebooks carrying committed outputs or out-of-order execution.
  if (notebooks.length > 0) examine("reproducibility.notebook-hygiene");
  const a5 = [];
  for (const f of notebooks) {
    const reasons = [];
    if (f.notebook.withOutputs > 0) reasons.push(`${f.notebook.withOutputs} cell(s) with committed outputs`);
    const counts = f.notebook.counts;
    const monotonic = counts.every((n, i) => i === 0 || n > counts[i - 1]);
    if (counts.length > 1 && !monotonic) reasons.push("execution counts are not in order");
    if (reasons.length > 0) a5.push(`${f.path}: ${reasons.join("; ")}`);
  }
  if (a5.length > 0) {
    add("notebook-state", {
      rule: "reproducibility.notebook-hygiene",
      severity: "warning",
      message: "Notebook state suggests the committed outputs did not come from a clean top-to-bottom run.",
      evidence: a5,
    });
  }

  // A6 — data present, nothing pinning its version.
  if (triggers["data-artifacts"]) {
    examine("data.version-pinned", "data.provenance-documented");
    const pinning = files.filter(
      (f) => f.ext === ".dvc" || /^dvc\.lock$/.test(f.path) || /(^|\/)(data-manifest|datasets?)\.(ya?ml|json)$/.test(f.path) || /\.(sha256|md5)$/.test(f.path),
    );
    // Subject identity, not structural similarity. The first version accepted any artifact call,
    // and the fourth adoption passed a repository with no dataset versioning of any kind because
    // four `wandb.log_artifact` sites logged `type="model"`. Versioning a model is not versioning
    // the data it was trained on: the activity has the same shape and a different subject, and only
    // the subject decides whether the evidence establishes the rule.
    const artifactApi = codeFiles.some((f) => {
      // The module names are identifiers, so they are read from `structure` like any other use.
      if (/\bdvc\.api\b|\bmlflow\.data\b/.test(f.views.structure)) return true;
      // The subject label, though, is a string literal by construction — `type="dataset"` — and
      // `structure` blanks string contents on purpose. This is the same exemption import matching
      // already takes: read `source`, where comments are still stripped, so a call is a call and
      // prose about one is not.
      for (const m of f.views.source.matchAll(/\b(use_artifact|log_artifact)\s*\(([^)]*)\)/g)) {
        if (/dataset/i.test(m[2])) return true;
      }
      return false;
    });
    if (pinning.length === 0 && !artifactApi) {
      add("dataset-manifest-missing", {
        rule: "data.version-pinned",
        severity: "error",
        evidenceGap: true,
        message: "Data artifacts are present and nothing pins their version.",
        evidence: dataArtifacts,
        remediation: "Add a manifest, lockfile, or checksum set beside the data, and cite the identifier from the experiment records.",
      });
    }
  }

  // A7 — training code present, no experiment configuration.
  if (isML) {
    examine("reproducibility.experiment-config-recorded");
    // Same subject test as A6. `mlflow.start_run` opens a run and `wandb.init` opens a session;
    // neither records a parameter set, and the rule asks for the parameters. What establishes the
    // rule is a call that actually writes them — a logged parameter, a config handed to the tracker,
    // or a configuration framework that owns the parameters by construction.
    const callShapedTracking = codeFiles.some((f) => {
      const s = f.views.structure;
      if (/mlflow\.log_params?\b|\bwandb\.config\b|@hydra\.main|hydra\.initialize/.test(s)) return true;
      for (const m of s.matchAll(/\b(wandb\.init|mlflow\.start_run)\s*\(([^)]*)\)/g)) {
        if (/\bconfig\s*=/.test(m[2])) return true;
      }
      return false;
    });
    if (configArtifacts.length === 0 && !callShapedTracking) {
      add("experiment-config-missing", {
        rule: "reproducibility.experiment-config-recorded",
        severity: "error",
        evidenceGap: true,
        message: "Training code is present and no experiment configuration artifact was found.",
        evidence: mlFootprint,
        remediation: "Record the full parameter set per run in a configuration file or an experiment-tracking tool.",
      });
    }
  }

  // Document checks.
  //
  // Two rules govern all of them, and both exist because of an observed failure.
  //
  // Headings, not word occurrences: a heading is a structural claim about a document's contents,
  // and matching prose would let any passing mention satisfy a rule that asks for a section.
  //
  // And a heading is not enough on its own. `standards init` writes these very documents, and in
  // the first adoption its placeholders flipped three required rules to passed on a project where
  // nothing had been done. A section only answers a rule when it carries the scaffold marker no
  // longer and says something (invariant.no-self-satisfying-scaffolding, scripts/scaffolding.mjs).
  const docs = files.filter((f) => f.ext === ".md" && f.text);
  const named = (re) => docs.filter((f) => re.test(f.path));
  const shippedTemplates = repo.templates ?? [];

  /**
   * Resolve a document-shaped rule. `candidates` are the documents whose name marks them as the
   * right place to look; when none is named, every markdown file is a candidate, because a project
   * may answer the question inside a README.
   */
  const documentCheck = ({ id, rule, nameRe, headingRe, message, remediation, evidence }) => {
    const candidates = nameRe && named(nameRe).length > 0 ? named(nameRe) : docs;
    const verdict = anyDocumentAnswers(candidates, headingRe, shippedTemplates);
    if (verdict.satisfied) return;
    // Distinguish "you have no card" from "your card is still the template". They are different
    // pieces of work, and reporting them identically sends the reader to the wrong one.
    const scaffolded = verdict.reasons.filter((r) => /still the generated template|placeholder/.test(r));
    add(id, {
      rule,
      severity: "error",
      evidenceGap: true,
      message: scaffolded.length > 0
        ? `${message} A generated template is present but has not been completed, and scaffolding does not satisfy the rule it was written to help you meet.`
        : message,
      evidence: verdict.reasons.length > 0 ? verdict.reasons : evidence,
      remediation,
    });
  };

  if (isML || triggers["deployment-surface"]) {
    examine("deployment.model-card");
    documentCheck({
      id: "model-card-missing",
      rule: "deployment.model-card",
      nameRe: /(^|\/)(MODEL_CARD|model-card)\.md$|^docs\/.*model.*card.*\.md$/i,
      headingRe: /^##+\s*(Model card|Limitations|Intended use)\s*$/i,
      message: "No completed model card was found.",
      evidence: docs.slice(0, 5).map((f) => f.path),
      remediation: "Add MODEL_CARD.md covering intended use, training data, evaluation with a baseline and segment breakdown, and limitations — and fill it in.",
    });
  }

  if (triggers["data-artifacts"]) {
    documentCheck({
      id: "data-card-missing",
      rule: "data.provenance-documented",
      nameRe: /(^|\/)(DATASET|DATA_CARD|dataset-card|data-card)\.md$/i,
      headingRe: /^##+\s*(Provenance|Collection|Exclusions)\s*$/i,
      message: "Data artifacts are present and no completed provenance documentation was found.",
      evidence: dataArtifacts,
      remediation: "Add a dataset card covering origin, collection, population, and an exclusions section with counts and proportions.",
    });
  }

  if (isML) {
    examine("evaluation.baseline-exists");
    const evaluationDocs = docs.filter((f) => !isScaffold(f.text) && isSubstantive(sectionBody(f.text, /^##+\s*(Evaluation|Results|Performance)\s*$/i)));
    if (evaluationDocs.length === 0) {
      // No completed evaluation document at all. Previously this made the rule silent, and a silent
      // rule in the evaluated set reports as passed — so a project with no evaluation write-up was
      // credited with having a baseline. Absence of the place a baseline would be recorded is
      // absence of evidence, not evidence of a baseline (invariant.no-silent-pass).
      add("evaluation-results-undocumented", {
        rule: "evaluation.baseline-exists",
        severity: "error",
        evidenceGap: true,
        message: "Training code is present and no completed evaluation write-up was found, so there is nowhere a baseline could have been reported.",
        evidence: mlFootprint,
        remediation: "Record the evaluation — the metric, the split, and the baseline it is compared against — in a model card or an evaluation document.",
      });
    } else {
      const baseline = evaluationDocs.some((f) => {
        const section = sectionBody(f.text, /^##+\s*Baseline/i);
        if (section !== null && isSubstantive(section)) return true;
        // A baseline row in a results table also counts — but only when the row carries a result.
        const row = f.text.split("\n").find((l) => /^\s*\|\s*[^|]*baseline/i.test(l));
        return row !== undefined && isSubstantive(row);
      });
      if (!baseline) {
        add("baseline-section-missing", {
          rule: "evaluation.baseline-exists",
          severity: "error",
          evidenceGap: true,
          message: "Evaluation results are documented with no baseline result to compare against.",
          evidence: evaluationDocs.map((f) => f.path),
          remediation: "Add the baseline, evaluated on the same split and metric, with its score, to the results.",
        });
      }
    }
  }

  if (repo.truncated) {
    add("scan-truncated", {
      severity: "warning",
      label: "UNKNOWN",
      message: `The scan stopped at ${MAX_FILES} files. Coverage below is incomplete, and a clean result does not describe the whole repository.`,
      evidence: [],
    });
  }

  return { findings, triggers, examined: [...examined], coverageGaps: [...coverageGaps] };
}

// ---------------------------------------------------------------------------
// Attestation digests.
// ---------------------------------------------------------------------------

async function attestationDigests(root, policy) {
  const digests = new Map();
  for (const [ruleId, attestation] of Object.entries(policy?.attestations ?? {})) {
    const paths = attestation.reviewedAgainst?.paths;
    if (!Array.isArray(paths) || paths.length === 0) continue;
    const hash = createHash("sha256");
    for (const rel of [...paths].sort()) {
      hash.update(rel);
      try {
        hash.update(await readFile(path.join(root, rel)));
      } catch {
        // A reviewed path that no longer exists is itself a change to what was reviewed, and must
        // move the digest rather than being skipped.
        hash.update("<missing>");
      }
    }
    digests.set(ruleId, hash.digest("hex").slice(0, 32));
  }
  return digests;
}

// ---------------------------------------------------------------------------
// Loading.
// ---------------------------------------------------------------------------

async function loadPolicy(root) {
  const file = path.join(root, "project-policy.yml");
  if (!existsSync(file)) return { policy: null, error: `no project-policy.yml in ${root}` };
  let parsed;
  try {
    parsed = parseYaml(await readFile(file, "utf8"));
  } catch (err) {
    return { policy: null, error: `project-policy.yml could not be parsed — ${err.message}` };
  }
  const schema = JSON.parse(await readFile(path.join(HERE, "schemas/project-policy.schema.json"), "utf8"));
  assertSchemaSupported(schema);
  const errors = validate(parsed, schema);
  if (errors.length > 0) {
    return { policy: null, error: `project-policy.yml does not satisfy the schema: ${errors.map((e) => `${e.path || "(root)"} ${e.message}`).join("; ")}` };
  }
  return { policy: parsed, error: null };
}

async function integrityFindings() {
  const baselinePath = path.join(HERE, "artifacts/catalog-baseline.json");
  if (!existsSync(baselinePath)) return [];
  const catalog = await loadCatalog();
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  return checkIntegrity(catalog, baseline).findings.map((f) => ({
    rule: "invariant.standards-integrity",
    message: f.message,
    evidence: ["rules/", "artifacts/catalog-baseline.json"],
    remediation: f.remediation,
  }));
}

// ---------------------------------------------------------------------------
// Commands.
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { command: null, target: null, json: false, strict: false, dryRun: false, overwrite: [], subject: null, includeUnowned: false };
  for (const arg of argv) {
    if (COMMANDS.has(arg) && !args.command) args.command = arg;
    else if (arg === "--json") args.json = true;
    else if (arg === "--strict") args.strict = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--include-unowned") args.includeUnowned = true;
    else if (arg === "--all") args.subject = "--all";
    else if (arg.startsWith("--force-overwrite=")) args.overwrite.push(arg.slice("--force-overwrite=".length));
    else if (arg.startsWith("--dir=")) args.target = path.resolve(arg.slice("--dir=".length));
    else if (!arg.startsWith("--")) {
      if (args.command === "explain" && !args.subject) args.subject = arg;
      else if (!args.target) args.target = path.resolve(arg);
    }
  }
  args.target ??= process.cwd();
  return args;
}

const USAGE = `Usage: standards <init|scan|evaluate|explain|status> [path] [flags]

  init       Bootstrap a project. Creates missing artifacts; never replaces an existing
             one without an explicit per-path opt-in.
  scan       Evidence discovery. What this project has, and where it departs from the
             standards. Needs no policy; never produces a verdict.
  evaluate   The verdict. Loads project-policy.yml, applies invariants, applicability,
             exceptions and attestations, and reports the authoritative status.
  explain    Why a rule applies here, what evidence would demonstrate compliance, how it
             is verified, and what a pass does not prove.
  status     Decision freshness: stale attestations, expiring exceptions, and
             applicability contradicted by what the scan now observes.

  --dry-run                  init only: report what would happen, write nothing.
  --force-overwrite=<path>   init only: approve replacing one existing file.
  --json                     emit the structured report instead of the readable one.
  --dir=<path>               target a directory other than the one given positionally.
  --strict                   scan only: exit 1 when any finding needs attention.
  --include-unowned          evaluate dependency, environment and generated trees too. Off by
                             default: a project is judged on the code it owns, and reading a
                             vendored library reports that code as the project's own work.

Exit 0 ok, 1 findings or non-compliant, 2 invocation or configuration error,
3 blocked by an invariant. Gate CI on \`evaluate\`.`;

async function cmdScan(args) {
  const repo = await readRepo(args.target, { includeUnowned: args.includeUnowned });
  const { findings, triggers } = detect(repo);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      project: path.basename(args.target),
      scannedAt: new Date().toISOString(),
      filesScanned: repo.fileCount,
      scope: { basis: repo.scope.basis, note: repo.scope.note, unownedTreesSkipped: repo.excluded },
      triggers,
      findings,
    }, null, 2) + "\n");
  } else {
    const out = [
      `Scan: ${args.target}`,
      `  ${repo.fileCount} file(s) examined  (scope: ${repo.scope.basis})`,
      `  ${repo.scope.note}`,
      ...(repo.excluded > 0
        ? [`  A further ${repo.excluded} owned path(s) were held out as fixtures or vendored trees.`]
        : []),
      "",
    ];
    if (findings.length === 0) {
      out.push("  Nothing observed. This is evidence discovery, not a verdict — run `standards evaluate`.");
    } else {
      for (const f of findings) {
        out.push(`  [${f.severity}] ${f.id} (${f.label})`);
        out.push(`    ${f.message}`);
        if (f.rule) out.push(`    rule: ${f.rule}`);
        for (const e of f.evidence.slice(0, 5)) out.push(`      ${e}`);
        if (f.evidence.length > 5) out.push(`      ... and ${f.evidence.length - 5} more`);
      }
      out.push("");
      out.push("  Findings are evidence, not a verdict. `standards evaluate` applies the policy.");
    }
    process.stdout.write(out.join("\n") + "\n");
  }

  if (!args.strict) return EXIT_OK;
  return findings.some((f) => f.severity !== "info") ? EXIT_FINDINGS : EXIT_OK;
}

async function buildVerdict(args) {
  const catalog = await loadCatalog();
  assertBindings(catalog, EVALUATED_RULES);

  const { policy, error } = await loadPolicy(args.target);
  if (error) return { error };

  const repo = await readRepo(args.target, { includeUnowned: args.includeUnowned });
  const { findings, triggers, examined, coverageGaps } = detect(repo);
  assertBindings(catalog, findings.filter((f) => f.rule).map((f) => f.rule));
  assertBindings(catalog, examined);

  const digests = await attestationDigests(args.target, policy);
  const today = new Date().toISOString().slice(0, 10);

  const verdict = evaluate({
    catalog,
    policy,
    findings,
    // What actually ran here, not what could run somewhere. A detector gated behind a trigger that
    // did not fire examined nothing, and a rule nothing examined is not a rule that passed.
    evaluated: examined,
    coverageGaps,
    invariantFindings: await integrityFindings(),
    today,
    digests,
  });

  return { catalog, policy, verdict, triggers, digests, repo };
}

async function cmdEvaluate(args) {
  const built = await buildVerdict(args);
  if (built.error) {
    process.stderr.write(`evaluate: ${built.error}\n\nNothing was evaluated. This is a configuration error, not a compliance result.\n`);
    return EXIT_INVOCATION;
  }
  const { catalog, policy, verdict } = built;

  const report = envelope({
    verdict,
    project: policy.project ?? path.basename(args.target),
    standardVersion: policy.standardVersion,
    evaluatedAt: new Date().toISOString(),
    frameworkCoverage: coverage(catalog, { evaluated: EVALUATED_RULES, totalStandards: 25 }),
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const c = report.frameworkCoverage;
    const a = report.assurance;
    const out = [
      `Compliance: ${report.project}`,
      `  Status: ${report.status}`,
      report.status === STATUS.BLOCKED_BY_INVARIANT
        ? "  Score:  not computed — an invariant fired, so this evaluation is not a measurement"
        : `  Score:  ${report.score === null ? "n/a" : report.score + "%"}  (${verdict.denominator.basis}: ${verdict.denominator.scored})`,
      `  Rules:  ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warning(s), ${report.summary.skipped} skipped`,
      `  Cover:  ${a.automated} automated, ${a.manualReview} attested, ${a.insufficientEvidence} insufficient evidence, ${a.notEvaluated} not evaluated`,
      "",
      `  Framework: ${c.evaluatedRules} of ${c.rules} rules are machine-examined, across ${c.standardsWithRules} of ${c.totalStandards} standards.`,
      `  Coverage sits beside the verdict and never inside it: a clean status means everything`,
      `  checked passed, not that everything was checked.`,
    ];

    const failures = verdict.results.filter((r) => r.status === "failed" || r.status === "warning");
    if (failures.length > 0) {
      out.push("", "  Findings:");
      for (const r of failures) {
        out.push(`    [${r.status}] ${r.ruleId} (${r.disposition})`);
        out.push(`      ${r.message}`);
        out.push(`      → ${r.remediation}`);
      }
    }

    if (verdict.evidenceRequests.length > 0) {
      out.push("", `  Evidence requested (${verdict.evidenceRequests.length}):`);
      const gaps = verdict.evidenceRequests.filter((r) => r.disposition === "insufficient-evidence");
      const judgement = verdict.evidenceRequests.filter((r) => r.disposition === "not-evaluated");
      if (gaps.length > 0) {
        out.push(`    Evidence that can be produced (${gaps.length}):`);
        for (const r of gaps.slice(0, 10)) out.push(`      ${r.rule} — ${r.needs}`);
        if (gaps.length > 10) out.push(`      ... and ${gaps.length - 10} more`);
      }
      if (judgement.length > 0) {
        out.push(`    Requires human judgement, no mechanism can establish it (${judgement.length}):`);
        for (const r of judgement.slice(0, 10)) out.push(`      ${r.rule} — ${r.needs}`);
        if (judgement.length > 10) out.push(`      ... and ${judgement.length - 10} more`);
      }
    }

    for (const [ruleId, digest] of built.digests) {
      const att = policy.attestations?.[ruleId];
      if (att && !att.reviewedAgainst?.digest) {
        out.push("", `  attestation ${ruleId}: current digest is ${digest}`);
        out.push("    Record it as reviewedAgainst.digest so the approval expires when the material changes.");
      }
    }

    process.stdout.write(out.join("\n") + "\n");
  }

  if (report.status === STATUS.BLOCKED_BY_INVARIANT) return EXIT_BLOCKED;
  if (report.status === STATUS.NOT_EVALUATED) return EXIT_INVOCATION;
  if (report.status === STATUS.NON_COMPLIANT) return EXIT_FINDINGS;
  return EXIT_OK;
}

/**
 * Resolve a rule to the file and heading anchor that define it.
 *
 * The inventory already maps a standard number to its filename, so the path is looked up rather
 * than guessed. Version one printed `standards/15-*.md`, which reads fine to a person and is
 * useless to an agent — the first adoption found it being handed exactly that.
 *
 * The anchor is derived the way a Markdown renderer derives it, including the double hyphen an em
 * dash leaves behind, and it is verified against the file rather than assumed.
 */
async function standardLocator() {
  let inventory;
  try {
    inventory = JSON.parse(await readFile(path.join(HERE, "artifacts/standards-source-inventory.json"), "utf8"));
  } catch {
    return () => null;
  }
  const byNumber = new Map(inventory.standards.map((s) => [s.number, s.implementedBy]));
  const headings = new Map();

  return (rule) => {
    if (!rule.standard || !rule.requirement) return null;
    const file = byNumber.get(rule.standard);
    if (!file || !existsSync(path.join(HERE, file))) return null;

    if (!headings.has(file)) {
      const text = readFileSyncSafe(path.join(HERE, file));
      const map = new Map();
      for (const m of text.matchAll(/^### ((?:R|P)\d+) — (.+)$/gm)) {
        map.set(m[1], slugify(`${m[1]} — ${m[2]}`));
      }
      headings.set(file, map);
    }
    const anchor = headings.get(file).get(rule.requirement);
    return anchor ? { path: file, anchor } : { path: file, anchor: null };
  };
}

/** The templates this framework ships, read once so a detector can recognise its own output. */
let TEMPLATE_CACHE = null;
function shippedTemplateBodies() {
  if (TEMPLATE_CACHE) return TEMPLATE_CACHE;
  const dir = path.join(HERE, "templates");
  TEMPLATE_CACHE = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => readFileSyncSafe(path.join(dir, f)))
    : [];
  return TEMPLATE_CACHE;
}

function readFileSyncSafe(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** GitHub-flavoured heading slug: lowercase, strip punctuation, spaces to hyphens. */
function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function cmdExplain(args) {
  const catalog = await loadCatalog();
  if (!args.subject) {
    process.stderr.write("explain: name a rule id, standard-N, or --all\n");
    return EXIT_INVOCATION;
  }

  let rules;
  if (args.subject === "--all") rules = [...catalog.rules.values(), ...catalog.invariants.values()];
  else if (/^standard-\d+$/.test(args.subject)) {
    const n = Number(args.subject.slice("standard-".length));
    rules = [...catalog.rules.values()].filter((r) => r.standard === n);
    if (rules.length === 0) {
      process.stderr.write(`explain: no catalog rule formalises standard ${n}. The standard's requirements are prose; read standards/ directly.\n`);
      return EXIT_INVOCATION;
    }
  } else {
    const rule = resolve(catalog, args.subject);
    if (!rule) {
      process.stderr.write(`explain: the catalog defines no rule "${args.subject}"\n`);
      return EXIT_INVOCATION;
    }
    rules = [rule];
  }

  const { policy } = await loadPolicy(args.target);
  const repo = existsSync(args.target) ? await readRepo(args.target, { includeUnowned: args.includeUnowned }) : null;
  const triggers = repo ? detect(repo).triggers : {};
  const locate = await standardLocator();

  if (args.json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      explanations: rules.map((r) => explainOne(r, policy, triggers, locate)),
    }, null, 2) + "\n");
    return EXIT_OK;
  }

  const out = [];
  for (const rule of rules) {
    const e = explainOne(rule, policy, triggers, locate);
    out.push(`${rule.id}  [${rule.kind}, ${rule.level}]`);
    out.push(`  ${rule.title}`);
    if (e.location) out.push(`  Standard ${rule.standard} ${rule.requirement} — ${e.location.path}#${e.location.anchor}`);
    out.push(`  Applies here: ${e.applicability.verdict}`);
    out.push(`    ${e.applicability.why}`);
    out.push(`  Evidence that demonstrates compliance:`);
    out.push(`    ${rule.evidenceExpected}`);
    out.push(`  How it is verified: ${rule.verification} (assurance: ${rule.assurance})`);
    if (rule.$assuranceNote) out.push(`    ${rule.$assuranceNote}`);
    out.push(`  Remediation: ${rule.remediation}`);
    if (rule.nonExemptible) out.push(`  Non-exemptible: ${rule.$exemptibilityNote}`);
    out.push("");
  }
  process.stdout.write(out.join("\n"));
  return EXIT_OK;
}

function explainOne(rule, policy, triggers, locate = () => null) {
  const declared = policy?.applicability?.[rule.id];
  const fired = (rule.triggers ?? []).filter((t) => triggers[t]);
  let verdict;
  let why;
  if (rule.kind === "invariant") {
    verdict = "always";
    why = "Invariants are system-level and are not project-adjustable; a policy may not address this rule at all.";
  } else if (declared?.status === "not-applicable") {
    verdict = "no — declared not-applicable";
    why = `${declared.reason}${fired.length > 0 ? ` However, the scan observed ${fired.join(", ")}, which contradicts the declaration and should be revisited.` : ""}`;
  } else if (fired.length > 0) {
    verdict = "yes";
    why = `The scan observed ${fired.join(", ")}, which is what this rule is about.`;
  } else if ((rule.triggers ?? []).length === 0) {
    verdict = "yes";
    why = "This rule has no applicability trigger; it applies wherever the framework is adopted.";
  } else {
    verdict = "undetermined";
    why = `None of this rule's triggers (${(rule.triggers ?? []).join(", ")}) fired. Declare applicability explicitly in project-policy.yml rather than leaving it to inference.`;
  }
  return {
    rule: rule.id,
    kind: rule.kind,
    standard: rule.standard ?? null,
    requirement: rule.requirement ?? null,
    // A concrete path and anchor, never a glob. An agent cannot open standards/15-*.md, and the
    // first adoption found it being told to.
    location: locate(rule),
    applicability: { verdict, why, declared: declared ?? null, triggersFired: fired },
    evidenceExpected: rule.evidenceExpected,
    verification: rule.verification,
    assurance: rule.assurance,
    assuranceNote: rule.$assuranceNote ?? null,
    remediation: rule.remediation,
    nonExemptible: rule.nonExemptible,
  };
}

async function cmdStatus(args) {
  const built = await buildVerdict(args);
  if (built.error) {
    process.stderr.write(`status: ${built.error}\n`);
    return EXIT_INVOCATION;
  }
  const { policy, verdict, triggers, digests } = built;
  const today = new Date().toISOString().slice(0, 10);
  const items = [];

  for (const [ruleId, att] of Object.entries(policy.attestations ?? {})) {
    if (att.expires && att.expires < today) {
      items.push({ kind: "expired-attestation", rule: ruleId, detail: `expired on ${att.expires}`, action: "Re-review and record a fresh attestation." });
    }
    const recorded = att.reviewedAgainst?.digest;
    const current = digests.get(ruleId);
    if (recorded && current && recorded !== current) {
      items.push({ kind: "stale-attestation", rule: ruleId, detail: `the reviewed files have changed since ${att.reviewedAt}`, action: `Re-review, then record digest ${current}.` });
    }
    if (!recorded && current) {
      items.push({ kind: "unpinned-attestation", rule: ruleId, detail: "no digest recorded, so this approval cannot go stale", action: `Record reviewedAgainst.digest as ${current}.` });
    }
  }

  for (const entry of policy.exceptions ?? []) {
    if (entry.expires && entry.expires < today) {
      items.push({ kind: "expired-exception", rule: entry.rule, detail: `expired on ${entry.expires}`, action: "Renew with a fresh approval, or satisfy the rule." });
    }
  }

  for (const [ruleId, decl] of Object.entries(policy.applicability ?? {})) {
    if (decl.status !== "not-applicable") continue;
    const rule = built.catalog.rules.get(ruleId);
    const fired = (rule?.triggers ?? []).filter((t) => triggers[t]);
    if (fired.length > 0) {
      items.push({
        kind: "applicability-drift",
        rule: ruleId,
        detail: `declared not-applicable, but the scan now observes ${fired.join(", ")}`,
        action: decl.revisitWhen ? `The recorded revisit condition was: ${decl.revisitWhen}` : "Re-review the declaration.",
      });
    }
  }

  const outstanding = verdict.evidenceRequests.length;

  if (args.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, checkedAt: new Date().toISOString(), items, outstandingEvidenceRequests: outstanding }, null, 2) + "\n");
  } else {
    const out = [`Decision freshness: ${policy.project ?? path.basename(args.target)}`, ""];
    if (items.length === 0) {
      out.push("  No decision has gone stale. Every attestation matches the material it reviewed,");
      out.push("  no exception has lapsed, and no applicability declaration is contradicted by the scan.");
    } else {
      for (const item of items) {
        out.push(`  ${item.kind}: ${item.rule}`);
        out.push(`    ${item.detail}`);
        out.push(`    → ${item.action}`);
      }
    }
    out.push("", `  Outstanding evidence requests: ${outstanding} (see \`standards evaluate\`).`);
    process.stdout.write(out.join("\n") + "\n");
  }

  return items.length > 0 ? EXIT_FINDINGS : EXIT_OK;
}

async function cmdInit(args) {
  const p = await initPlan(args.target, { overwrite: args.overwrite, templatesRoot: HERE });
  if (!args.dryRun) await initApply(p);

  if (args.json) {
    process.stdout.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, dryRun: args.dryRun, ...p }, null, 2) + "\n");
  } else {
    process.stdout.write(renderPlan(p, args.dryRun) + "\n");
  }
  return p.actions.some((a) => a.action === "conflict") ? EXIT_FINDINGS : EXIT_OK;
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command) {
    process.stdout.write(USAGE + "\n");
    return EXIT_INVOCATION;
  }
  try {
    switch (args.command) {
      case "scan": return await cmdScan(args);
      case "evaluate": return await cmdEvaluate(args);
      case "explain": return await cmdExplain(args);
      case "status": return await cmdStatus(args);
      case "init": return await cmdInit(args);
      default: process.stdout.write(USAGE + "\n"); return EXIT_INVOCATION;
    }
  } catch (err) {
    if (err instanceof CatalogError || err instanceof YamlError) {
      process.stderr.write(`${args.command}: ${err.message}\n`);
      return EXIT_INVOCATION;
    }
    throw err;
  }
}

if (process.argv[1]?.endsWith("standards.mjs")) {
  process.exit(await main());
}
