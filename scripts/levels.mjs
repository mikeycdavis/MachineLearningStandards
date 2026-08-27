#!/usr/bin/env node
/**
 * Level agreement: a catalog entry and the standard section it names state the same strength.
 *
 * WHY THIS EXISTS. Three links carry a claim from one representation to another in this
 * repository. Two were already mechanical: `scripts/fidelity.mjs` holds every "reproduced
 * verbatim" claim to the source spec, and `scripts/integrity.mjs` locks the catalog against
 * `artifacts/catalog-baseline.json`. The third — a standard's prose against its own catalog entry
 * — had no guard at all. `integrity.mjs` never opens `standards/`; `fidelity.mjs` never opens
 * `rules/`. Nothing compared a section's modal verb to its entry's kind.
 *
 * The cost was measured rather than imagined. Five rules stated `MUST` in prose while their
 * entries said `recommendation`, from 1.0.0 until they were repaired, and no run ever went red.
 * A guard built now cannot catch those; it catches the next one, which is the only kind of guard
 * worth building.
 *
 * WHAT IT CHECKS, AND IN WHICH DIRECTION. Catalog entry → the prose section it names, never the
 * reverse. Every entry carries `standard` and `requirement`, so the target section is named and
 * not inferred.
 *
 * WHAT IT DOES NOT CHECK, stated because a guard that hides its reach is the failure this
 * repository exists to prevent:
 *
 *   - **Prose sections with no catalog entry.** Most sections have none, and that is not a defect:
 *     the catalog has never been a projection of the prose, and `frameworkCoverage` exists to
 *     report the shortfall beside the verdict. They are out of scope BY CONSTRUCTION — the walk
 *     starts at the catalog, so an unrepresented section is never an input. A checker that walked
 *     the other way would report most of the corpus as broken.
 *
 *   - **Prohibitions.** A `## Prohibitions` section quotes its must-never bullet verbatim and
 *     carries no bolded modal at all, so the test below would flag every prohibition entry. That
 *     was measured: applied naively it flags all of them, which is not a check but noise that
 *     someone eventually switches off. Their prose is not unguarded — `fidelity.mjs` holds the
 *     quotation to the source — but establishing a *level* convention for them is separate work
 *     that has not been done, so nothing here is treated as evidence about a prohibition's level.
 *
 *   - **Whether the level is correct.** This reports agreement, never adjudication. Which
 *     representation governs is ADR 0011's decision, and the direction to repair any individual
 *     disagreement is ADR 0012's. A checker that picked a side would be making a normative
 *     decision inside a gate.
 *
 * THE CONVENTION IT BINDS TO. A requirement or recommendation section opens with its normative
 * sentence in bold. That sentence, and nothing else in the section, states the obligation's
 * strength. Binding to it is what keeps quotations, contrasting examples, worked illustrations and
 * cross-references from being read as level evidence — scanning whole sections instead produced
 * false positives when this was first measured by hand.
 *
 * NO ALLOWLIST. The expected steady state is zero disagreements. A rule permitted to disagree
 * would be a rule whose level depends on which file you opened, which is the condition this
 * exists to end.
 *
 * A SECTION THAT CANNOT BE RESOLVED IS A FINDING. Not a skip. An entry naming a standard or a
 * section that does not exist has lost its subject, and silence about that is how the previous gap
 * survived.
 *
 * Usage:
 *   node scripts/levels.mjs           report, exit 1 on any disagreement
 *   node scripts/levels.mjs --json    machine-readable
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The strength each kind's prose must state. Prohibitions are absent deliberately — see header. */
export const EXPECTED_MODAL = { requirement: "must", recommendation: "should" };

/** Kinds this check deliberately says nothing about. */
export const NOT_LEVEL_CHECKED = new Set(["prohibition", "invariant"]);

/**
 * Split a standard into its `### R<n>` / `### P<n>` sections.
 * A `####` subheading belongs to the section above it and does not end it.
 */
