/**
 * Scope: evaluate the code a project owns, not the code it merely contains.
 *
 * WHY THIS EXISTS. Across three adoptions the scanner read code the target did not write, and
 * reported it as the target's. On one repository every single leakage finding — twelve of twelve —
 * was inside scikit-learn's own test suite in a committed virtualenv. On another, 79 of 86 evidence
 * entries pointed at disposable agent worktrees. On a third, the project tracked 41 files and the
 * scanner read 20,000 and did not finish.
 *
 * The controlled comparison is what makes this a scope defect rather than a detector defect: given
 * only owned code, the same three code-analysis detectors produced zero false positives.
 *
 * WHY NOT A LONGER SKIP LIST. `test-env-3.11` is not a name anyone would have predicted, and the
 * next ecosystem will invent another. A skip list is a standing guess that trails reality. A
 * repository already states what it owns, in a file written for exactly that purpose, so the
 * primary mechanism asks git and the heuristics are only the fallback for targets that are not
 * repositories.
 *
 * The escape hatch is explicit: `--include-unowned` evaluates everything, for the case where
 * vendored code genuinely is the product being assessed. It is a flag rather than a default because
 * the failure it enables is silent.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Directory names that are never a project's own work, whatever ecosystem produced them.
 * Used only when git cannot answer.
 */
const UNOWNED_DIRS = new Set([
  // Version control and agent scratch space
  ".git", ".hg", ".svn", "worktrees",
  // Dependency trees
  "node_modules", "site-packages", "dist-packages", "vendor", "bower_components", "Pods",
  // Python environments — see also the pyvenv.cfg probe below
  ".venv", "venv", "env", "virtualenv", "conda-meta",
  // Caches and tool state
  "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox", ".nox", ".eggs",
  ".ipynb_checkpoints", ".cache", ".gradle", ".idea", ".vscode", ".turbo",
  // Build and generated output
  "dist", "build", "out", "target", ".next", ".nuxt", "htmlcov", "coverage", "catboost_info",
  "lightning_logs", "wandb", "mlruns", "outputs", "checkpoints",
]);

/** Path fragments that mark a tree as not the project's own, wherever they appear. */
const UNOWNED_FRAGMENTS = [/(^|\/)site-packages(\/|$)/, /(^|\/)node_modules(\/|$)/, /\.egg-info(\/|$)/, /(^|\/)\.claude\/worktrees(\/|$)/];

/**
 * Is this directory the root of a Python virtual environment?
 *
 * Detected by structure rather than by name, because the names are unbounded — the adoption that
 * exposed this used `test-env-3.11`, which no list would have contained.
 */
export function isVirtualenv(dir) {
  return (
    existsSync(path.join(dir, "pyvenv.cfg")) ||
    existsSync(path.join(dir, "Lib", "site-packages")) ||
    existsSync(path.join(dir, "lib", "python3")) ||
    (existsSync(path.join(dir, "bin", "activate")) && existsSync(path.join(dir, "lib")))
  );
}

/** Is this a nested repository or worktree — code with its own history, not this project's? */
export function isNestedCheckout(dir, root) {
  if (path.resolve(dir) === path.resolve(root)) return false;
  return existsSync(path.join(dir, ".git"));
}

/** Heuristic ownership test for a path relative to the target root. */
export function isUnownedPath(rel) {
  if (UNOWNED_FRAGMENTS.some((re) => re.test(rel))) return true;
  return rel.split("/").some((segment) => UNOWNED_DIRS.has(segment));
}

