#!/usr/bin/env node
/**
 * The authoritative CI pipeline for this repository.
 *
 * There is exactly one definition of "what CI runs", and this is it. The Docker entry points
 * (scripts/ci.ps1, scripts/ci.sh) and the GitHub workflow (.github/workflows/ci.yml) both invoke
 * this file. Neither of them holds a second copy of the stage list, because a second copy is a
 * thing that drifts, and a CI definition that has drifted from the one developers run locally is
 * worse than no local CI at all — it produces confident green on the wrong pipeline.
 *
 * The individual commands are not defined here either. Each stage names an npm script, and this
 * file resolves that name against package.json at run time. package.json stays the single
 * definition of every command; this file stays the single definition of the ordered set of gates.
 * A stage naming a script package.json does not define is an invocation error, not a skipped
 * check, and test/local-ci.test.mjs asserts the two agree.
 *
 * Zero third-party dependencies, Node builtins only, consistent with the rest of the repository
 * (design/architecture.md §12). CI has no install step, so a dependency here would break the
 * build — which is the enforcement mechanism, not an inconvenience.
 *
 * Exit 0 when every stage passes, 1 when any stage fails, 2 on invocation error.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_INVOCATION = 2;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The gates, in order.
 *
 * `script` names an entry in package.json's `scripts`. `verify` stages run in this process because
 * what they assert is a property of another command's output rather than of its exit code.
 *
 * Ordering is cheapest-and-most-fundamental first: a broken source enumeration makes every later
 * result meaningless, so there is no point spending a test run to discover it.
 */
export const STAGES = [
  {
    id: "commit-provenance",
    title: "Commit provenance",
    verify: verifyCommitProvenance,
    why: "The container must be able to say which commit it actually examined, and it must agree "
       + "with the commit the caller believes it submitted. This is the stage that makes the "
       + "exact-commit invariant checkable from inside the isolation boundary rather than only "
       + "asserted from outside it.",
  },
  {
    id: "dependency-freedom",
    title: "Dependency freedom",
    verify: verifyDependencyFreedom,
    why: "This repository's supply-chain control is that it has no supply chain. The GitHub "
       + "workflow enforced that implicitly, by having no install step: a dependency would break "
       + "the build eventually, somewhere, with a confusing error. Stated as a gate it fails "
       + "immediately and says why.",
  },
  { id: "inventory",  title: "Source inventory",     script: "inventory",
    why: "The committed enumeration of the 25 source items is the spine everything else binds to." },
  { id: "fidelity",   title: "Source fidelity",      script: "fidelity",
    why: "Every 'reproduced verbatim' claim in standards/ must still match the source spec." },
  { id: "levels",     title: "Level agreement",      script: "levels",
    why: "The third provenance link, and the one that had no guard. inventory locks the spec's "
       + "enumeration and fidelity holds prose to the spec; integrity holds the catalog to its "
       + "baseline. Nothing compared a standard's own normative sentence to its catalog entry's "
       + "kind, which is how five rules said MUST in prose while the framework only warned, from "
       + "1.0.0 until they were repaired, with every run green. Reports the disagreement only: "
       + "which side is wrong is ADR 0011's and ADR 0012's decision, not a gate's." },
  { id: "policy",     title: "Project policy",       script: "policy",
    why: "This repository's own policy must satisfy the schema, and must not weaken a standard." },
  { id: "integrity",  title: "Catalog integrity",    script: "integrity",
    why: "Locks what each rule IS against artifacts/catalog-baseline.json. Exits 3 on a weakening." },
  { id: "acceptance", title: "Acceptance lock",      script: "acceptance",
    why: "Locks what each rule ACCEPTS — the part that moved unnoticed when Standard 15 R2 was "
       + "widened. The catalog check would not have caught it. Exits 3." },
  { id: "diagrams",   title: "Diagram freshness",    script: "diagrams",
    why: "A .mmd and the fence embedded in Markdown are the same diagram or the docs are lying." },
  { id: "test",       title: "Test suite",           script: "test",
    why: "node --test over test/. Includes the mutation checks that prove the guards above fire." },
  { id: "scan",       title: "Scan this repository", script: "scan",
    why: "Deliberately not --strict. A build that breaks on heuristics is a build someone "
       + "eventually disables. The error-level gate is the assertion inside the test suite that "
       + "this repository produces no error-severity findings." },
  {
    id: "self-verdict",
    title: "Evaluate this repository",
    verify: verifySelfVerdict,
    why: "This was a bare `npm run evaluate` and it was green for the wrong reason. Every domain "
       + "rule in project-policy.yml is declared not-applicable — correctly, there is no ML work "
       + "in a standards repository — so from 1.4.2 the evaluation honestly reports NOT_EVALUATED "
       + "and exits 2. Before 1.4.2 it reported COMPLIANT on having established nothing, and the "
       + "step passed on that. So the gate asserts what is actually true instead: nothing here is "
       + "applicable, and therefore nothing may be failing.",
  },
];

