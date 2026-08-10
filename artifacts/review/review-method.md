# Method for reviewing the normative corpus

Standing rules for any future audit of the standards themselves. Written after the first one,
because that review produced two false findings by the same mechanism and one reviewer making the
same mistake twice is a method defect rather than an accident.

## The rule that would have prevented both

> **A claim cannot be classified without reviewing the normative sentence together with its
> operative qualifications, definitions, scope, and worked examples.**

The bold sentence under an `### R` heading is not the claim. It is the claim's headline. The
paragraph beneath it routinely carries the condition that decides whether the claim is defensible,
and a reviewer who extracts sentences mechanically will find defects that the full text does not
have.

**This is the normative form of the use/mention problem the scanner had.** There, prose naming
scikit-learn was read as use of scikit-learn, and the fix was to give each detector one view of a
file and make it read the right one. Here, a normative sentence was read without its qualifications
and reported as unqualified. Both are a claim evaluated with its context stripped, and both produce
confident findings about something that was never said.

## The two instances

**N13 — Standard 22 R2's trigger taxonomy.** The review said "either time-based or evidence-based"
omits schema changes, deprecations and volume thresholds. It does not: those are all evidence. The
review had mistaken a two-term partition for a two-item list, which the surrounding prose makes
plain.

**N17 — Standard 1 R4's cost record.** The review said the standard names no acceptable minimal
form, so a project must either fabricate a number or write nothing. The paragraph directly beneath
the sentence reads *"Qualitative is sufficient where quantitative is unavailable"* and gives a worked
example.

Both were caught downstream — N13 in disposition, N17 in replay — which is the layered process
working. Neither should have reached those stages.

## Procedure

1. **Read the whole section.** Heading, normative sentence, every paragraph before the next heading,
   and any table or example the section points at.
2. **Read the catalog entry beside it.** `description`, `evidenceExpected`, `remediation` and the
   assurance note are operative text. N10 turned on this: the catalog's `evidenceExpected` was
   already correct while the standard's prose and the detector disagreed with it, and a review that
   read only one of the three would have reached the wrong conclusion about which needed changing.
3. **Read the cross-references the section makes.** Several obligations are deliberately routed to
   a neighbouring standard rather than restated, and a claim that looks incomplete alone is often
   complete across the pair.
4. **State the exact text being classified**, quoted, in the finding. A finding that paraphrases is
   a finding whose subject cannot be checked.
5. **Classify only then.**

## Two things a review does not get to do

**Classify a standard.** The unit is the claim. "Standard 11 is fine" is not reviewable; "11 R3 is
established, 11 R1 collides with 05 R2" is.

**Propose the remedy in the same act as the finding.** Finding and disposition are separate stages
on purpose. The first normative review produced eighteen findings and one of them supported changing
an existing claim; a process that had drafted fixes while finding them would have produced eighteen
fixes and defended them.

## What the downstream stages exist to catch

Recorded so nobody removes them as redundant:

- **Disposition** asks for a counterexample to the remedy. It reversed the direction of the fix for
  N1, narrowed six, and killed N11 and N13.
- **Replay** asks what project's disposition moves. It caught N6 misclassified as a clarification
  when it added an obligation, and rejected N17.

Twelve supported dispositions entered replay and seven survived. The stages are not ceremony.
