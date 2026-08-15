#!/usr/bin/env node
/**
 * Verified pull-request submission.
 *
 * THE INVARIANT THIS ENFORCES:
 *
 *     A pull request may only be submitted for a commit that has itself passed the complete
 *     containerized CI pipeline. The commit pushed is exactly the commit that passed.
 *
 * The invariant is not "CI passed recently" or "CI passed on this branch". Both of those are
 * satisfiable by a branch whose tip has moved since, and a green result attached to a commit that
 * is no longer the one being reviewed is worse than no result — it is a true statement about the
 * wrong thing. So the commit is resolved before CI, restated to CI (which fails if the container
 * is looking at anything else), resolved again afterwards, and compared. Any disagreement stops
 * the submission; nothing is pushed and no pull request is created.
 *
 * WHY THIS IS NODE AND NOT SHELL. The guards below are the whole point of the file, and a guard
 * that cannot be tested is a comment. Each one is a pure function over strings, exercised by
 * test/local-ci.test.mjs — including the SHA-mismatch refusal, which is asserted rather than
 * demonstrated by mutating real history. scripts/submit-pr.ps1 and scripts/submit-pr.sh are
 * one-line wrappers so that neither platform has its own copy of this logic to drift.
 *
 * Exit 0 on a created pull request, 1 on any refusal, 2 on invocation error.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_INVOCATION = 2;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Branches a pull request must never be opened *from*. */
export const PROTECTED_BRANCHES = new Set(["main", "master", "develop", "HEAD"]);

// ---------------------------------------------------------------------------------------------
// Guards. Pure functions over strings: everything the submission can refuse to do, it refuses
// here, and test/local-ci.test.mjs drives each refusal directly.
// ---------------------------------------------------------------------------------------------

/**
 * The branch must be a real, non-default branch, and it must not be the base of its own PR.
 *
 * A detached HEAD is rejected rather than resolved to something plausible: there is no branch to
 * push, and inventing one is exactly the sort of helpfulness that produces a PR nobody asked for.
 */
export function guardBranch(branch, base) {
  if (!branch || branch === "HEAD") {
    return { ok: false, message: "HEAD is detached. Check out a branch before submitting a pull request." };
  }
  if (PROTECTED_BRANCHES.has(branch)) {
    return { ok: false, message: `Refusing to open a pull request from "${branch}". `
      + "That is a shared branch; work belongs on a feature branch." };
  }
  if (branch === base) {
    return { ok: false, message: `The head branch and the base branch are both "${branch}". `
      + "There is nothing to compare." };
  }
  return { ok: true };
}

/**
 * The working tree must be clean.
 *
 * Not fussiness: CI verifies a commit, and uncommitted changes are by definition not in it. A
 * pass on a tree that differs from what will be pushed is a statement about a state that exists
 * only on one machine. Ignored files are excluded — `git status --porcelain` already omits them —
 * which is why artifacts/local-ci/ is in .gitignore.
 */
export function guardCleanTree(porcelain) {
  const dirty = porcelain.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  if (dirty.length === 0) return { ok: true };
  return {
    ok: false,
    message: "The working tree is not clean. Commit or stash these before submitting:\n"
      + dirty.map((l) => `    ${l}`).join("\n"),
  };
}

/**
 * The commit CI verified must be the commit about to be pushed.
 *
 * This is the invariant itself. It fires when anything moved HEAD while CI was running — an
 * amend, a rebase, a commit in another terminal, a checkout — and its message says what to do,
 * because the honest remedy is always the same: verify the commit that now exists.
 */
export function guardSameHead(before, after) {
  if (before && after && before === after) return { ok: true };
  return {
    ok: false,
    message: "HEAD changed after CI verification. The current commit has not been verified. "
      + `Re-run CI before submitting.\n    verified: ${before}\n    current:  ${after}`,
  };
}

/**
 * The evidence file must describe a pass, for this commit.
 *
 * Independent of the CI process's exit code, and deliberately so: the exit code says the runner
 * believed it succeeded, the evidence says which commit it was looking at when it did. They are
 * checked separately because they can only disagree if something is wrong.
 */
