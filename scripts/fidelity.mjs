#!/usr/bin/env node
/**
 * Verify that every block a standard claims is verbatim source actually is.
 *
 * VENDORED. Originally written for the author's EngineeringStandards repository and copied here,
 * not depended upon. See artifacts/adr/0001-standalone-domain-first-design.md.
 *
 * WHY THIS EXISTS. In that repository, quoted source text was twice rendered with backticks added
 * around identifiers. Each time the document still claimed the text was reproduced verbatim, and
 * each time it was caught by a hand-written check that happened to look. Twice is a failure mode,
 * not a mistake, so this makes it mechanical.
 *
 * It matters more here. The twenty-three must-never rules are quoted into the standards from the
 * specification, and a prohibition that has been paraphrased is a prohibition that no longer says
 * what its author wrote.
 *
 * WHAT IT CHECKS. Only blocks whose claim is explicit. A standard that announces "Reproduced
 * verbatim from the source:" immediately before a fenced block, blockquote, or bullet list is
 * asserting something falsifiable; this falsifies it. Authored content makes no such claim and is
 * not checked — the point is to hold the document to its own word, not to forbid original writing.
 * The claim grammar and the block forms are stated for authors in design/architecture.md §14; this
 * file is not the only place they live.
 *
 * A CLAIM WITH NOTHING TO CHECK IS A FINDING. Where the material after a claim is none of the three
 * forms, this used to resolve to no block and `continue` — the claim was neither counted nor
 * reported. A probe measured the cost: a section announcing a quotation above an ordinary paragraph
 * absent from the specification left the run at 25 claims checked, 0 unverified, exit 0. An
 * assertion nothing can falsify is not an assertion that passed.
 *
 * Closing that made claim recognition load-bearing. While an unresolvable claim was skipped, a
 * regex that over-matched cost nothing; once it is a finding, every sentence wrongly called a claim
 * is a false failure. Recognition was tightened first, and separately, for that reason.
 *
 * NORMALIZATION. Line wrapping differs between a standard and its source, so both sides are
 * collapsed to single-spaced text before comparison. Backticks, punctuation, and wording are NOT
 * normalized away — those are exactly what this exists to catch.
 *
 * Usage:
 *   node scripts/fidelity.mjs           report, exit 1 on any unverified claim
 *   node scripts/fidelity.mjs --json    machine-readable
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "artifacts/prompts/ml-standards-spec.md");
const JSON_OUT = process.argv.includes("--json");

/**
 * A line announcing that the block beneath it is source text.
 *
 * Two conditions, and both are load-bearing. It must **end in a colon**, because a claim announces
 * what follows rather than describing it; and it must **assert reproduction** — contain "reproduced"
 * or "verbatim" alongside "from the source" — or be the bare announcement "From the source:".
 *
 * The previous form accepted any line merely ending in "from the source", optionally with a comma.
 * That matched `This requirement differs from the source` and `Nothing here is inherited from the
 * source,`, which assert the opposite of a verbatim claim. It cost nothing while an unresolvable
 * claim was skipped in silence. It cannot survive that skip becoming a finding: every sentence
 * wrongly called a claim would be a false failure, and false positives are the bug class this
 * repository ships hardest against.
 *
 * All 25 claims in the corpus are the same string — `Reproduced verbatim from the source:` — and
 * all 25 are still recognised. What is no longer recognised is a derivation verb without a
 * reproduction word (`Quoted from the source:`) and a claim ended with a full stop rather than a
 * colon; both are stated in design/architecture.md §14 so an author can write the recognised form.
 */
export const CLAIM_RE =
  /^(?:.*\b(?:reproduced|verbatim)\b.*from\s+the\s+source|from\s+the\s+source)\s*:\s*$/i;

export const normalize = (s) =>
  s
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*>\s?/, "").replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Collect the block immediately following a claim: a fenced block, a blockquote run, or a bullet
 * list. Prose paragraphs are skipped — a claim followed by explanation rather than a quotation is
 * not making a checkable assertion about a specific block.
 */