// ---------------------------------------------------------------------------------------------
// Stage implementations that examine output rather than exit codes.
// ---------------------------------------------------------------------------------------------

/** Read the commit and branch from git, tolerating a detached HEAD and a git-less environment. */
export function resolveHead(cwd = ROOT) {
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  return { commit: git("rev-parse", "HEAD"), branch: git("rev-parse", "--abbrev-ref", "HEAD") };
}

/**
 * Compare what the caller says it is verifying against what is actually checked out here.
 *
 * The interesting case is not disagreement — it is the caller declining to say. An unstated
 * expectation cannot be violated, so this reports what it found and passes. The exact-commit
 * invariant is enforced by scripts/submit-pr.mjs, which always states one.
 */
export function verifyCommitProvenance({ env = process.env, head = resolveHead() } = {}) {
  if (!head.commit) {
    return { ok: false, detail: "git could not resolve HEAD in the CI environment. The pipeline "
      + "cannot state which commit it verified, so its result is not usable as evidence." };
  }
  const expected = env.LOCAL_CI_EXPECTED_COMMIT;
  if (!expected) {
    return { ok: true, detail: `HEAD ${head.commit} on ${head.branch} (caller stated no expectation)` };
  }
  if (expected !== head.commit) {
    return { ok: false, detail: `caller expected ${expected} but this environment has ${head.commit}. `
      + "The CI environment is not looking at the commit the caller intends to push." };
  }
  return { ok: true, detail: `HEAD ${head.commit} on ${head.branch}, matching the caller's expectation` };
}

/** No dependencies, and no lockfile that would imply there had ever been any. */
export function verifyDependencyFreedom({ root = ROOT } = {}) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const keys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  const present = keys.filter((k) => pkg[k] && Object.keys(pkg[k]).length > 0);
  if (present.length > 0) {
    return { ok: false, detail: `package.json declares ${present.join(", ")}. This repository is `
      + "zero-dependency by decision (artifacts/adr/0001-standalone-domain-first-design.md); CI "
      + "has no install step, so the dependency would not be installed and the failure would "
      + "surface later as something more confusing than this message." };
  }
  const locks = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"]
    .filter((f) => existsSync(path.join(root, f)));
  if (locks.length > 0) {
    return { ok: false, detail: `a lockfile is present (${locks.join(", ")}) in a repository that `
      + "declares no dependencies." };
  }
  if (existsSync(path.join(root, "node_modules"))) {
    return { ok: false, detail: "node_modules exists. Nothing in this repository should have "
      + "installed anything; a check may be resolving against a package rather than a builtin." };
  }
  return { ok: true, detail: "no dependencies, no lockfile, no node_modules" };
}

/**
 * `evaluate` on this repository must report NOT_EVALUATED with nothing applicable.
 *
 * NON_COMPLIANT and BLOCKED_BY_INVARIANT fail here, and so does the appearance of an applicable
 * rule — because that means ML work has arrived in this repository and the not-applicable
 * declarations in project-policy.yml need re-reading rather than silently passing.
 */
export function judgeSelfVerdict(verdict) {
  const applicable = verdict?.denominator?.applicable;
  if (verdict?.status === "NOT_EVALUATED" && applicable === 0) {
    return { ok: true, detail: "NOT_EVALUATED with 0 applicable rules — expected, and honest" };
  }
  return {
    ok: false,
    detail: `status=${verdict?.status} applicable=${applicable} scored=${verdict?.denominator?.scored}. `
      + "Expected NOT_EVALUATED with 0 applicable rules. Read project-policy.yml.",
  };
}

function verifySelfVerdict({ root = ROOT, outDir } = {}) {
  const r = spawnSync(process.execPath, ["scripts/standards.mjs", "evaluate", ".", "--json"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, detail: `could not run evaluate: ${r.error.message}` };
  let verdict;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    return { ok: false, detail: `evaluate did not emit parseable JSON (exit ${r.status})` };
  }
  // Keep the raw verdict beside the result so a failure here is diagnosable without a re-run.
  if (outDir) writeFileSync(path.join(outDir, "verdict.json"), JSON.stringify(verdict, null, 2) + "\n");
  return judgeSelfVerdict(verdict);
}

// ---------------------------------------------------------------------------------------------
// Runner.
// ---------------------------------------------------------------------------------------------

/**
 * Resolve an npm script name to an argv, so package.json stays the single definition of commands.
 *
 * Deliberately not `npm run <name>`: npm is an extra process per stage, it is `npm.cmd` on
 * Windows, and its output framing obscures which stage actually failed. Every script in this
 * repository is a direct node invocation, which is the only shape accepted here — anything else
 * is an invocation error rather than a quietly shelled-out command.
 */