/** Run `git ls-files` with the given selectors, returning null when git declines. */
function gitLsFiles(root, selectors) {
  let result;
  try {
    result = spawnSync("git", ["-C", root, "ls-files", "-z", ...selectors, "--exclude-standard"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (err) {
    return { files: null, why: `git could not be run (${err.message})` };
  }
  if (result.error) return { files: null, why: `git could not be run (${result.error.message})` };
  if (result.status !== 0) {
    // Git declined, and the reason matters. "Not a repository" and "this repository is refused by
    // your safe.directory settings" lead to different actions, and reporting the second as the
    // first tells an operator something untrue about their own project. Observed on a real target.
    const reason = (result.stderr || "").trim().split("\n")[0] || `git exited ${result.status}`;
    return { files: null, why: reason };
  }
  return { files: (result.stdout ?? "").split("\0").filter(Boolean), why: null };
}

/**
 * Is this path inside a Python virtual environment somewhere above it?
 *
 * Only needed for untracked files. Tracked files are the project's own by definition; untracked
 * ones arrive without that guarantee, and an environment that nobody remembered to ignore is
 * exactly the tree the ownership model exists to keep out.
 */
function insideVirtualenv(root, rel, memo) {
  const parts = rel.split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    const dirRel = parts.slice(0, i).join("/");
    if (!memo.has(dirRel)) memo.set(dirRel, isVirtualenv(path.join(root, dirRel)));
    if (memo.get(dirRel)) return true;
  }
  return false;
}

/**
 * Ask git what this project owns: what it tracks, plus the work in progress beside it.
 *
 * WHY NOT `--cached` ALONE. The first version asked only for tracked files, which equates "owned"
 * with "committed". The fourth adoption showed what that costs: `standards init` writes a policy and
 * four documents, all untracked, so the documented workflow — init, edit, evaluate — reported that
 * the documents the operator had just written did not exist. Staging them, with no change to their
 * contents, moved a rule from insufficient-evidence to passed. Identical evidence, different answer.
 *
 * Owned project content is tracked files *plus* relevant untracked ones, and "relevant" excludes
 * everything the heuristics already know is nobody's own work. Ignored trees never appear at all:
 * `--exclude-standard` applies .gitignore, which is the project's own statement about what it
 * disowns. The structural filters catch the rest — an environment or a nested checkout that was
 * never added to .gitignore is still not the project's code.
 */
export function gitOwnedFiles(root) {
  const tracked = gitLsFiles(root, ["--cached"]);
  if (!tracked.files) return { files: null, tracked: 0, untracked: 0, why: tracked.why };
  const others = gitLsFiles(root, ["--others"]);
  const memo = new Map();
  const relevant = (others.files ?? []).filter(
    (rel) => !isUnownedPath(rel) && !insideVirtualenv(root, rel, memo),
  );
  const files = [...new Set([...tracked.files, ...relevant])];
  // A repository with nothing tracked and nothing untracked is a real state, but it is
  // indistinguishable here from a failure mode, and guessing wrong in that direction hides
  // everything. Fall back.
  if (files.length === 0) return { files: null, tracked: 0, untracked: 0, why: "the repository holds no files git will report" };
  return { files, tracked: tracked.files.length, untracked: relevant.length, why: null };
}

/**
 * Decide the scan's scope, and say how the decision was made.
 *
 * The `basis` is carried into the report because a reader deciding how much to trust a clean result
 * needs to know what was looked at. "Nothing was found" means something different when the scope
 * was 41 tracked files than when it was a heuristic sweep of a directory tree.
 */
export function resolveScope(root, { includeUnowned = false } = {}) {
  if (includeUnowned) {
    return {
      basis: "everything",
      note: "--include-unowned was given: dependency, environment and generated trees are being evaluated as though the project owned them.",
      tracked: null,
    };
  }
  const { files, tracked, untracked, why } = gitOwnedFiles(root);
  if (files) {
    return {
      basis: "git-owned",
      note:
        `Scope is the ${files.length} file(s) this repository owns — ${tracked} tracked and ` +
        `${untracked} untracked but not ignored. Ignored trees, environments, dependency trees, ` +
        "caches and generated output were not read.",
      tracked: new Set(files.map((f) => f.split(path.sep).join("/"))),
    };
  }
  return {
    basis: "heuristic",
    note:
      `Scope was decided by structure rather than by git, because ${why}. ` +
      "Virtual environments, dependency trees, nested checkouts, caches and build output were skipped, " +
      "but this is an approximation of what the project owns rather than an answer from it.",
    tracked: null,
  };
}
