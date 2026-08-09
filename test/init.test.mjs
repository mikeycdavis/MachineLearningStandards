/**
 * `standards init` — bootstrapping, and the two properties that make it safe to run.
 *
 * The first is that a dry run cannot disagree with the run it previews, because both derive from
 * one `plan()`. The second is that replacing an existing file is refused unless that exact path was
 * named. Both are tested by driving the real functions against throwaway directories rather than by
 * inspecting the code, since the failure being guarded against is somebody's hand-written policy
 * being silently overwritten.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plan, apply, renderPlan } from "../scripts/init.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standards.mjs");

async function scratch(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-init-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const byPath = (p) => Object.fromEntries(p.actions.map((a) => [a.path, a]));

test("an empty project gets every artifact created", async () => {
  await scratch(async (dir) => {
    const p = await plan(dir, { templatesRoot: ROOT });
    await apply(p);
    for (const file of ["project-policy.yml", "PROJECT.md", "AGENTS.md", "CLAUDE.md", "MODEL_CARD.md", "DATASET.md"]) {
      assert.ok(existsSync(path.join(dir, file)), `${file} was created`);
    }
    for (const d of ["artifacts/adr", "artifacts/project-plan-breakdown"]) {
      assert.ok(existsSync(path.join(dir, d)), `${d} was created`);
    }
  });
});

test("a dry run writes nothing", async () => {
  await scratch(async (dir) => {
    const p = await plan(dir, { templatesRoot: ROOT });
    // plan() alone, with no apply(), is exactly what --dry-run does.
    assert.deepEqual(await readdir(dir), [], "the directory is untouched");
    assert.ok(p.actions.length > 0, "and the plan is not empty");
  });
});

test("the dry run and the real run derive from the same plan", async () => {
  // The guarantee: a dry run cannot describe something different from what would happen, because
  // there is no second code path for it to describe.
  await scratch(async (dir) => {
    const preview = await plan(dir, { templatesRoot: ROOT });
    const written = await apply(preview);
    const promised = preview.actions.filter((a) => a.action === "create" || a.action === "overwrite").map((a) => a.path);
    assert.deepEqual(written.sort(), promised.sort(), "everything promised was written, and nothing else");
  });
});

test("an existing file is refused, not replaced", async () => {
  await scratch(async (dir) => {
    const policy = path.join(dir, "project-policy.yml");
    await writeFile(policy, "standardVersion: \"1.0.0\"\nproject: \"hand written\"\n");

    const p = await plan(dir, { templatesRoot: ROOT });
    assert.equal(byPath(p)["project-policy.yml"].action, "conflict");
    await apply(p);
    assert.match(await readFile(policy, "utf8"), /hand written/, "the existing content survives");
  });
});

test("overwriting requires naming the exact path", async () => {
  await scratch(async (dir) => {
    const policy = path.join(dir, "project-policy.yml");
    await writeFile(policy, "standardVersion: \"1.0.0\"\nproject: \"hand written\"\n");
    await writeFile(path.join(dir, "PROJECT.md"), "# also hand written\n");

    const p = await plan(dir, { templatesRoot: ROOT, overwrite: ["project-policy.yml"] });
    assert.equal(byPath(p)["project-policy.yml"].action, "overwrite");
    assert.equal(byPath(p)["PROJECT.md"].action, "conflict", "approving one path does not approve another");

    await apply(p);
    assert.ok(!/hand written/.test(await readFile(policy, "utf8")), "the approved file was replaced");
    assert.match(await readFile(path.join(dir, "PROJECT.md"), "utf8"), /also hand written/, "the other was not");
  });
});

test("there is no blanket force flag", async () => {
  const source = await readFile(path.join(ROOT, "scripts/standards.mjs"), "utf8");
  assert.ok(!/--force\b(?!-overwrite)/.test(source),
    "every replacement is approved individually, because the cost of the mistake is somebody's policy");
});

test("an existing directory is preserved rather than reported as a conflict", async () => {
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "artifacts/adr"), { recursive: true });
    const p = await plan(dir, { templatesRoot: ROOT });
    assert.equal(byPath(p)["artifacts/adr"].action, "preserve");
  });
});

test("preserve and conflict are distinguished in the rendering", async () => {
  // Both mean nothing was written. The first is success and the second is unfinished work, and a
  // reader who cannot tell them apart will treat a refusal as a completed step.
  await scratch(async (dir) => {
    await mkdir(path.join(dir, "artifacts/adr"), { recursive: true });
    await writeFile(path.join(dir, "PROJECT.md"), "# existing\n");
    const p = await plan(dir, { templatesRoot: ROOT });
    const text = renderPlan(p, true);
    assert.match(text, /left alone:/);
    assert.match(text, /refused:/);
    assert.match(text, /--force-overwrite=PROJECT\.md/, "the rendering says exactly how to proceed");
  });
});

test("a missing template is a conflict, not a silently skipped artifact", async () => {
  await scratch(async (dir) => {
    const p = await plan(dir, { templatesRoot: path.join(dir, "no-templates-here") });
    assert.ok(p.actions.filter((a) => a.kind === "file").every((a) => a.action === "conflict"));
  });
});

test("the templates the plan names all exist in this repository", async () => {
  await scratch(async (dir) => {
    const p = await plan(dir, { templatesRoot: ROOT });
    const conflicts = p.actions.filter((a) => a.action === "conflict");
    assert.deepEqual(conflicts, [], "no artifact is unreachable because its template is missing");
  });
});

// ---- The exit contract, through the real command. ----

test("init exits 0 on a clean bootstrap and 1 when something is refused", async () => {
  await scratch(async (dir) => {
    const first = spawnSync(process.execPath, [CLI, "init", `--dir=${dir}`], { encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /created:/);

    const second = spawnSync(process.execPath, [CLI, "init", `--dir=${dir}`], { encoding: "utf8" });
    assert.equal(second.status, 1, "a second run refuses to replace what the first wrote");
    assert.match(second.stdout, /refused:/);
  });
});

test("a dry run through the command writes nothing and says so", async () => {
  await scratch(async (dir) => {
    const r = spawnSync(process.execPath, [CLI, "init", `--dir=${dir}`, "--dry-run"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /would create:/);
    assert.match(r.stdout, /Nothing was written/);
    assert.deepEqual(await readdir(dir), []);
  });
});

test("a bootstrapped project is immediately evaluable", async () => {
  // The bootstrap is only worth anything if what it writes satisfies the schema it will be judged
  // against. Writing a policy the validator rejects would make init the first thing to fix.
  await scratch(async (dir) => {
    spawnSync(process.execPath, [CLI, "init", `--dir=${dir}`], { encoding: "utf8" });
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/policy.mjs"), path.join(dir, "project-policy.yml"), "--json"], { encoding: "utf8" });
    const out = JSON.parse(r.stdout);
    assert.notEqual(out.status, "invalid", `the template policy must satisfy the schema: ${JSON.stringify(out)}`);
    assert.deepEqual(out.invariantViolations, [], "and must not weaken anything");
  });
});
