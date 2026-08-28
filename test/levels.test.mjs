/**
 * The prose-to-catalog level check.
 *
 * WHAT THESE TESTS ARE FOR. This gate's value is entirely in what it refuses, and in what it
 * refuses to say. The five disagreements it now prevents stood from 1.0.0 with every run green,
 * so a test that only confirms today's green corpus would establish nothing: the corpus was green
 * before the check existed too. Each shape below is therefore asserted twice where it can be —
 * an input that must produce a finding, and the neighbouring input that must not.
 *
 * The false-positive shapes matter as much as the true positives. A naive modal scan flags every
 * prohibition entry and every quotation, and a check that cries wolf is a check somebody deletes.
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkLevels, loadStandards, normativeSentence, sectionsOf, modalOf, NOT_LEVEL_CHECKED,
} from "../scripts/levels.mjs";
import { loadCatalog } from "../scripts/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A minimal rule entry; only the fields this check reads. */
const rule = (over = {}) => ({
  id: "evaluation.fixture", kind: "requirement", standard: 99, requirement: "R1", ...over,
});

/** A standards Map holding one fixture document. */
const corpus = (body, n = 99) => new Map([[n, `# Standard ${n} — Fixture\n\n## Requirements\n\n${body}\n`]]);

// ---- 1. The repaired corpus, as it actually stands. ----

test("the repaired corpus has zero level disagreements", async () => {
  const catalog = await loadCatalog();
  const standards = await loadStandards(path.join(ROOT, "standards"));
  const { checked, notLevelChecked, findings } = checkLevels([...catalog.rules.values()], standards);

  assert.deepEqual(findings, [], "every catalog entry agrees with the section it names");
  assert.ok(checked.length > 0, "the check actually examined entries rather than skipping them all");
  assert.equal(checked.length + notLevelChecked.length, catalog.rules.size,
    "every rule is either level-checked or explicitly not level-checked; none falls through");
});

// ---- 2 & 3. The two disagreements this exists to catch. ----

test("a requirement whose section states SHOULD is a finding", () => {
  const { findings } = checkLevels(
    [rule({ kind: "requirement" })],
    corpus("### R1 — Fixture\n\n**A thing SHOULD happen.**\n\nSupporting prose."));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reason, "level-mismatch");
  assert.match(findings[0].detail, /expects "must"/);
});

