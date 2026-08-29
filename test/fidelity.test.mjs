/**
 * The verbatim-source claim check.
 *
 * WHAT THESE TESTS ARE FOR. This gate holds a document to its own word: where a standard says the
 * block beneath is source text, this falsifies that. Its value is therefore in what it refuses,
 * and it had a hole. A claim whose following material was not a fence, blockquote or list resolved
 * to no block at all and was passed over — not counted, not reported — so a document could assert
 * that a paragraph was source text, be wrong, and leave the run at 25 claims checked, 0 unverified,
 * exit 0. That shape is fixture 1 below.
 *
 * Closing it made claim recognition load-bearing in a way it was not before. While an unresolved
 * claim was skipped, a regex that over-matched cost nothing; once it is a finding, every sentence
 * the regex wrongly calls a claim becomes a false failure. False positives are the historically
 * shipped bug class here, so the recognition fixtures matter as much as the missing-block one.
 *
 * The live corpus cannot carry these tests. All 25 of its claims are the same string above the same
 * form — a blockquote — so fence and list acceptance, and every rejection shape, exist only here.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { check, loadDocs, normalize, blockAfter, CLAIM_RE } from "../scripts/fidelity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = path.join(ROOT, "artifacts/prompts/ml-standards-spec.md");

/** A one-document corpus. */
const doc = (body) => new Map([["99-fixture.md", `# Standard 99 — Fixture\n\n${body}\n`]]);

/** Source text the fixtures quote from, so the comparison has something true to find. */
const SOURCE = "Never train on future information that would not be available at prediction time.";

// ---- 1. The live corpus, which must stay exactly as it is. ----

test("the live corpus verifies: 25 claims, none unverified", async () => {
  const { claims, failures } = check(
    await loadDocs(path.join(ROOT, "standards")), await readFile(SPEC, "utf8"));
  assert.equal(claims, 25, "every claim in the corpus is recognised and checked");
  assert.deepEqual(failures, [], "and every one of them is genuinely verbatim");
});

test("no recognised claim in the corpus lacks a supported block", async () => {
  const { failures } = check(
    await loadDocs(path.join(ROOT, "standards")), await readFile(SPEC, "utf8"));
  assert.deepEqual(failures.filter((f) => f.kind === "no-block"), []);
});

// ---- 2. The measured false pass. ----

test("a claim above a plain paragraph is a finding, not a silent skip", () => {
  // Measured against the shipped checker before this existed: 25 claims, 0 unverified, exit 0,
  // over a paragraph that appears nowhere in the source.
  const { claims, failures } = check(doc(
    "Reproduced verbatim from the source:\n\n"
    + "This text is not in the source spec at all and was never written by anyone.\n"), SOURCE);
  assert.equal(failures.length, 1, "the claim must not vanish");
  assert.equal(failures[0].kind, "no-block");
  assert.equal(claims, 0, "and it must not be counted as a claim that was checked");
});

test("a claim at the very end of a document is a finding too", () => {
  const { failures } = check(doc("Reproduced verbatim from the source:\n"), SOURCE);
  assert.equal(failures[0].kind, "no-block", "nothing to check is not the same as nothing wrong");
});

// ---- 3. The three supported forms, none of which the live corpus can prove but one. ----

test("a claim above a blockquote is checked and verifies", () => {
  const { claims, failures } = check(doc(`Reproduced verbatim from the source:\n\n> ${SOURCE}\n`), SOURCE);
  assert.equal(claims, 1);
  assert.deepEqual(failures, []);
});

test("a claim above a fenced block is checked and verifies", () => {
  const { claims, failures } = check(doc(
    `Reproduced verbatim from the source:\n\n\`\`\`text\n${SOURCE}\n\`\`\`\n`), SOURCE);
  assert.equal(claims, 1);
  assert.deepEqual(failures, []);
});

test("a claim above a bullet list is checked and verifies", () => {
  const { claims, failures } = check(doc(`Reproduced verbatim from the source:\n\n- ${SOURCE}\n`), SOURCE);
  assert.equal(claims, 1);
  assert.deepEqual(failures, []);
});

test("each supported form still fails when the quotation is edited", () => {
  const edited = SOURCE.replace("future information", "`future information`");
  for (const [form, body] of [
    ["quote", `> ${edited}`],
    ["fence", "```text\n" + edited + "\n```"],
    ["list", `- ${edited}`],
  ]) {
    const { failures } = check(doc(`Reproduced verbatim from the source:\n\n${body}\n`), SOURCE);
    assert.equal(failures.length, 1, `${form}: an added backtick is exactly what this catches`);
    assert.equal(failures[0].kind, form);
  }
});

// ---- 4. Recognition: prose about the source is not a claim about a block. ----

test("prose that merely ends in \"from the source\" is not a claim", () => {
  // Both shapes were measured against the previous regex, which matched them. While an unresolved
  // claim was skipped they were harmless; once it is a finding they would be false failures.
  for (const line of [
    "This requirement differs from the source",
    "Nothing here is inherited from the source,",
    "R2 is an addition beyond what is required from the source",
    "From the source, this standard adds nothing.",
    "This differs from the source:",
  ]) {
    assert.equal(CLAIM_RE.test(line), false, `recognised as a claim: ${line}`);
    const { claims, failures } = check(doc(`${line}\n\nOrdinary prose follows and is not quoted.\n`), SOURCE);
    assert.deepEqual(failures, [], `produced a finding: ${line}`);
    assert.equal(claims, 0);
  }
});

test("a statement that something is NOT reproduced is not a claim", () => {
  const line = "The wording below is not reproduced verbatim from the source.";
  assert.equal(CLAIM_RE.test(line), false);
  assert.deepEqual(check(doc(`${line}\n\nAuthored prose.\n`), SOURCE).failures, []);
});

test("the announcing forms are still recognised", () => {
  for (const line of [
    "Reproduced verbatim from the source:",
    "From the source:",
    "The three kinds, quoted verbatim from the source:",
  ]) assert.equal(CLAIM_RE.test(line), true, `no longer recognised: ${line}`);
});

test("a claim indented inside a list item is still recognised", () => {
  assert.equal(CLAIM_RE.test("  Reproduced verbatim from the source:".trim()), true);
});

// ---- 5. Comparison semantics, which this item does not touch. ----

test("normalization collapses wrapping only; backticks and wording stay significant", () => {
  assert.equal(normalize("> one two\n> three"), "one two three", "line wrapping is collapsed");
  assert.notEqual(normalize("> a `b` c"), normalize("> a b c"), "backticks are not normalized away");
  assert.notEqual(normalize("> a — b"), normalize("> a - b"), "dashes are not normalized away");
});

test("blockAfter still pairs positionally: the block immediately after the claim", () => {
  const lines = ["Reproduced verbatim from the source:", "", "> quoted", "", "Prose after.",
    "", "```text", "a later fence", "```"];
  const b = blockAfter(lines, 1);
  assert.equal(b.kind, "quote", "the block immediately after the claim, not a later one");
  assert.match(b.text, /quoted/);
  assert.doesNotMatch(b.text, /later fence/, "it takes one block, not everything that follows");
  // A blank line inside a blockquote run does not end it; that is existing behaviour and stays.
  assert.match(blockAfter(["c:", "", "> one", "", "> two"], 1).text, /two/);
});
