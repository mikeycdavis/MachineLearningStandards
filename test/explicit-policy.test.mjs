/**
 * `--policy`: naming the policy to apply, and the four things that must stay true when you do.
 *
 * A policy used to be a property of the target — one file, in one place, in the directory under
 * evaluation. That cannot express a repository governed by several standards packs, because two
 * packs cannot both own the root-level filename. The flag lets the invocation name the file.
 *
 * Every test here guards a decision rather than an implementation detail. The dangerous failures
 * are not crashes; they are the quiet ones, where a verdict is produced about material the caller
 * did not name and is reported as though it were about the material they did.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile, mkdtemp, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");
const fixture = (name) => path.join(ROOT, "test/fixtures", name);

/** Run the CLI with an explicit cwd, because --policy resolves against it and that is the point. */
function cli(args, cwd = ROOT) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* a configuration error writes to stderr and emits no report */
  }
  return { code: r.status, json, stdout: r.stdout, stderr: r.stderr };
}

async function withCopy(name, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-policy-"));
  try {
    await cp(fixture(name), dir, { recursive: true });
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const policyFor = (project) => `standardVersion: "1.0.0"\nproject: "${project}"\nexceptions: []\n`;

/** A policy whose contents reach the status report, so which file was read becomes observable. */
const EXPIRED_EXCEPTION_POLICY = [
  'standardVersion: "1.0.0"',
  'project: "the-named-one"',
  "exceptions:",
  '  - rule: "split.no-test-set-tuning"',
  '    reason: "under test"',
  '    approvedBy: "the-suite"',
  '    approvedAt: "2020-01-01"',
  '    expires: "2020-06-01"',
  "",
].join("\n");

// ---- The explicit policy is the one that is read. ----

test("an explicit policy is the one applied, not the target's own", async () => {
  await withCopy("clean-repo", async (dir) => {
    // Both exist. Only one is named. If resolution silently preferred the target's file, the
    // project name in the report would be the wrong one and nothing else would look wrong.
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-default-one"));
    const named = path.join(dir, "elsewhere.yml");
    await writeFile(named, policyFor("the-named-one"));

    const res = cli(["evaluate", `--dir=${dir}`, `--policy=${named}`, "--json"]);
    assert.equal(res.json?.project, "the-named-one",
      "the target's own project-policy.yml was applied despite an explicit --policy");
  });
});

test("without the flag the target's own project-policy.yml is still used", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-default-one"));
    await writeFile(path.join(dir, "elsewhere.yml"), policyFor("the-named-one"));

    const res = cli(["evaluate", `--dir=${dir}`, "--json"]);
    assert.equal(res.json?.project, "the-default-one",
      "adding the flag changed the behaviour of invocations that do not pass it");
  });
});

// ---- No fall back. This is the decision the flag exists to protect. ----

test("an explicit policy that does not exist is an error, never a fall back to the default", async () => {
  await withCopy("clean-repo", async (dir) => {
    // The target's own policy is present and valid, so a fallback would succeed and report
    // COMPLIANT-shaped output about a policy the caller never asked for. That is the failure.
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-default-one"));

    const res = cli(["evaluate", `--dir=${dir}`, `--policy=${path.join(dir, "absent.yml")}`, "--json"]);
    assert.equal(res.code, 2, "a named policy that is not there is a configuration error");
    assert.equal(res.json, null, "nothing was evaluated, so nothing may be reported");
    assert.match(res.stderr, /absent\.yml/,
      "the error must name the file that was sought, not the default filename");
  });
});

test("an empty --policy= is rejected as an invocation error", () => {
  const res = cli(["evaluate", `--dir=${ROOT}`, "--policy=", "--json"]);
  assert.equal(res.code, 2);
  assert.match(res.stderr, /--policy=/);
});

// ---- Resolution base: the working directory, never the target. ----

test("a relative --policy resolves against the working directory, not against --dir", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-target-relative-one"));
    // Same basename in two places. Whichever one is read names itself, so the assertion cannot
    // pass by accident.
    const cwd = await mkdtemp(path.join(tmpdir(), "mls-cwd-"));
    try {
      await writeFile(path.join(cwd, "chosen.yml"), policyFor("the-cwd-relative-one"));
      await writeFile(path.join(dir, "chosen.yml"), policyFor("the-target-relative-one"));

      const res = cli(["evaluate", `--dir=${dir}`, "--policy=chosen.yml", "--json"], cwd);
      assert.equal(res.json?.project, "the-cwd-relative-one",
        "a relative --policy was resolved against the target, so an operator's path silently moved");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

// ---- Every subcommand that reads a policy honours it. ----

test("status honours the flag, so freshness is reported for the policy that was evaluated", async () => {
  await withCopy("clean-repo", async (dir) => {
    // The status report carries no project name, so proving which file it read needs a difference
    // that reaches the output. Only the named policy holds an expired exception; if status read the
    // default instead, items would be empty and nothing else would tell the two apart.
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-default-one"));
    const named = path.join(dir, "elsewhere.yml");
    await writeFile(named, EXPIRED_EXCEPTION_POLICY);

    const res = cli(["status", `--dir=${dir}`, `--policy=${named}`, "--json"]);
    assert.notEqual(res.code, 2, `status rejected the flag: ${res.stderr.split("\n")[0]}`);
    const kinds = (res.json?.items ?? []).map((i) => i.kind);
    assert.ok(kinds.includes("expired-exception"),
      "status did not see the named policy's expired exception, so it read a different file");
  });
});

test("status reports the same missing-policy error as evaluate", async () => {
  await withCopy("clean-repo", async (dir) => {
    await writeFile(path.join(dir, "project-policy.yml"), policyFor("the-default-one"));
    const res = cli(["status", `--dir=${dir}`, `--policy=${path.join(dir, "absent.yml")}`, "--json"]);
    assert.equal(res.code, 2);
    assert.match(res.stderr, /absent\.yml/);
  });
});

test("explain honours the flag too, so it cannot describe a policy nothing evaluated", async () => {
  await withCopy("clean-repo", async (dir) => {
    const named = path.join(dir, "elsewhere.yml");
    await writeFile(named, policyFor("the-named-one"));
    // No project-policy.yml in the target at all: if explain ignored the flag it would find nothing.
    const res = cli(["explain", "--all", `--dir=${dir}`, `--policy=${named}`, "--json"]);
    assert.notEqual(res.code, 2, `explain rejected the flag: ${res.stderr.split("\n")[0]}`);
  });
});