export function argvForScript(pkg, name) {
  const command = pkg.scripts?.[name];
  if (!command) throw new Error(`package.json defines no script named "${name}"`);
  const parts = command.split(/\s+/);
  if (parts[0] !== "node") {
    throw new Error(`script "${name}" is "${command}"; the pipeline only runs direct node invocations`);
  }
  return parts.slice(1);
}

function runStage(stage, { root, outDir, verbose }) {
  const started = Date.now();
  let ok, detail, exitCode = null;

  if (stage.verify) {
    try {
      ({ ok, detail } = stage.verify({ root, outDir }));
    } catch (err) {
      ok = false;
      detail = err.message;
    }
  } else {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    const argv = argvForScript(pkg, stage.script);
    const r = spawnSync(process.execPath, argv, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    exitCode = r.status;
    ok = r.status === 0;
    // Quiet on success, loud on failure. A green pipeline that prints ten thousand lines trains
    // people not to read it, and then the red one is not read either.
    if (!ok || verbose) {
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
    }
    detail = ok ? `exit 0` : `exit ${r.status}${r.status === 3 ? " — blocked by an invariant" : ""}`;
  }

  const ms = Date.now() - started;
  console.log(`${ok ? "PASS" : "FAIL"}  ${stage.id.padEnd(20)} ${String(ms).padStart(6)}ms  ${detail}`);
  return { id: stage.id, title: stage.title, ok, detail, exitCode, durationMs: ms };
}

export async function runPipeline({ root = ROOT, outDir, verbose = false } = {}) {
  const startedAt = new Date().toISOString();
  const head = resolveHead(root);
  if (outDir) mkdirSync(outDir, { recursive: true });

  console.log(`Local CI pipeline — ${STAGES.length} stages`);
  console.log(`  repository  ${process.env.LOCAL_CI_REPOSITORY || path.basename(root)}`);
  console.log(`  branch      ${head.branch ?? "(unknown)"}`);
  console.log(`  commit      ${head.commit ?? "(unknown)"}`);
  console.log(`  node        ${process.version}`);
  console.log("");

  const results = [];
  for (const stage of STAGES) {
    const result = runStage(stage, { root, outDir, verbose });
    results.push(result);
    // Fail fast. Later stages assume earlier ones held; running them produces noise, not coverage.
    if (!result.ok) break;
  }

  const passed = results.length === STAGES.length && results.every((r) => r.ok);
  const completedAt = new Date().toISOString();

  const evidence = {
    schemaVersion: "1.0.0",
    // Inside the container the working copy is /work, so its basename is not the repository's
    // name. The caller states the name; the basename is the fallback for a native run.
    repository: process.env.LOCAL_CI_REPOSITORY || path.basename(root),
    branch: head.branch,
    commit: head.commit,
    result: passed ? "passed" : "failed",
    environment: process.env.LOCAL_CI_ENVIRONMENT ?? "unknown",
    node: process.version,
    startedAt,
    completedAt,
    checks: STAGES.map((s) => s.id),
    executed: results,
    // Naming what did NOT run matters more than naming what did. A pipeline that stopped at stage
    // three and reported three passes has told the truth in a way that reads like a pass.
    notExecuted: STAGES.slice(results.length).map((s) => s.id),
  };

  if (outDir) {
    writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(evidence, null, 2) + "\n");
  }

  console.log("");
  console.log(`Result      ${passed ? "PASS" : "FAIL"}`);
  console.log(`Repository  ${evidence.repository}`);
  console.log(`Branch      ${evidence.branch}`);
  console.log(`Commit      ${evidence.commit}`);
  console.log(`Stages      ${results.filter((r) => r.ok).length}/${STAGES.length} passed`
    + (evidence.notExecuted.length ? `, not run: ${evidence.notExecuted.join(", ")}` : ""));
  console.log(`Environment ${evidence.environment}`);
  console.log(`Completed   ${completedAt}`);

  return { passed, evidence };
}

// ---------------------------------------------------------------------------------------------

async function main(argv) {
  const verbose = argv.includes("--verbose");
  const outFlag = argv.indexOf("--out");
  const outDir = outFlag !== -1 ? argv[outFlag + 1]
    : process.env.LOCAL_CI_OUT ?? path.join(ROOT, "artifacts", "local-ci");

  const unknown = argv.filter((a, i) =>
    a.startsWith("--") && !["--verbose", "--out"].includes(a) && argv[i - 1] !== "--out");
  if (unknown.length) {
    console.error(`Unknown option(s): ${unknown.join(", ")}`);
    console.error("Usage: node scripts/ci-pipeline.mjs [--verbose] [--out <dir>]");
    return EXIT_INVOCATION;
  }

  const { passed } = await runPipeline({ outDir, verbose });
  return passed ? EXIT_OK : EXIT_FINDINGS;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(await main(process.argv.slice(2)));
  } catch (err) {
    console.error(`Invocation error: ${err.message}`);
    process.exit(EXIT_INVOCATION);
  }
}
