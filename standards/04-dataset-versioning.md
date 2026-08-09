# Standard 4 — Dataset Versioning

A dataset that can change while its name stays the same makes every past result unverifiable and
every comparison unsound. Two models said to have been evaluated on the same data may not have
been, and nobody can tell, because the only identifier either result recorded was a filename. This
standard requires that a dataset carry an identifier which changes when its contents change.

Source: item 4 of [`artifacts/prompts/ml-standards-spec.md`](../artifacts/prompts/ml-standards-spec.md).

## Scope

Applies to any dataset whose contents can change over time, which is nearly all of them: a table
refreshed nightly, an export re-run with a later cutoff, a file corrected after an upstream fix.
A genuinely immutable artifact — a published benchmark distributed with a fixed checksum — already
satisfies this standard by construction, and the correct response is to record the checksum rather
than to invent a version scheme around it.

Applicability is proposed by the `data-artifacts` trigger. A repository whose only data files are
test fixtures holds no dataset in this sense; declaring the rule not-applicable with that reason is
the correct outcome, not an evasion.

## Requirements

### R1 — Every dataset has an identifier that changes with its contents

**A dataset MUST carry an identifier that is different whenever its contents are different.** The
mechanism is open — a semantic version incremented by whoever produces it, a content hash over the
files, a snapshot date used as an immutable partition key, or a data-versioning tool's revision
identifier. What is not open is the property: two different contents MUST NOT share an identifier.

A filename is not an identifier. `training_data.csv` is a name for a slot, and the slot's occupant
changes. A version that must be incremented by hand satisfies this requirement only if something
enforces it; where nothing does, a content hash is the more honest choice because it cannot be
forgotten.

### R2 — Experiment records name the exact version used

**Every recorded result MUST name the dataset version it was produced from.** A metric without a
dataset version is a number whose meaning depends on a fact nobody wrote down, and it cannot be
reproduced, compared, or defended six months later.

This is the requirement that makes versioning worth its cost. A dataset can be perfectly versioned
and the versioning contributes nothing if results do not cite it — the identifier exists so a past
result can be tied to the data that produced it, and a citation is the tie.

### R3 — Comparisons state the dataset version, and it is the same one

**Two results MUST NOT be compared unless they were produced from the same dataset version, and
that version MUST be stated with the comparison.** A difference in score between models evaluated
on different data is not a difference between the models.

Where a comparison across versions is genuinely intended — measuring whether more recent data helps
— then the version difference is the experiment, and it must be stated as such rather than left as
an uncontrolled variable. [Standard 19](19-model-comparison.md) governs the comparison itself.

### R4 — A version can be resolved back to its contents

**It MUST be possible to obtain the exact contents an identifier refers to**, for as long as
results citing it are relied upon. A version that names data nobody can retrieve documents a result
without making it reproducible, which is a weaker claim than it appears — and one
[Standard 15](15-reproducibility.md) prohibits stating as reproducibility.

Retention is a real cost and this requirement does not pretend otherwise. Where old versions are
deleted, the correct response is to record that the results citing them are no longer reproducible,
not to leave the identifiers pointing at nothing and let readers assume otherwise.

## Evidence and verification

| Rule | What demonstrates compliance | How it is verified | Assurance |
|---|---|---|---|
| R1 | A version manifest, `.dvc` files, `dvc.lock`, a checksum file adjacent to the data, or artifact-API usage that pins a version | `scan` detector A6 reports `dataset-manifest-missing` when data artifacts are present and no pinning mechanism is found | Partial |
| R2 | Experiment records — config files, tracking-tool runs, result documents — naming a dataset version | Manual review | None |
| R3 | The version stated alongside each comparison | Manual review | None |
| R4 | The version resolves to retrievable contents | Manual review | None |

**What the automated check cannot establish.** A6 establishes one fact: that data exists in or near
the repository and that no versioning mechanism was found beside it. Its absence of a finding
establishes only that a mechanism exists — not that the mechanism was used for the training run
that produced a given result, not that the identifier changes when the contents change, and not
that anything cited it. The gap between "a manifest exists" and "results are tied to data" is
exactly R2, and R2 is not machine-checkable from repository text. The rule reports
`insufficient-evidence` rather than `not-evaluated` where a mechanism exists but no pinning is
found: the remediation is to add one, which is work an agent can do.

## Additions this standard makes beyond the source

- R1's explicit statement that a filename is not an identifier, and the preference for content
  hashing where manual incrementing is unenforced. The source requires that datasets be versioned;
  the reasoning about which mechanisms actually deliver the property is this standard's.
- R3's treatment of a cross-version comparison as a legitimate experiment provided the version
  difference is declared. The source does not address the case.
- R4 in full, and its honesty requirement about deleted versions. The source requires versioning;
  the observation that an unresolvable version documents a result without making it reproducible,
  and the instruction to say so rather than imply otherwise, are this standard's additions.

## Relationship to other standards

[Standard 3](03-dataset-provenance.md) records what a dataset is and where it came from; this
standard supplies the identifier that lets a provenance record refer to a specific state of it, and
R4 of that standard depends on this one. [Standard 15](15-reproducibility.md) treats the dataset
version as one of the configuration elements a reproducibility claim requires, and
[Standard 17](17-feature-lineage.md) extends the same identification discipline to the
transformations applied downstream of the dataset.

## Implementation

**Partially checked.** `standards scan` reports `dataset-manifest-missing` when the
`data-artifacts` trigger fires and no `.dvc` file, lockfile, manifest, or adjacent checksum is
found. That is a genuine structural fact and a useful one — an unversioned dataset is common and
cheap to detect.

Nothing verifies R2, R3, or R4. Whether a result cites a version, whether two compared results
cite the same one, and whether an identifier still resolves are all facts about records and
storage that a repository scan cannot reach. They report `not-evaluated` and are satisfied by
attestation recording what a reviewer checked. The scan's contribution here is narrow and worth
stating plainly: it can tell you that nothing is versioned. It cannot tell you that anything is.
