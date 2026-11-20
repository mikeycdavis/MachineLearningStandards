# 0010 — Published release tags are immutable public authorities

- **Status:** Accepted
- **Date:** 2026-08-16
- **Deciders:** Project owner

## Context

An external consumer — StandardsEnforcer — pins MachineLearningStandards releases by tag and
executes the tagged tree. A read-only reconciliation on 2026-08-16 measured the publication surface
and found that this repository had never said what publishing a release means.

What was measured:

```text
remote refs      06feba7d10c96fc363f8c3004c595c72276682d7   HEAD
                 06feba7d10c96fc363f8c3004c595c72276682d7   refs/heads/main

                 (no tags; that is the entire remote)

local tags       v1.0.0 v1.1.0 v1.2.0 v1.3.0 v1.4.0 v1.4.1 v1.5.0
```

Remote `main` is exactly the peeled commit of `v1.1.0`. Every release from `v1.2.0` onward exists
only on the workstation. `CHANGELOG.md` describes six releases; the remote has published none of
them as a release identity.

So the question a consumer's pin depends on had no recorded answer. `CHANGELOG.md` defines what a
version *increment* means and what the frozen surface is. It says nothing about refs, branches, or
publication. Three propositions were being run together that are not the same proposition:

- git can resolve the tag;
- the expected files exist at the tagged commit;
- the tagged artifact is an authority the consumer is entitled to depend on.

The first two are measurable. The third is a policy this repository had not stated, and a `git push`
was about to establish it by accident — publication acquiring its meaning as a side effect of a
transport command rather than as a decision.

`CHANGELOG.md` already contains the closest thing to a rule, arrived at for a different reason.
The `1.4.1` entry, under *Why a new release rather than a retag*, records that the invocation
contract did not exist at `v1.4.0`, that `v1.4.0` therefore cannot be made to claim it, and that a
consumer reads the declaration out of the pinned checkout. `README.md` records that `v1.0.0` is
tagged unchanged so the evidence against it stays measurable. Both point the same way. Neither
states the policy.

## Decision

**MachineLearningStandards release tags are intended to be public, immutable authorities that
external consumers may pin and execute.**

Publishing a release tag means this repository authorises consumers to treat **the peeled commit of
that tag** as the released MachineLearningStandards implementation for that version.

Seven boundaries, stated because each one is a place where the general rule would otherwise be read
wider than it is:

- **A local tag is not yet a published authority.** Tagging is a workstation act. Publication is the
  act that confers authority, and until it happens the tag is a private bookmark.
- **The peeled commit is the implementation identity.** For an annotated tag, `<tag>^{commit}` is
  what a consumer executes and what this repository stands behind. The tag-object SHA is provenance
  for the annotation — who tagged it, when, and what they said — and is not the executable identity.
- **Published release tags are immutable.** They are never moved, re-pointed, or deleted.
  Corrections get a new version. This is the rule `1.4.1` already followed before it was written
  down.
- **Publishing a tag does not touch `main`.** It does not make the tagged commit `main`, advance
  `main`, or make `main` authoritative. Publishing a release authority and redefining the public
  branch tip are two independent decisions, and nothing about the first requires the second.
- **Consumers are entitled to depend only on capabilities that actually exist in the tagged tree.**
  Not on what the version number suggests, not on what the CHANGELOG describes elsewhere, and not on
  what a neighbouring release contains.
- **A later release does not retroactively add capabilities to an earlier one.** `v1.4.0` does not
  acquire `standards-adapter.json` because `v1.4.1` introduced it. This is the same principle as the
  no-retag rule, seen from the consumer's side.
- **A CHANGELOG section or a local tag is not a promise of publication.** Neither is evidence that a
  version has been externally published. The published refs are the only evidence of that, and they
  are read from the remote.

## What this decision does not do

It publishes nothing. No ref moved, no tag was pushed, and the remote is unchanged. This record
exists specifically so that publication, when it happens, is authorised rather than inferred.

It carries no release. No requirement, prohibition, or recommendation enters the catalog; the
acceptance lock and catalog baseline are untouched; `VERSION` does not move. Under the policy at the
top of `CHANGELOG.md` this is not a version of anything — it is a governance clarification about how
released versions are made available, not a change to what any version says.

It does not decide which tags to publish, or when. That is a separate authorisation naming exact
refs and exact object ids.

It takes no position on remote `main`. Remote `main` sitting exactly on the `v1.1.0` commit may be a
deliberate frozen baseline — the fourth-adoption records give `v1.1.0` a specific role as an
unmodified external-facing target — or it may be incidental. Nothing here establishes which, and a
tags-only publication leaves the question undisturbed, which is the reason to prefer it.

## Consequences

The consumer question becomes answerable in one direction and stays open in the other. This
repository can now say what a published tag means. It still cannot say whether any particular pin is
the *right* authority for a consumer's purpose — that is established in the consumer, from the
consumer's evidence, and must not be reconstructed here from what would be convenient.

The concrete instance: `v1.4.0` objectively does not contain `standards-adapter.json`, and
publishing it cannot change that. Whether an adapter-absent pin is intentional evidence or a broken
pin is a StandardsEnforcer question. Under the boundaries above, both readings are coherent — the
fifth boundary says a consumer may depend only on what is actually in the tree, and the sixth says
`v1.4.1` does not repair `v1.4.0`. What the policy forbids is resolving the ambiguity by substituting
a different release because it happens to have the file.

**This policy is not mechanically enforced by this repository, and no test asserts it.** Publication
state lives on a remote, immutability is a property of what is never done rather than of what is
checked, and a test that read the remote would be asserting a fact about a server rather than about
this tree. A test asserting something it cannot establish would be the exact failure this repository
exists to prohibit, so none is written. The enforcement is that the policy is recorded before the
first publication rather than after it, which is what makes a later deviation visible as a deviation.

## Alternatives considered

**Say nothing and publish.** Rejected. It answers the question by accident, in whatever direction
the first push happens to imply, and leaves a consumer depending on an authority the producer never
knowingly granted. The reconciliation existed precisely because that was about to happen.

**Decide that tags are private and publish an explicit release artifact instead** — a package, a
release asset, a dedicated `releases/` ref namespace. Legitimate, and it would make publication
harder to do by accident. Rejected as unjustified rework: consumers already pin by tag, tags already
carry annotations recording what each release claims, and the existing no-retag reasoning already
treats them as durable identities. The gap was the missing statement, not the mechanism.

**State the policy and also require remote `main` to track the latest release.** Rejected. Nothing in
this repository requires it, and the observed convention contradicts it — local `main` points at a
review-disposition commit while three later releases sit on another line. It would also bundle a
change to the public branch tip into a decision about release authorities.

**Wait until the `v1.4.0` pin is resolved.** Rejected as the wrong order. The pin question is a
consumer question and could take any amount of time; the publication policy is this repository's own
and is answerable now. Recording it first is what keeps the consumer investigation from having to
guess at producer intent while it works.
