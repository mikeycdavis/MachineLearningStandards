/**
 * Documentation conformance: the guide and the templates must describe the tool that exists.
 *
 * These are the cheapest tests in the repository and they defend against the most common decay.
 * Documentation rots silently — nothing fails when a command is renamed and the guide is not — and
 * a standards repository whose own guide describes a previous version has demonstrated the failure
 * it exists to prevent.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../scripts/yaml.mjs";
import { validate } from "../scripts/jsonschema.mjs";
import { loadCatalog } from "../scripts/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFile(path.join(ROOT, p), "utf8");

const guide = await read("INSTRUCTIONS.md");
const readme = await read("README.md");
const cli = await read("scripts/standards.mjs");
const catalog = await loadCatalog();

test("the guide names every subcommand the CLI implements", () => {
  const commands = [...cli.matchAll(/case "(\w+)": return await cmd/g)].map((m) => m[1]);
  assert.ok(commands.length >= 5, "the CLI implements the commands it is supposed to");
  for (const c of commands) {
    assert.ok(guide.includes(`standards ${c}`), `INSTRUCTIONS.md documents \`standards ${c}\``);
  }
});

test("the guide implements no command the CLI does not", () => {
  const commands = new Set([...cli.matchAll(/case "(\w+)": return await cmd/g)].map((m) => m[1]));
  for (const m of guide.matchAll(/`standards (\w+)`/g)) {
    assert.ok(commands.has(m[1]), `INSTRUCTIONS.md documents \`standards ${m[1]}\`, which does not exist`);
  }
});

test("every script the guide tells an adopter to run exists", () => {
  for (const m of guide.matchAll(/scripts\/([\w.-]+\.mjs)/g)) {
    assert.ok(existsSync(path.join(ROOT, "scripts", m[1])), `scripts/${m[1]} exists`);
  }
});

test("every local path the guide and README reference resolves", async () => {
  for (const [name, text] of [["INSTRUCTIONS.md", guide], ["README.md", readme]]) {
    for (const m of text.matchAll(/\[[^\]]+\]\((?!https?:)([^)#]+)/g)) {
      assert.ok(existsSync(path.join(ROOT, m[1])), `${name} links to ${m[1]}, which does not exist`);
    }
    for (const m of text.matchAll(/`((?:standards|rules|schemas|scripts|templates|artifacts|docs|design)\/[\w./-]+)`/g)) {
      const p = m[1].replace(/\/$/, "");
      assert.ok(existsSync(path.join(ROOT, p)), `${name} names ${m[1]}, which does not exist`);
    }
  }
});

test("every npm script the README names exists in package.json", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const m of readme.matchAll(/npm run ([\w:-]+)/g)) {
    assert.ok(m[1] in pkg.scripts, `README names \`npm run ${m[1]}\`, which package.json does not define`);
  }
});

test("the guide states the exit-code contract, including the invariant code", () => {
  assert.match(guide, /exit code/i);
  assert.match(guide, /blocked by an invariant/i);
  assert.match(guide, /\|\s*`3`\s*\|/, "exit 3 is documented in the table");
});

test("the guide tells adopters to gate on evaluate", () => {
  assert.match(guide, /gate .{0,30}on this/i);
});

test("the guide forbids copying the standards in", () => {
  assert.match(guide, /Do not copy the standards/i);
});

test("the guide separates not-applicable from an exception", () => {
  assert.match(guide, /never interchangeable|never substitute/i);
  assert.match(guide, /no subject/i);
  assert.match(guide, /knowingly (unmet|does not)/i);
});

test("the guide distinguishes the two unknown dispositions", () => {
  assert.match(guide, /insufficient-evidence/);
  assert.match(guide, /not-evaluated/);
  assert.match(guide, /remediation differs|Produce the evidence/i);
});

test("the guide states the tooling's current limitations", () => {
  const section = guide.slice(guide.search(/^##.*limitations/im));
  assert.ok(section.length > 0, "a limitations section exists");
  const rows = section.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-+/.test(l));
  assert.ok(rows.length >= 4, "and names at least three gaps besides the header row");
});

// ---- No hardcoded counts anywhere in documentation. ----

test("no document hardcodes a rule count", async () => {
  // Counts belong to the catalog and are derived at run time. A number typed into prose is a
  // second definition that goes stale the first time a rule is added.
  const docs = [
    ...(await readdir(path.join(ROOT, "standards"))).map((f) => `standards/${f}`),
    "README.md", "INSTRUCTIONS.md", "PROJECT.md",
  ];
  const forbidden = /\b(forty-five|45|twenty-one|21|eighteen|18)\s+(rules?|prohibitions?|requirements?|recommendations?)\b/i;
  for (const doc of docs) {
    // Fenced blocks are excluded: a sample of the tool's output has to look like output, and it is
    // legible as an illustration in a way a sentence is not. Everything outside a fence is prose
    // that a reader will take as current.
    const text = (await read(doc)).replace(/```[\s\S]*?```/g, "");
    const hit = text.match(forbidden);
    assert.equal(hit, null, `${doc} hardcodes a count in prose: "${hit?.[0]}"`);
  }
});

// ---- Templates must satisfy the framework they bootstrap. ----

test("the template policy satisfies the real schema", async () => {
  const schema = JSON.parse(await read("schemas/project-policy.schema.json"));
  const policy = parseYaml(await read("templates/project-policy.yml"));
  assert.deepEqual(validate(policy, schema), [], "init must not write a policy the validator rejects");
});

test("every rule id the template policy mentions, in prose or in YAML, is real", async () => {
  const text = await read("templates/project-policy.yml");
  for (const m of text.matchAll(/^#?\s{0,4}([a-z][a-z0-9]*\.[a-z0-9-]+):/gm)) {
    const id = m[1];
    if (!id.includes(".")) continue;
    assert.ok(catalog.rules.has(id) || catalog.invariants.has(id),
      `templates/project-policy.yml names ${id}, which the catalog does not define`);
  }
});

test("every template the init plan names exists", () => {
  const init = existsSync(path.join(ROOT, "scripts/init.mjs"));
  assert.ok(init);
});

test("the template policy example attests only an attestable rule", async () => {
  const text = await read("templates/project-policy.yml");
  const section = text.slice(text.indexOf("attestations:"));
  for (const m of section.matchAll(/^#\s{2,4}([a-z][a-z0-9]*\.[a-z0-9-]+):/gm)) {
    const rule = catalog.rules.get(m[1]);
    if (!rule) continue;
    assert.equal(rule.attestable, true, `the example attests ${m[1]}, which is not attestable`);
  }
});

test("the card templates carry the headings their detectors look for", async () => {
  const model = await read("templates/MODEL-CARD.md");
  for (const heading of ["Intended use", "Evaluation", "Limitations"]) {
    assert.match(model, new RegExp(`^##+\\s*${heading}`, "im"), `MODEL-CARD.md has a ${heading} section`);
  }
  // The baseline check accepts a heading or a row in a results table; the template uses the row,
  // which is where a baseline actually belongs. Assert what the detector accepts, not more.
  assert.ok(/^##+\s*.*[Bb]aseline/m.test(model) || /^\s*\|\s*[^|]*[Bb]aseline/m.test(model),
    "the template carries a baseline the evaluation check can find");

  const data = await read("templates/DATASET-CARD.md");
  for (const heading of ["Provenance", "Collection", "Exclusions"]) {
    assert.match(data, new RegExp(`^##+\\s*${heading}`, "im"), `DATASET-CARD.md has a ${heading} section`);
  }
});

test("a bootstrap document routes rather than restating the standards", async () => {
  // These should get SHORTER as the standards grow. Anything copied from a standard into a template
  // is a second definition, and the drift between them is silent.
  const agents = await read("templates/AGENTS.md");
  const claude = await read("templates/CLAUDE.md");
  const longest = (await readdir(path.join(ROOT, "standards")))
    .filter((f) => f.endsWith(".md"));
  const sizes = await Promise.all(longest.map(async (f) => (await read(`standards/${f}`)).length));
  const median = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)];

  assert.ok(agents.length < median, "AGENTS.md is shorter than a typical standard");
  assert.ok(claude.length < agents.length, "CLAUDE.md is shorter still, because it only points");
  assert.match(claude, /AGENTS\.md/, "and points at AGENTS.md");
  // Naming the load sequence as something AGENTS.md holds is a pointer. Listing its steps is a
  // second copy, and the copy is what drifts.
  assert.ok(!/^\s*\d\.\s/m.test(claude), "CLAUDE.md does not enumerate the load-sequence steps");
});

test("AGENTS.md names every source in the load sequence", async () => {
  const agents = await read("templates/AGENTS.md");
  for (const source of ["PROJECT.md", "project-policy.yml", "standards", "artifacts/project-plan-breakdown/", "artifacts/adr/"]) {
    assert.ok(agents.includes(source), `AGENTS.md names ${source}`);
  }
  assert.match(agents, /never rely on chat history/i);
  assert.match(agents, /the standard governs/i);
});