export function blockAfter(lines, start) {
  let i = start;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return null;

  if (lines[i].trim().startsWith("```")) {
    const body = [];
    i++;
    while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
    return { kind: "fence", text: body.join("\n"), line: start + 1 };
  }
  if (lines[i].trim().startsWith(">")) {
    const body = [];
    while (i < lines.length && (lines[i].trim().startsWith(">") || lines[i].trim() === "")) {
      if (lines[i].trim() === "" && !(lines[i + 1] ?? "").trim().startsWith(">")) break;
      body.push(lines[i++]);
    }
    return { kind: "quote", text: body.join("\n"), line: start + 1 };
  }
  if (/^\s*[-*]\s+/.test(lines[i])) {
    const body = [];
    while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) body.push(lines[i++]);
    return { kind: "list", text: body.join("\n"), line: start + 1 };
  }
  return null;
}

/**
 * Compare every claim in `docs` against `sourceText`.
 * `docs` is a Map of file name → text, so callers may supply fixtures.
 */
export function check(docs, sourceText) {
  const sourceNorm = normalize(sourceText);
  const failures = [];
  let claims = 0;

  for (const [file, text] of docs) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!CLAIM_RE.test(lines[i].trim())) continue;
      const block = blockAfter(lines, i + 1);
      if (!block) {
        // The hole this check had. A claim whose following material is not a fence, blockquote or
        // list used to be passed over — not counted, not reported — so a document could assert
        // that a paragraph was source text, be wrong, and leave the run green. Nothing to check is
        // not the same as nothing wrong.
        failures.push({
          file: `standards/${file}`,
          line: i + 1,
          kind: "no-block",
          diverges: "no fenced block, blockquote or list follows this claim",
          claimed: lines[i].trim().slice(0, 160),
        });
        continue;
      }
      claims++;
      const norm = normalize(block.text);
      if (!norm || sourceNorm.includes(norm)) continue;

      // Report the first fragment that diverges, so the message points at the actual edit.
      const words = norm.split(" ");
      let longest = "";
      for (let a = 0; a < words.length; a++) {
        for (let b = words.length; b > a; b--) {
          const frag = words.slice(a, b).join(" ");
          if (frag.length > longest.length && sourceNorm.includes(frag)) longest = frag;
        }
      }
      const cut = longest ? norm.indexOf(longest) + longest.length : 0;
      failures.push({
        file: `standards/${file}`,
        line: block.line,
        kind: block.kind,
        diverges: norm.slice(cut, cut + 120).trim() || norm.slice(0, 120),
        claimed: norm.slice(0, 160),
      });
    }
  }
  return { claims, failures };
}

/** Read `standards/` into the Map `check` expects. */
export async function loadDocs(dir) {
  const docs = new Map();
  for (const file of (await readdir(dir)).filter((f) => /^\d\d-.*\.md$/.test(f)).sort()) {
    docs.set(file, await readFile(path.join(dir, file), "utf8"));
  }
  return docs;
}

async function main() {
  const { claims, failures } = check(
    await loadDocs(path.join(ROOT, "standards")),
    await readFile(SOURCE, "utf8"),
  );

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ claims, failures, ok: failures.length === 0 }, null, 2) + "\n");
    process.exit(failures.length === 0 ? 0 : 1);
  }

  const out = [`Verbatim claims checked: ${claims}`, `Unverified claims:       ${failures.length}`, ""];
  for (const f of failures) {
    out.push(`! ${f.file}:${f.line} (${f.kind})`);
    out.push(`    claimed verbatim: ${f.claimed}${f.claimed.length >= 160 ? "…" : ""}`);
    out.push(`    diverges at:      ${f.diverges}`);
    out.push("");
  }
  if (failures.some((f) => f.kind !== "no-block")) {
    out.push("A block claimed as source text does not appear in the source. The usual cause is");
    out.push("formatting added to the quotation — backticks around an identifier, a changed dash, a");
    out.push("reworded line. Reproduce the source exactly, or drop the verbatim claim.");
    out.push("");
  }
  if (failures.some((f) => f.kind === "no-block")) {
    out.push("A claim announced source text and nothing checkable followed it. Put the quotation in");
    out.push("a fenced block, a blockquote or a bullet list directly beneath the claim, or drop the");
    out.push("claim — a sentence saying the text is verbatim, with no block to test, is an assertion");
    out.push("nothing can falsify. The contract is design/architecture.md §14.");
  }
  if (failures.length === 0) {
    out.push("Every block claimed as source text appears in the source.");
  }
  process.stdout.write(out.join("\n") + "\n");
  return failures.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("fidelity.mjs")) {
  main().then((code) => process.exit(code), (err) => {
    process.stderr.write(`fidelity: ${err.message}\n`);
    process.exit(2);
  });
}