export function guardEvidence(evidence, commit) {
  if (!evidence) {
    return { ok: false, message: "CI produced no verification evidence. Nothing was verified." };
  }
  if (evidence.result !== "passed") {
    return { ok: false, message: `The verification evidence records result="${evidence.result}".` };
  }
  if (evidence.commit !== commit) {
    return { ok: false, message: `The verification evidence is for ${evidence.commit}, not ${commit}. `
      + "This evidence belongs to a different run." };
  }
  if (evidence.notExecuted?.length) {
    return { ok: false, message: `The pipeline did not run: ${evidence.notExecuted.join(", ")}.` };
  }
  return { ok: true };
}

/**
 * Compose the pull-request body: the author's content first, the verification block appended.
 *
 * Appended rather than substituted. The user's description is the part a reviewer needs; the
 * verification block is a footnote that happens to be load-bearing. It says "Docker, on this
 * machine" in as many words, because the one thing this must never be mistaken for is a claim
 * that GitHub-hosted Actions ran.
 */
export function composeBody(userBody, evidence) {
  const block = [
    "## Local CI",
    "",
    "This branch was verified by the repository's containerized pipeline **on a developer machine**,",
    "before the push. This is not a GitHub-hosted Actions result and does not claim to be; whether",
    "Actions also ran is whatever the checks on this pull request say.",
    "",
    `- **Verified commit:** \`${evidence.commit}\``,
    `- **Result:** PASS`,
    `- **Environment:** ${evidence.environment} · Node ${evidence.node}`,
    `- **Completed:** ${evidence.completedAt}`,
    `- **Stages:** ${evidence.checks.join(", ")}`,
    "",
    "The commit pushed is the commit that passed: `scripts/submit-pr.mjs` resolves HEAD before and",
    "after the run and refuses to push if it moved. See docs/local-ci.md.",
  ].join("\n");

  const body = (userBody ?? "").trim();
  return body ? `${body}\n\n---\n\n${block}\n` : `${block}\n`;
}

// ---------------------------------------------------------------------------------------------
// Process plumbing.
// ---------------------------------------------------------------------------------------------

function git(args, { cwd = ROOT } = {}) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim(), status: r.status };
}

function refuse(message) {
  console.error("");
  console.error(message);
  return EXIT_REFUSED;
}

/** The platform's CI entry point. Both wrap the same container and the same pipeline. */
function ciCommand(expectedCommit, { verbose, keepOnFailure }) {
  if (process.platform === "win32") {
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      path.join(ROOT, "scripts", "ci.ps1"), "-ExpectedCommit", expectedCommit];
    if (verbose) args.push("-Verbose");
    if (keepOnFailure) args.push("-KeepOnFailure");
    return { file: "pwsh", args };
  }
  const args = [path.join(ROOT, "scripts", "ci.sh"), "--expected-commit", expectedCommit];
  if (verbose) args.push("--verbose");
  if (keepOnFailure) args.push("--keep-on-failure");
  return { file: "bash", args };
}

function readEvidence() {
  const file = path.join(ROOT, "artifacts", "local-ci", "latest.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const opts = { base: null, title: null, body: null, draft: false, dryRun: false, verbose: false, keepOnFailure: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--draft") opts.draft = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--verbose") opts.verbose = true;
    else if (a === "--keep-on-failure") opts.keepOnFailure = true;
    else if (a === "--base") opts.base = argv[++i];
    else if (a === "--title") opts.title = argv[++i];
    else if (a === "--body") opts.body = argv[++i];
    else throw new Error(`Unknown option: ${a}`);
  }
  return opts;
}