test("a recommendation whose section states MUST is a finding", () => {
  const { findings } = checkLevels(
    [rule({ kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing MUST happen.**\n\nSupporting prose."));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reason, "level-mismatch");
  assert.match(findings[0].detail, /expects "should"/);
});

test("the matching pairs are green, so the finding above is about the modal and not the fixture", () => {
  const req = checkLevels([rule({ kind: "requirement" })],
    corpus("### R1 — Fixture\n\n**A thing MUST happen.**"));
  const rec = checkLevels([rule({ kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing SHOULD happen.**"));
  assert.deepEqual(req.findings, []);
  assert.deepEqual(rec.findings, []);
});

test("MUST NOT and SHOULD NOT carry the strength of their positive forms", () => {
  const ok = checkLevels([rule({ kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing SHOULD NOT happen.**"));
  const bad = checkLevels([rule({ kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing MUST NOT happen.**"));
  assert.deepEqual(ok.findings, []);
  assert.equal(bad.findings[0].reason, "level-mismatch");
});

// ---- 4. An anchor that does not resolve is a finding, never a skip. ----

test("an entry naming a section that does not exist is a finding", () => {
  const { checked, findings } = checkLevels(
    [rule({ requirement: "R99" })],
    corpus("### R1 — Fixture\n\n**A thing MUST happen.**"));
  assert.equal(findings.length, 1, "it is reported rather than passed over in silence");
  assert.equal(findings[0].reason, "unresolved-section");
  assert.deepEqual(checked, [], "and it is certainly not counted as agreeing");
});

test("an entry naming a standard that does not exist is a finding", () => {
  const { findings } = checkLevels([rule({ standard: 98 })], corpus("### R1 — X\n\n**A MUST b.**"));
  assert.equal(findings[0].reason, "unresolved-standard");
});

test("a section stating no normative sentence is a finding, not an assumed pass", () => {
  const { checked, findings } = checkLevels([rule()],
    corpus("### R1 — Fixture\n\nProse with no bold sentence at all."));
  assert.equal(findings[0].reason, "no-normative-sentence");
  assert.deepEqual(checked, []);
});

test("a bold sentence carrying no modal is a finding rather than a guess", () => {
  const { findings } = checkLevels([rule()],
    corpus("### R1 — Fixture\n\n**This states an intention without a modal verb.**"));
  assert.equal(findings[0].reason, "no-modal");
});

// ---- 5. The false-positive shapes measured by hand before this existed. ----

test("a modal in prose before the normative sentence is not read as the level", () => {
  // The shape that produced false positives when whole sections were scanned: a section whose
  // introduction discusses what a project SHOULD do before the bold sentence states MUST.
  const { findings } = checkLevels([rule({ kind: "requirement" })], corpus(
    "### R1 — Fixture\n\nTeams often ask what they SHOULD do here, and the answer is stronger\n"
    + "than a preference.\n\n**The thing MUST be recorded.**\n"));
  assert.deepEqual(findings, [], "the section's own claim decides, not the first modal token in it");
});

test("a modal inside a verbatim quotation is not read as the level", () => {
  // Standards 19 R3 and 20 R1 both quote the source immediately above their own sentence. The
  // quotation is somebody else's wording and cannot be allowed to set a level.
  const { findings } = checkLevels([rule({ kind: "recommendation" })], corpus(
    "### R1 — Fixture\n\nReproduced verbatim from the source:\n\n"
    + "> Require the thing. It MUST always be done, without exception.\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  assert.deepEqual(findings, []);
});

test("a modal inside a fenced example is not read as the level", () => {
  const { findings } = checkLevels([rule({ kind: "recommendation" })], corpus(
    "### R1 — Fixture\n\n```text\nthis MUST NOT be treated as the rule\n```\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  assert.deepEqual(findings, []);
});

test("a cross-reference to a stronger rule is not read as this rule's level", () => {
  const { findings } = checkLevels([rule({ kind: "recommendation" })], corpus(
    "### R1 — Fixture\n\n**The thing SHOULD be recorded.**\n\n"
    + "Standard 20 R1 MUST be satisfied before this one is meaningful, and Standard 18 R2\n"
    + "MUST NOT be read as weaker than it is.\n"));
  assert.deepEqual(findings, [], "only the section's own bold sentence is level evidence");
});

test("a #### subheading does not end the section or hide its sentence", () => {
  const secs = sectionsOf("### R1 — X\n\n**A MUST b.**\n\n#### Why\n\nMore.\n\n### R2 — Y\n\n**C SHOULD d.**\n");
  assert.deepEqual([...secs.keys()], ["R1", "R2"]);
  assert.match(secs.get("R1").join("\n"), /#### Why/);
  assert.equal(modalOf(normativeSentence(secs.get("R1"))), "must");
});

// ---- 6. Sections with no catalog entry are out of scope by construction. ----

test("prose sections with no catalog entry never become findings", () => {
  // The corpus is mostly unrepresented sections, and that is correct rather than broken. The walk
  // starts at the catalog, so they are not inputs — asserted here because a later rewrite that
  // walked the other way would look reasonable and report most of the corpus as defective.
  const many = ["### R1 — Represented\n\n**A MUST b.**"];
  for (let i = 2; i <= 40; i++) many.push(`### R${i} — Unrepresented\n\n**Something SHOULD happen.**`);
  const { checked, findings } = checkLevels([rule({ kind: "requirement" })], corpus(many.join("\n\n")));
  assert.deepEqual(findings, [], "thirty-nine unrepresented sections produce nothing");
  assert.deepEqual(checked, ["evaluation.fixture"], "and only the represented one was examined");
});

// ---- 7. Prohibitions produce no noise and are never treated as level evidence. ----

test("the real prohibition entries produce no findings", async () => {
  const catalog = await loadCatalog();
  const standards = await loadStandards(path.join(ROOT, "standards"));
  const prohibitions = [...catalog.rules.values()].filter((r) => r.kind === "prohibition");
  assert.ok(prohibitions.length > 0, "there are prohibitions to be quiet about");
  const { checked, notLevelChecked, findings } = checkLevels(prohibitions, standards);
  assert.deepEqual(findings, [], "the quotation convention produces no noise");
  assert.deepEqual(checked, [], "and none is counted as having been level-checked");
  assert.equal(notLevelChecked.length, prohibitions.length);
});

test("a prohibition is excluded by its kind, not by what its section happens to say", () => {
  // Two sections, identical but for the modal. Neither is examined, so nothing in a prohibition's
  // prose can be read as evidence about its level in either direction.
  const withMust = checkLevels([rule({ kind: "prohibition", requirement: "P1" })],
    corpus("### P1 — Fixture\n\n**The thing MUST NOT happen.**"));
  const withShould = checkLevels([rule({ kind: "prohibition", requirement: "P1" })],
    corpus("### P1 — Fixture\n\n**The thing SHOULD NOT happen.**"));
  const quoted = checkLevels([rule({ kind: "prohibition", requirement: "P1" })],
    corpus("### P1 — Fixture\n\nReproduced verbatim from the source:\n\n> never do the thing\n"));
  for (const r of [withMust, withShould, quoted]) {
    assert.deepEqual(r.findings, []);
    assert.deepEqual(r.checked, []);
    assert.equal(r.notLevelChecked.length, 1);
  }
});

test("MUTATION: without the prohibition exclusion, the quotation convention floods the report", () => {
  // Proves the exclusion is load-bearing rather than decorative. A prohibition section quotes its
  // must-never bullet and states no bold sentence of its own, so treating one as level-checkable
  // produces a finding immediately — which is the 21-false-positive result measured by hand.
  const asIfCheckable = rule({ kind: "requirement", requirement: "P1" });
  const { findings } = checkLevels([asIfCheckable],
    corpus("### P1 — Fixture\n\nReproduced verbatim from the source:\n\n> never do the thing\n"));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reason, "no-normative-sentence");
  assert.ok(NOT_LEVEL_CHECKED.has("prohibition"),
    "which is why prohibitions are excluded by kind before any of this runs");
});

// ---- The check reports, and does not adjudicate. ----

test("a disagreement is reported without naming a side as correct", () => {
  const { findings } = checkLevels([rule({ kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing MUST happen.**"));
  const text = `${findings[0].reason} ${findings[0].detail}`;
  assert.doesNotMatch(text, /\b(wrong|incorrect|should be raised|should be softened|fix the)\b/i,
    "which representation is in error is ADR 0011's and ADR 0012's decision, not a gate's");
});

test("no rule is exempt: there is no allowlist to add one to", async () => {
  // Comments are stripped first. The header says in prose that there is no allowlist, and a test
  // that cannot tell an instruction from a promise not to do it is not much of a test — the same
  // reasoning test/local-ci.test.mjs applies to the CI scripts' claim to contain no prune.
  const src = await (await import("node:fs/promises")).readFile(
    path.join(ROOT, "scripts/levels.mjs"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
    .filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.doesNotMatch(code, /allowlist|allowList|EXEMPT|exempt|ignoreRules|KNOWN_MISMATCH/,
    "the steady state is zero disagreements, so there is nowhere to record a permitted one");
});

test("two entries disagreeing the same way are both reported", () => {
  // The other way an exemption creeps in: reporting a shape once and suppressing repeats.
  const { findings } = checkLevels(
    [rule({ id: "a.one", kind: "recommendation" }), rule({ id: "a.two", kind: "recommendation" })],
    corpus("### R1 — Fixture\n\n**A thing MUST happen.**"));
  assert.deepEqual(findings.map((f) => f.id), ["a.one", "a.two"]);
});

// ---- 8. The ambiguity the first-match rule used to resolve silently. ----
//
// Measured against the checker as FE-33 shipped it: a section whose bold lead carries a modal is
// read as the rule's level even when the real normative sentence beneath states a different one.
// The gate then reported agreement for a rule whose prose and catalog genuinely disagree — the
// exact defect it was built to catch. Both shapes below passed; both must now be findings.

test("a requirement whose bold lead says MUST over a real sentence saying SHOULD is a finding", () => {
  const { findings } = checkLevels([rule({ kind: "requirement" })], corpus(
    "### R1 — Fixture\n\n**Every project MUST take this seriously.**\n\n"
    + "That framing sets up the rule, which is stated next.\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  assert.equal(findings.length, 1, "the section must not resolve to whichever span came first");
  assert.equal(findings[0].reason, "ambiguous-normative-sentence");
});

test("a recommendation whose bold lead says SHOULD over a real sentence saying MUST is a finding", () => {
  const { findings } = checkLevels([rule({ kind: "recommendation" })], corpus(
    "### R1 — Fixture\n\n**Teams SHOULD understand what follows.**\n\n"
    + "That framing sets up the rule, which is stated next.\n\n"
    + "**The thing MUST be recorded.**\n"));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].reason, "ambiguous-normative-sentence");
});

test("the ambiguity finding reports the competing spans without choosing between them", () => {
  const { findings } = checkLevels([rule({ kind: "requirement" })], corpus(
    "### R1 — Fixture\n\n**Every project MUST take this seriously.**\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  const detail = findings[0].detail;
  assert.match(detail, /MUST take this seriously/, "the reader is shown what competed");
  assert.match(detail, /SHOULD be recorded/);
  // Judge the checker's own words, not the prose it quotes back — the quoted spans are the
  // standard's sentences and may say anything. Same stripping discipline as the no-allowlist test.
  const said = detail.replace(/"[^"]*"/g, "");
  assert.doesNotMatch(said, /correct|wrong|intended|instead|the real|use the/i,
    "naming a winner would be the adjudication ADR 0013 decision 5 refuses");
});

test("bold spans that carry no modal are not competitors", () => {
  // Standards 15 R2, 19 R3 and 11 R6 all bold a defined term or an aside heading beside their
  // normative sentence. Counting every bold span rather than the modal-bearing ones would reject
  // legitimate prose across the live corpus, which was measured before this rule was written.
  const { findings } = checkLevels([rule({ kind: "requirement" })], corpus(
    "### R1 — Fixture\n\n**The thing MUST be recorded.**\n\n"
    + "The distinction between an **abstract manifest** and a **lock artifact** is what matters.\n\n"
    + "**A note on where this comes from.**\n"));
  assert.deepEqual(findings, [], "term emphasis and aside headings state no obligation");
});

test("a modal-bearing bold span inside a quotation or a fence is not a competitor", () => {
  const { findings } = checkLevels([rule({ kind: "recommendation" })], corpus(
    "### R1 — Fixture\n\n> **The source says this MUST always be done.**\n\n"
    + "```text\n**and this MUST NOT be read as the rule**\n```\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  assert.deepEqual(findings, [],
    "the exclusions that keep somebody else's sentence out also keep it out of the count");
});

test("ambiguity is a finding, not a silent skip: the entry is never counted as checked", () => {
  const { checked, findings } = checkLevels([rule({ kind: "requirement" })], corpus(
    "### R1 — Fixture\n\n**Every project MUST take this seriously.**\n\n"
    + "**The thing SHOULD be recorded.**\n"));
  assert.deepEqual(checked, []);
  assert.equal(findings.length, 1);
});

test("the real corpus has no ambiguous section", async () => {
  const catalog = await loadCatalog();
  const standards = await loadStandards(path.join(ROOT, "standards"));
  const { findings } = checkLevels([...catalog.rules.values()], standards);
  assert.deepEqual(findings.filter((f) => f.reason === "ambiguous-normative-sentence"), [],
    "every standard states its obligation once; the convention is met, not merely documented");
});
