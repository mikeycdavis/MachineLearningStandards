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
