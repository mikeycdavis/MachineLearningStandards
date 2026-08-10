#!/usr/bin/env node
/**
 * The acceptance lock: what a rule accepts, not merely how it is classified.
 *
 * WHY THIS EXISTS. `scripts/integrity.mjs` locks every rule's kind, level, severity, verification
 * method, assurance, exemptibility and attestability. Building the v1.3 normative candidate showed
 * what that does not cover. Standard 15 R2 was widened from *exact pins only* to *exact pins or a
 * committed lock artifact*, which enlarges the set of project states considered compliant — and
 * every locked field stayed identical, so INV-1 said nothing. The change was authorised; the silence
 * was not.
 *
 *     A standards-integrity guard that locks a rule's classification but not its satisfaction
 *     semantics cannot establish that the rule was not weakened.
 *
 * WHY NOT LOCK `evidenceExpected`. It is prose, and N10 is the counterexample to hashing it: the
 * catalog's evidenceExpected already said "or a manifest accompanied by a committed lockfile" while
 * the standard's text and the detector both disagreed with it. Hashing the sentence would have
 * locked the one artifact that was already right.
 *
 * WHY NOT HASH THE STANDARDS. Editorial change is not weakening, and a guard that fires on every
 * comma teaches people to relock without reading. The thing worth protecting is narrower and is
 * behavioural: **the set of project states the framework considers compliant**.
 *
 * SO: enumerate states, run the real evaluator over each, and lock the answers. A state is a tiny
 * project; the lock records the disposition each rule reaches on it. Any difference blocks — a
 * widening, because that is a weakening, and a strengthening too, because silently making adopters
 * non-compliant deserves the same deliberate review.
 *
 * WHAT THIS DOES NOT COVER, stated because a guard that hides its own reach is the failure this
 * repository exists to prevent: only rules with a mechanism can have acceptance states. For the
 * thirty-five rules resting on human judgement there is no observable acceptance predicate, and
 * nothing here would detect a semantic weakening of one of them.
 *
 * NOT RUN INSIDE `evaluate`. This gate drives the evaluator over fixtures, so calling it from the
 * evaluator would recurse. It is its own command, and CI runs it.
 */

import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(HERE, "scripts", "standards.mjs");
const BASELINE = path.join(HERE, "artifacts", "acceptance-baseline.json");

const EXIT_OK = 0;
const EXIT_INVOCATION = 2;
const EXIT_BLOCKED = 3;

const POLICY = 'standardVersion: "1.0.0"\nproject: "acceptance-state"\nexceptions: []\n';

/**
 * How much better or worse a disposition is for the project being judged.
 *
 * Direction matters in the report. A state that moved up accepts something it did not accept
 * before, which is the weakening INV-1 is about. A state that moved down makes an adopter
 * non-compliant without warning, which needs the same deliberate review for a different reason.
 */
const FAVOURABILITY = {
  failed: 0,
  warning: 1,
  skipped: 2,
  passed: 3,
};

/** Materialise one state and return the disposition the evaluator reaches for its rule. */
async function runState(state) {
  const dir = await mkdtemp(path.join(tmpdir(), "mls-accept-"));
  try {
    await writeFile(path.join(dir, "project-policy.yml"), POLICY);
    for (const [name, body] of Object.entries(state.files)) {
      await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
      await writeFile(path.join(dir, name), body);
    }
    const r = spawnSync(process.execPath, [CLI, "evaluate", `--dir=${dir}`, "--json"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (!r.stdout) return { error: (r.stderr || "").trim() || `evaluate exited ${r.status}` };
    let json;
    try {
      json = JSON.parse(r.stdout);
    } catch {
      return { error: "evaluate did not return JSON" };
    }
    const result = json.results.find((x) => x.ruleId === state.rule);
    if (!result) return { error: `${state.rule} is not in the catalog` };
    return { status: result.status, disposition: result.disposition };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Compare every locked state against what the evaluator does now.
 * Exported so tests can drive it with a mutated baseline rather than by editing the real one.
 */
export async function checkAcceptance(baseline) {
  const drift = [];
  const errors = [];
  for (const state of baseline.states) {
    const now = await runState(state);
    if (now.error) {
      errors.push({ state: state.id, message: now.error });
      continue;
    }
    if (now.status === state.expect.status && now.disposition === state.expect.disposition) continue;
    const was = FAVOURABILITY[state.expect.status] ?? -1;
    const is = FAVOURABILITY[now.status] ?? -1;
    drift.push({
      state: state.id,
      rule: state.rule,
      direction: is > was ? "widened" : is < was ? "strengthened" : "reclassified",
      was: `${state.expect.status} / ${state.expect.disposition}`,
      now: `${now.status} / ${now.disposition}`,
      note: state.note,
    });
  }
  return { drift, errors, stateCount: baseline.states.length };
}

async function main() {
  if (!existsSync(BASELINE)) {
    process.stderr.write(
      "acceptance: no reviewed baseline at artifacts/acceptance-baseline.json.\n" +
        "Without it nothing detects a change in what the rules accept.\n",
    );
    return EXIT_INVOCATION;
  }

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, "utf8"));
  } catch (err) {
    process.stderr.write(`acceptance: the baseline could not be read — ${err.message}\n`);
    return EXIT_INVOCATION;
  }

  const { drift, errors, stateCount } = await checkAcceptance(baseline);
  const out = [`Acceptance lock (baseline reviewed ${baseline.reviewedOn})`, `  States: ${stateCount}`, ""];

  if (errors.length > 0) {
    out.push("  States that could not be evaluated:");
    for (const e of errors) out.push(`    ${e.state}: ${e.message}`);
    out.push("");
    process.stdout.write(out.join("\n") + "\n");
    return EXIT_INVOCATION;
  }

  if (drift.length === 0) {
    out.push("  Every rule accepts exactly the states it accepted when the baseline was reviewed.");
    out.push("  This says nothing about the 35 rules with no mechanism; they have no observable");
    out.push("  acceptance predicate and nothing here would detect a semantic change to one.");
    process.stdout.write(out.join("\n") + "\n");
    return EXIT_OK;
  }

  out.push(`  ${drift.length} state(s) no longer reach the locked disposition:`);
  out.push("");
  for (const d of drift) {
    out.push(`    [${d.direction}] ${d.state}  (${d.rule})`);
    out.push(`      locked: ${d.was}`);
    out.push(`      now:    ${d.now}`);
    if (d.note) out.push(`      state:  ${d.note}`);
    out.push(
      d.direction === "widened"
        ? "      This rule now accepts a project it previously rejected. That is a weakening of the"
        : d.direction === "strengthened"
          ? "      This rule now rejects a project it previously accepted. Adopters become non-compliant"
          : "      This rule reaches a different disposition on the same project.",
    );
    out.push(
      d.direction === "widened"
        ? "      standard whether or not any catalog field moved."
        : d.direction === "strengthened"
          ? "      without having changed anything, which needs the same deliberate review."
          : "      The reason may be benign; the change is not automatically approved.",
    );
    out.push("");
  }
  out.push("  invariant.acceptance-locked — no verdict is produced while the framework's own");
  out.push("  acceptance semantics have moved without review.");
  out.push("");
  out.push("  If the change is intended: update artifacts/acceptance-baseline.json deliberately,");
  out.push("  record the reasoning in CHANGELOG.md, and say which direction each state moved.");
  process.stdout.write(out.join("\n") + "\n");
  return EXIT_BLOCKED;
}

if (import.meta.url === `file://${process.argv[1].split(path.sep).join("/")}` ||
    process.argv[1]?.endsWith("acceptance.mjs")) {
  main().then((code) => process.exit(code));
}