async function main(argv) {
  const opts = parseArgs(argv);

  // 1. A git repository.
  if (!git(["rev-parse", "--git-dir"]).ok) {
    console.error("Not a git repository.");
    return EXIT_INVOCATION;
  }

  // 2. A branch appropriate for a pull request.
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out;
  const remoteHead = git(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  const defaultBranch = remoteHead.ok ? remoteHead.out.replace("refs/remotes/origin/", "") : "main";
  const base = opts.base ?? defaultBranch;

  const branchCheck = guardBranch(branch, base);
  if (!branchCheck.ok) return refuse(branchCheck.message);

  // 3. A clean tree.
  const clean = guardCleanTree(git(["status", "--porcelain"]).out);
  if (!clean.ok) return refuse(clean.message);

  // 4. The commit under verification.
  const before = git(["rev-parse", "HEAD"]).out;

  console.log(`Repository  ${path.basename(ROOT)}`);
  console.log(`Branch      ${branch}`);
  console.log(`Base        ${base}`);
  console.log(`Commit      ${before}`);
  console.log("");
  console.log("Running the full local CI pipeline in Docker. This is the same pipeline");
  console.log("scripts/ci.ps1 and the GitHub workflow run; nothing here is a shortened version of it.");
  console.log("");

  // 5. CI.
  const { file, args } = ciCommand(before, opts);
  const ci = spawnSync(file, args, { cwd: ROOT, stdio: "inherit" });
  if (ci.error) {
    console.error(`Could not start local CI (${file}): ${ci.error.message}`);
    return EXIT_INVOCATION;
  }

  // 6. Stop on failure. No push, no pull request, and no attempt to fix anything.
  if (ci.status !== 0) {
    return refuse("CI failed. No branch was pushed and no PR was created.");
  }

  // 7 & 8. The commit is still the commit.
  const after = git(["rev-parse", "HEAD"]).out;
  const same = guardSameHead(before, after);
  if (!same.ok) return refuse(same.message);

  const evidence = readEvidence();
  const attested = guardEvidence(evidence, before);
  if (!attested.ok) return refuse(attested.message);

  // CI mounts the working tree read-only, so it cannot have changed anything. Checked anyway:
  // the claim "CI never modifies your repository to make itself pass" is worth more as an
  // assertion that runs than as a sentence in a README.
  const stillClean = guardCleanTree(git(["status", "--porcelain"]).out);
  if (!stillClean.ok) return refuse("The working tree changed during CI.\n" + stillClean.message);

  console.log("");
  console.log(`Verified    ${before}`);
  console.log(`Result      PASS (${evidence.checks.length} stages)`);

  if (opts.dryRun) {
    console.log("");
    console.log("--dry-run: verification complete. Nothing was pushed and no pull request was created.");
    console.log(`Re-run without --dry-run to push ${before.slice(0, 12)} and open a pull request into ${base}.`);
    return EXIT_OK;
  }

  // 9. Push the exact verified commit, by SHA rather than by branch name. `git push origin
  //    <branch>` would push whatever the branch points at when the push executes; naming the SHA
  //    means the thing verified above is literally the thing that travels.
  console.log("");
  console.log(`Pushing ${before} to origin/${branch}...`);
  const push = spawnSync("git", ["push", "--set-upstream", "origin", `${before}:refs/heads/${branch}`],
    { cwd: ROOT, stdio: "inherit" });
  if (push.status !== 0) {
    return refuse("Push failed. No pull request was created.");
  }

  // 10. The pull request, using the developer's existing gh session. No token is read, stored, or
  //     written by this repository.
  const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (gh.status !== 0) {
    console.log("");
    console.log("The verified commit was pushed, but GitHub CLI is not authenticated, so no pull");
    console.log("request was created. Authenticate with `gh auth login` and open it manually, or");
    console.log("re-run this command.");
    return EXIT_OK;
  }

  const title = opts.title ?? git(["log", "-1", "--pretty=%s"]).out;
  const ghArgs = ["pr", "create", "--base", base, "--head", branch,
    "--title", title, "--body", composeBody(opts.body, evidence)];
  if (opts.draft) ghArgs.push("--draft");

  const created = spawnSync("gh", ghArgs, { cwd: ROOT, stdio: "inherit" });
  if (created.status !== 0) {
    console.log("");
    console.log("The verified commit was pushed. Creating the pull request failed — open it by hand;");
    console.log(`the branch on the remote is exactly ${before}.`);
    return EXIT_REFUSED;
  }

  console.log("");
  console.log(`Pull request opened for the verified commit ${before}.`);
  return EXIT_OK;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(await main(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    console.error("Usage: node scripts/submit-pr.mjs [--base <branch>] [--title <t>] [--body <b>]");
    console.error("                                  [--draft] [--dry-run] [--verbose] [--keep-on-failure]");
    process.exit(EXIT_INVOCATION);
  }
}