export function sectionsOf(text) {
  const lines = text.split("\n");
  const out = new Map();
  let key = null, from = 0;
  const close = (to) => { if (key !== null) out.set(key, lines.slice(from, to)); };
  for (let i = 0; i < lines.length; i++) {
    const m = /^### ([RP]\d+)\s/.exec(lines[i]);
    if (m) { close(i); key = m[1]; from = i + 1; continue; }
    if (/^## /.test(lines[i]) || /^### /.test(lines[i])) { close(i); key = null; }
  }
  close(lines.length);
  return out;
}

/**
 * The section's normative sentence: the first bold span that is neither inside a fenced block nor
 * inside a blockquote. Quoted source text is excluded precisely because it is somebody else's
 * sentence — the standard's own claim is what carries its level.
 */
export function normativeSentence(bodyLines) {
  const kept = [];
  let fenced = false;
  for (const line of bodyLines) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    if (/^\s*>/.test(line)) continue;
    kept.push(line);
  }
  const m = /\*\*([\s\S]+?)\*\*/.exec(kept.join("\n"));
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

/** The strength a normative sentence states, or null when it states none. */
export function modalOf(sentence) {
  if (/\bMUST\b/.test(sentence)) return "must";
  if (/\bSHOULD\b/.test(sentence)) return "should";
  return null;
}

/**
 * Compare every level-checked entry against the section it names.
 * `standards` is a Map of standard number → file text, so callers may supply fixtures.
 */
export function checkLevels(rules, standards) {
  const findings = [];
  const checked = [];
  const notLevelChecked = [];
  const parsed = new Map();

  for (const rule of rules) {
    const where = `${rule.id} (standard ${rule.standard} ${rule.requirement})`;
    if (NOT_LEVEL_CHECKED.has(rule.kind)) { notLevelChecked.push(rule.id); continue; }

    const expected = EXPECTED_MODAL[rule.kind];
    if (!expected) {
      findings.push({ id: rule.id, reason: "unknown-kind", where, detail: `kind "${rule.kind}"` });
      continue;
    }
    const text = standards.get(rule.standard);
    if (text === undefined) {
      findings.push({ id: rule.id, reason: "unresolved-standard", where,
        detail: `no standard numbered ${rule.standard}` });
      continue;
    }
    if (!parsed.has(rule.standard)) parsed.set(rule.standard, sectionsOf(text));
    const body = parsed.get(rule.standard).get(rule.requirement);
    if (body === undefined) {
      findings.push({ id: rule.id, reason: "unresolved-section", where,
        detail: `standard ${rule.standard} has no section ${rule.requirement}` });
      continue;
    }
    const sentence = normativeSentence(body);
    if (sentence === null) {
      findings.push({ id: rule.id, reason: "no-normative-sentence", where,
        detail: "the section states no bold normative sentence outside quotations" });
      continue;
    }
    const modal = modalOf(sentence);
    if (modal === null) {
      findings.push({ id: rule.id, reason: "no-modal", where, detail: sentence.slice(0, 120) });
      continue;
    }
    if (modal !== expected) {
      findings.push({ id: rule.id, reason: "level-mismatch", where,
        detail: `catalog says ${rule.kind}, which expects "${expected}"; the section states `
              + `"${modal}" — ${sentence.slice(0, 100)}` });
      continue;
    }
    checked.push(rule.id);
  }
  return { checked, notLevelChecked, findings };
}

/** Read `standards/` into the Map `checkLevels` expects. */
export async function loadStandards(dir) {
  const standards = new Map();
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
    const n = Number.parseInt(file, 10);
    if (Number.isNaN(n)) continue;
    standards.set(n, await readFile(path.join(dir, file), "utf8"));
  }
  return standards;
}

async function main() {
  const { loadCatalog } = await import("./catalog.mjs");
  const catalog = await loadCatalog();
  const standards = await loadStandards(path.join(ROOT, "standards"));
  const rules = [...catalog.rules.values()];
  const { checked, notLevelChecked, findings } = checkLevels(rules, standards);

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(
      { checked: checked.length, notLevelChecked: notLevelChecked.length, findings,
        ok: findings.length === 0 }, null, 2) + "\n");
    return findings.length === 0 ? 0 : 1;
  }

  const out = ["Level agreement (catalog entry against the section it names)", ""];
  out.push(`  Entries level-checked:   ${checked.length}`);
  out.push(`  Disagreements:           ${findings.length}`);
  out.push(`  Not level-checked:       ${notLevelChecked.length}  (prohibitions and invariants; `
         + `their sections quote the source rather than stating a modal, so nothing here is `
         + `evidence about their level)`);
  out.push("");
  for (const f of findings) {
    out.push(`! ${f.where}  [${f.reason}]`);
    out.push(`    ${f.detail}`);
    out.push("");
  }
  if (findings.length > 0) {
    out.push("A rule's level depends on which file you opened. This check reports the");
    out.push("disagreement and does not decide which side is wrong: the catalog states a rule's");
    out.push("level and the prose states the rule (ADR 0011), and the direction to repair any");
    out.push("individual disagreement is a normative decision (ADR 0012), not a gate's to take.");
  } else {
    out.push("Every level-checked entry agrees with the section it names.");
    out.push("Sections with no catalog entry are out of scope by construction: this walks from the");
    out.push("catalog outward, so an unrepresented section is never an input to it.");
  }
  process.stdout.write(out.join("\n") + "\n");
  return findings.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("levels.mjs")) {
  main().then((code) => process.exit(code), (err) => {
    process.stderr.write(`levels: ${err.message}\n`);
    process.exit(2);
  });
}
