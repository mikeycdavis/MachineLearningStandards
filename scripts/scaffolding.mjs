/**
 * Scaffolding recognition: framework-generated artifacts must not satisfy the requirements they
 * were generated to help someone meet.
 *
 * WHY THIS EXISTS. The first adoption found that running `standards init` on a real repository
 * flipped three required rules from failing to passed, with no work done on the project at all. The
 * document that satisfied evaluation.baseline-exists was a table row reading "Baseline — REPLACE
 * with the strongest simple thing that could reasonably work". The bootstrap wrote the evidence its
 * own evaluator then accepted.
 *
 * That is the standards-system form of leakage:
 *
 *     init creates a placeholder → the detector observes it → the placeholder becomes evidence
 *       → the rule passes → the score rises with no improvement to the project
 *
 * The fix is deliberately general rather than three special cases, because otherwise the same
 * architectural hole stays open for every template added later. Two independent signals, because
 * either alone can be defeated by an author who deletes a line or by a template that forgets one:
 *
 *   1. An explicit marker every generated document carries until a human removes it.
 *   2. Substance: a section whose body is empty, or contains only placeholder text, is not a
 *      section that answers anything.
 *
 * Neither signal treats a genuinely completed document as scaffolding, which matters as much as the
 * converse — a check that rejected real work would be turned off within a week.
 */

/**
 * The marker every template carries. An author removes it when the document is real, and the
 * instruction to do so is written beside it in every template.
 */
export const SCAFFOLD_MARKER = "standards:scaffold";

/** Placeholder text a template leaves behind for a human to replace. */
const PLACEHOLDER = /REPLACE[-\s]?ME|REPLACE\s+with|\bTBD\b|\bFILL\s*IN\b|^\s*\.\.\.\s*$/i;

/** Strip HTML comments: template guidance lives in them and is not document content. */
const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, "");

/** A markdown table separator, or a row whose every cell is empty. */
const isEmptyTableRow = (line) =>
  /^\s*\|[\s|:-]*\|\s*$/.test(line) || /^\s*\|(\s*\|)+\s*$/.test(line);

/** Does this document still carry the marker `standards init` wrote into it? */
export function isScaffold(text) {
  return text.includes(SCAFFOLD_MARKER);
}

/**
 * Extract the body of a section: everything after a heading matching `headingRe`, up to the next
 * heading at the same or a higher level. Returns null when the heading is absent.
 */
export function sectionBody(text, headingRe) {
  const lines = stripComments(text).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{2,6})\s+(.*)$/);
    if (!m) continue;
    if (!headingRe.test(lines[i])) continue;
    const level = m[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].match(/^(#{2,6})\s+/);
      if (next && next[1].length <= level) break;
      body.push(lines[j]);
    }
    return body.join("\n");
  }
  return null;
}

/**
 * Does this section body say anything?
 *
 * A line counts as substance when it is not blank, not a placeholder, not an empty table row, and
 * carries at least a few characters of actual text. The threshold is deliberately low: the check is
 * meant to catch a document nobody has written yet, not to grade the writing.
 */
export function isSubstantive(body) {
  if (body === null || body === undefined) return false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    if (isEmptyTableRow(line)) continue;
    if (PLACEHOLDER.test(line)) continue;
    // Strip table pipes and list markers before measuring, so `| | |` and `-` do not count.
    const content = line.replace(/[|>*_`-]/g, "").trim();
    if (content.length >= 12) return true;
  }
  return false;
}

/**
 * The question every document detector should ask: does this document actually answer the section
 * the rule is about?
 *
 * Returns { satisfied, reason }. `reason` is carried into the finding so a reader is told the
 * difference between "you have no model card" and "your model card is still the template", which
 * are different pieces of work.
 */
export function documentAnswers(text, headingRe, templates = []) {
  if (isScaffold(text)) {
    return { satisfied: false, reason: "is still the generated template and has not been completed" };
  }
  if (matchesShippedTemplate(text, templates)) {
    return { satisfied: false, reason: "is the shipped template with the marker removed and nothing else changed" };
  }
  const body = sectionBody(text, headingRe);
  if (body === null) {
    return { satisfied: false, reason: "has no section answering this" };
  }
  if (!isSubstantive(body)) {
    return { satisfied: false, reason: "has the section, but its body is empty or still placeholder text" };
  }
  return { satisfied: true, reason: "answers this" };
}

/**
 * Evaluate a set of candidate documents. Satisfied when any one of them answers the heading.
 * Returns the reasons from the rest so the finding can say what was found and why it did not count.
 */
/**
 * Third signal: the document is the shipped template with the marker deleted.
 *
 * The first two signals leave a gap, and a test found it. A template's guidance prose is itself
 * substantive text — "What this model does not do, the conditions under which it performs worse" is
 * a real sentence — so deleting the marker and changing nothing else would pass the substance
 * check. Comparing against what the framework ships closes that, and it is the case an author is
 * most likely to reach by accident.
 *
 * Compared on normalised prose so that whitespace and heading tweaks do not defeat it, and requires
 * a high overlap rather than equality, so that a genuinely edited document is not caught.
 */
export function matchesShippedTemplate(text, templates) {
  if (!templates || templates.length === 0) return false;
  const normalise = (s) =>
    stripComments(s).toLowerCase().replace(/\s+/g, " ").trim();
  const subject = normalise(text);
  if (subject.length === 0) return false;
  for (const template of templates) {
    const candidate = normalise(template);
    if (candidate.length === 0) continue;
    // Lines the author has not touched, as a share of the template's lines.
    const templateLines = new Set(
      stripComments(template).split("\n").map((l) => l.trim()).filter((l) => l.length > 20),
    );
    if (templateLines.size === 0) continue;
    const subjectLines = new Set(
      stripComments(text).split("\n").map((l) => l.trim()).filter((l) => l.length > 20),
    );
    let shared = 0;
    for (const line of templateLines) if (subjectLines.has(line)) shared++;
    if (shared / templateLines.size >= 0.9) return true;
  }
  return false;
}

export function anyDocumentAnswers(documents, headingRe, templates = []) {
  const reasons = [];
  for (const doc of documents) {
    const verdict = documentAnswers(doc.text, headingRe, templates);
    if (verdict.satisfied) return { satisfied: true, by: doc.path, reasons: [] };
    reasons.push(`${doc.path} ${verdict.reason}`);
  }
  return { satisfied: false, by: null, reasons };
}
