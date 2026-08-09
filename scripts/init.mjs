/**
 * `standards init` — bootstrap a project against the framework.
 *
 * Split into a pure `plan()` that decides every action and an `apply()` that performs them.
 * `--dry-run` is `plan()` rendered without `apply()`, not a parallel code path that describes what
 * the real path would supposedly do. That is the only construction under which a dry run cannot
 * disagree with the run it previews, and the brief asks for exactly that guarantee.
 *
 * The write contract:
 *
 *   create a missing artifact  → ordinary. This is what init is for.
 *   replace an existing one    → destructive. Refused by default and reported as a conflict.
 *                                Overwriting requires --force-overwrite naming each path.
 *
 * There is no blanket --force. Every replacement is approved individually, because the cost of the
 * mistake is somebody's hand-written policy.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/** What a project needs before it can be evaluated. */
const ARTIFACTS = [
  { target: "project-policy.yml", template: "templates/project-policy.yml" },
  { target: "PROJECT.md", template: "templates/PROJECT.md" },
  { target: "AGENTS.md", template: "templates/AGENTS.md" },
  { target: "CLAUDE.md", template: "templates/CLAUDE.md" },
  { target: "MODEL_CARD.md", template: "templates/MODEL-CARD.md" },
  { target: "DATASET.md", template: "templates/DATASET-CARD.md" },
];

const DIRECTORIES = ["artifacts/adr", "artifacts/project-plan-breakdown"];

/**
 * Decide every action. Reads, never writes.
 *
 * @param target        the project directory to bootstrap
 * @param templatesRoot this repository, where the templates live
 * @param overwrite     paths the caller has explicitly approved replacing
 */
export async function plan(target, { overwrite = [], templatesRoot } = {}) {
  const approved = new Set(overwrite.map((p) => p.split(path.sep).join("/")));
  const actions = [];

  for (const dir of DIRECTORIES) {
    const full = path.join(target, dir);
    actions.push({
      path: dir,
      kind: "directory",
      action: existsSync(full) ? "preserve" : "create",
      reason: existsSync(full) ? "already present" : "required by the framework",
    });
  }

  for (const artifact of ARTIFACTS) {
    const full = path.join(target, artifact.target);
    const templatePath = path.join(templatesRoot, artifact.template);
    let content = null;
    try {
      content = await readFile(templatePath, "utf8");
    } catch {
      actions.push({
        path: artifact.target,
        kind: "file",
        action: "conflict",
        reason: `the template ${artifact.template} is missing from the standards repository`,
      });
      continue;
    }

    if (!existsSync(full)) {
      actions.push({ path: artifact.target, kind: "file", action: "create", reason: "absent", content });
    } else if (approved.has(artifact.target)) {
      actions.push({
        path: artifact.target,
        kind: "file",
        action: "overwrite",
        reason: "replacement explicitly approved with --force-overwrite",
        content,
      });
    } else {
      actions.push({
        path: artifact.target,
        kind: "file",
        action: "conflict",
        reason: "already exists; replacing it would discard whatever it contains",
      });
    }
  }

  return { target, actions };
}

/** Perform the plan. Writes exactly what plan() decided, and nothing else. */
export async function apply(p) {
  const written = [];
  for (const action of p.actions) {
    const full = path.join(p.target, action.path);
    if (action.kind === "directory" && action.action === "create") {
      await mkdir(full, { recursive: true });
      written.push(action.path);
    } else if (action.kind === "file" && (action.action === "create" || action.action === "overwrite")) {
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, action.content);
      written.push(action.path);
    }
  }
  return written;
}

export function renderPlan(p, dryRun) {
  const out = [dryRun ? `Init (dry run): ${p.target}` : `Init: ${p.target}`, ""];
  const group = (action) => p.actions.filter((a) => a.action === action);

  for (const [action, verb] of [["create", dryRun ? "would create" : "created"], ["overwrite", dryRun ? "would replace" : "replaced"], ["preserve", "left alone"], ["conflict", "refused"]]) {
    const items = group(action);
    if (items.length === 0) continue;
    out.push(`  ${verb}:`);
    for (const item of items) out.push(`    ${item.path}${item.action === "conflict" || item.action === "preserve" ? ` — ${item.reason}` : ""}`);
    out.push("");
  }

  const conflicts = group("conflict");
  if (conflicts.length > 0) {
    out.push("  Nothing was written for the refused paths. `preserve` and `conflict` both mean no");
    out.push("  write happened; the first is success and the second is unfinished work. To replace");
    out.push("  one deliberately, name it:");
    for (const c of conflicts) out.push(`    --force-overwrite=${c.path}`);
    out.push("");
  }

  if (dryRun) {
    out.push("  Nothing was written. This plan is the same object the real run executes, so it");
    out.push("  cannot describe something different from what would happen.");
  } else {
    out.push("  Next: edit project-policy.yml to declare what applies here, then run");
    out.push("  `standards scan` for evidence and `standards evaluate` for the verdict.");
  }
  return out.join("\n");
}
