# What this backlog does and does not cover

<!-- Hand-authored. README.md in this directory is generated; anything written there is
     overwritten by the next backlog run, so scope notes live here. -->

This backlog is a retrospective bootstrap, not a complete event ledger. It was seeded onto work
already done, and it classifies planned normative and capability work. Not everything this
repository has done appears here. Two exclusions are recorded below so that absence is not read
as oversight.

## Publication governance is not represented as backlog work

ADR 0010 established the release-publication policy, `v1.4.0` and `v1.5.0` were subsequently
published under that policy, and the publication-state record in `PROJECT.md` was corrected
afterward. ADR 0010 itself was subsequently carried into `v1.6.0`, a substantive MINOR release
that added policy selection and adapter schema 1.1.0; the release was not cut merely to publish
the ADR. These were governance and publication actions rather than planned normative or
capability work, so no retrospective backlog item was created. Their absence from this backlog
is deliberate and does not mean the work was undiscovered or incomplete.

## Reconciliation cannot establish completeness here

This repository's history contains no merged pull requests. Every release and every disposition
landed as a direct commit on a branch. `backlog-reconcile` matches item evidence against merged
pull requests, so two of its four checks have nothing to run against and report NOT RUN rather
than passing.

What a successful run establishes here is therefore narrower than a reader might infer from the
overall command succeeding: parent-state coherence, and that cited evidence resolves. Agreement
between this backlog and all historical work remains undetermined. A green reconciliation is not
evidence of completeness, and repetition does not make it one.

## The versioning policy's MINOR clause is imprecise, and is not filed

`CHANGELOG.md` states the increments *"so a release cannot be argued into being smaller than it
is"*: MAJOR enumerates four cases, MINOR enumerates *"adding a recommendation; adding an optional
field; widening what is accepted"*, and PATCH is *"corrections that change no conclusion."*
**Narrowing what an existing rule accepts is named nowhere.** N6 is exactly that shape — it widens
the antecedent of a claim the catalog carries as a recommendation, which narrows what satisfies it
— and [ADR 0011](../adr/0011-the-catalog-states-a-rules-level.md) classified it MINOR by testing
the four MAJOR clauses and finding all four fail.

This was examined on 2026-08-26 and left unfiled, on two grounds.

**It leaves no release class undetermined.** The three buckets are exhaustive by construction, and
a narrowing change resolves by elimination rather than by default: PATCH excludes itself on its own
terms, because a narrowing change does alter conclusions; MAJOR excludes itself because its four
cases are a closed list; MINOR is what remains. The elimination terminates every time, so the
imprecision costs an argument, not an answer. What it does cost is real and is recorded here rather
than dismissed: a document written to preempt that argument under pressure does not preempt this
one.

**It is release governance, not corpus/catalog agreement.** No epic owns it. Publication and
release governance are already outside this backlog by the first exclusion above, and inventing an
epic to hold a two-word documentation correction would be filing scope to give a finding somewhere
to live. Its trigger, should it need one: a release whose class is genuinely argued rather than
read off — at which point the clause has cost an answer and not merely an argument.
