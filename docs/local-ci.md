# Local CI and verified pull requests

GitHub remains the source-control, pull-request, and review system. It is not what proves a branch
builds. The complete CI pipeline runs in Docker on the developer's machine, before the push, and a
pull request may only be opened for a commit that passed it.

The invariant, stated once:

> **The commit pushed for a pull request is exactly the commit that passed the complete local
> Docker CI pipeline.**

Not "CI passed recently", and not "CI passed on this branch". Both of those are satisfied by a
branch whose tip has moved since, and a green result attached to a commit nobody is reviewing is
worse than no result: it is a true statement about the wrong thing.

## Prerequisites

| Needed | Why |
|---|---|
| Docker Desktop, or Docker Engine with the Compose v2 plugin | The isolation boundary. `docker compose version` must work. |
| PowerShell 7+ (Windows) or bash (Linux, macOS) | To invoke the entry point. |
| Node.js ≥ 18 on the host | Only for `scripts/submit-pr.mjs`, which orchestrates git and `gh`. The **checks** run on the container's pinned Node 20, never the host's. |
| `git` | Obviously, and also because `scripts/ownership.mjs` asks git which files the project owns. |
| GitHub CLI (`gh`), authenticated | Only for creating the pull request. Your existing `gh auth login` session is used; no token is read, stored, or committed by this repository. |

Nothing else is installed, and nothing else needs to be. This repository has zero third-party
dependencies, so there is no package manager step to reproduce.

## Running CI

```
.\scripts\ci.ps1          # Windows
./scripts/ci.sh           # Linux, macOS
```

That is the authoritative command. It exits `0` only when every stage passed, nonzero otherwise.
Run it as often as you like; it submits nothing.

Options:

```
.\scripts\ci.ps1 -Verbose            # print every stage's output, not only failures
.\scripts\ci.ps1 -KeepOnFailure      # leave the failed container in place for inspection
./scripts/ci.sh --verbose --keep-on-failure
```

`npm run ci` runs the same pipeline **natively**, without the container. It is useful for a fast
inner loop and it is not the gate: it inherits whatever Node the host has, which is the thing the
container exists to stop mattering.

## Submitting a verified pull request

```
.\scripts\submit-pr.ps1
./scripts/submit-pr.sh
```

The sequence, and every point at which it stops:

```
is this a git repository?            no  -> exit 2
is the branch appropriate?           no  -> refuse (shared branch, detached HEAD, head == base)
is the working tree clean?           no  -> refuse, naming the files
record HEAD                              -> the commit under verification
run the full Docker CI pipeline      no  -> "CI failed. No branch was pushed and no PR was created."
resolve HEAD again
is it the same commit?               no  -> "HEAD changed after CI verification..."
does the evidence match this commit? no  -> refuse
is the tree still clean?             no  -> refuse
push <verified SHA>:refs/heads/<branch>
gh pr create, with the verification block appended to your body
```

Options: `--draft`, `--base <branch>`, `--title <t>`, `--body <b>`, `--dry-run`, `--verbose`,
`--keep-on-failure`. `--dry-run` performs the entire verification and stops before the push, which
is the way to exercise the workflow without creating anything.

The push names the verified SHA explicitly rather than the branch, so the commit that travels is
the object that was checked, not whatever the branch happens to point at when the push executes.

Nothing in this path ever commits, amends, stages, or reverts anything to make the pipeline pass.

## What CI checks

Eleven stages, in `scripts/ci-pipeline.mjs`, fail-fast in this order:

| Stage | What it establishes |
|---|---|
| `commit-provenance` | The container is looking at the commit the caller says it is. |
| `dependency-freedom` | No dependencies, no lockfile, no `node_modules`. |
| `inventory` | The committed enumeration of the 25 source items is intact. |
| `fidelity` | Every "reproduced verbatim" claim still matches the source specification. |
| `policy` | This repository's own policy satisfies the schema and weakens no standard. |
| `integrity` | The catalog matches its baseline — nothing removed, lowered, or reclassified. |
| `acceptance` | Every rule still accepts what it accepted — the semantic lock, not just the classification. |
| `diagrams` | Each `.mmd` matches the copy embedded in Markdown. |
| `test` | The full `node --test` suite, including the mutation checks that prove the guards bite. |
| `scan` | This repository scanned by its own scanner. |
| `self-verdict` | `evaluate` reports NOT_EVALUATED with nothing applicable — the honest result here. |

Two of those are new. `commit-provenance` makes the exact-commit invariant checkable from inside
the isolation boundary rather than only asserted from outside it. `dependency-freedom` states a
rule the old pipeline enforced only implicitly, by having no install step for a dependency to be
installed by.

Nothing from the previous GitHub workflow was dropped. The nine steps it ran are nine of the
stages above, running the same commands, resolved from `package.json` so there is one definition of
each.

### What a conventional pipeline has that this one does not

Named rather than quietly skipped:

| Absent | Why |
|---|---|
| Dependency restore/install | There are no dependencies. `dependency-freedom` fails if that ever stops being true. |
| Linting, formatting, static analysis | No linter or formatter is configured in this repository. `scan` is its static analysis, and it is the repository's own subject matter. |
| Compilation/build | Nothing is compiled. The scripts are ESM run directly by Node. |
| Integration tests, API tests | There is no service and no API. The suite's fixture repositories are the integration surface, and they run under `test`. |
| Database provisioning, migrations, seeding | **This repository has no database.** No service is started, nothing is provisioned, and no developer database is touched — because there is none to touch. |
| Frontend tests, E2E/browser tests | There is no frontend. Diagram freshness is checked by comparing text, deliberately, so that the check needs no browser. |
| Dependency vulnerability scanning | `npm audit` needs a dependency graph. With zero dependencies the honest result is that the attack surface is Node itself, which is pinned in the image. |

Two things genuinely cannot be reproduced locally, and neither is a check:

- **The hosted runner's environment.** Local CI proves the pipeline passes on Node 20 in a clean
  container. It does not prove it passes on GitHub's runner image. The workflow still exists and
  is still worth having as a second opinion from a different machine.
- **Anything requiring GitHub's server-side state** — branch protection evaluation, required
  reviewers, merge-queue behaviour. Those are properties of the repository on GitHub, not of the
  commit.

## Isolation

- **The working tree is mounted read-only** at `/repo`. The entrypoint copies it into a tmpfs
  workspace and runs there. CI physically cannot write to your checkout, which is what makes "CI
  never edits your repository into passing" a property of the setup rather than a promise.
- **No network.** `network_mode: none`. A check that quietly reached the internet fails here
  instead of passing for a reason nobody recorded.
- **No credentials.** No Docker socket, no SSH mount, no `.netrc`, no token in the image or the
  compose file. `gh` runs on the host, after verification, using your existing session.
- **Unprivileged and capability-free.** `USER node`, `cap_drop: [ALL]`, `no-new-privileges`,
  read-only root filesystem. CI is treated as untrusted code execution.
- **The only writable host path** is the evidence directory, which is git-ignored.
- **Every run gets a unique Compose project name** (`mls-ci-<random>`), so two concurrent runs, or
  another repository using this pattern, cannot collide.

### What the image pin does and does not guarantee

`ci.Dockerfile` names `node:20-alpine` — a tag, not a digest. That is reproducible by version
family and mutable in fact: the tag is republished, so two runs a month apart can resolve to
different images while reporting the same Node minor.

This is recorded rather than fixed, deliberately. The invariant this workflow enforces is about
**which source commit passed**, and a moving base image does not weaken it: the pipeline verifies
the commit it names, and `commit-provenance` fails if it is looking at anything else. Digest
pinning answers a different question — whether the *environment* that produced a past result can
be reconstructed — and that is a supply-chain strengthening decision with its own cost, chiefly
that a pinned digest must then be deliberately advanced or it silently stops receiving security
updates to the base image.

Folding it in here would have improved an adjective without changing what is proven. It is a
separate decision, and it has not been made.

## Cleanup, and what is never cleaned up

Teardown runs whether the pipeline passed, failed, or was interrupted — a `finally` block in
`scripts/ci.ps1`, an `EXIT` trap in `scripts/ci.sh`. It is a `down --remove-orphans --volumes`
scoped to that run's own project.

There is no `prune` anywhere in this repository, and there should not be. A CI script that reaps a
developer's unrelated containers, volumes, or databases gets deleted rather than fixed. A test
asserts the absence.

## Debugging a failed run

```
.\scripts\ci.ps1 -KeepOnFailure -Verbose
```

The container survives, and the command prints what to run against it. For a shell in the same
image without re-running anything:

```
docker run --rm -it --entrypoint sh mls-local-ci:node20
```

Note that this gives you the image, not the failed workspace — the workspace is a tmpfs copy that
dies with the container, which is exactly why repeated runs are deterministic. To reproduce
interactively, mount the repository the way CI does and run the pipeline by hand:

```
docker run --rm -it -v "$PWD:/repo:ro" --entrypoint sh mls-local-ci:node20
  # then, inside:
  cp -a /repo/. /work/ && cd /work && node scripts/ci-pipeline.mjs --verbose
```

## Verification evidence

A successful run prints the repository, branch, verified commit, result, stages, environment, and
completion time, and writes a machine-readable record to the git-ignored path
artifacts/local-ci/latest.json:

```json
{
  "commit": "<full SHA>",
  "branch": "v1.4-candidate",
  "result": "passed",
  "startedAt": "...",
  "completedAt": "...",
  "checks": ["commit-provenance", "...", "self-verdict"],
  "notExecuted": []
}
```

`notExecuted` is the field that matters most. A fail-fast pipeline that stopped at stage three and
reported three passes has told the truth in a way that reads like a pass; the submission script
refuses when that list is non-empty.

The evidence file is transient and git-ignored on purpose. Committed, it would put a claim about a
past verification into the repository where a later reader could take it for a statement about the
current commit. The durable record is the block appended to the pull-request body, which is
attached to the SHA it names.

## Local CI is not GitHub Actions

`.github/workflows/ci.yml` still exists and still runs, on push to `main` and on pull requests. It
was refactored rather than removed: it no longer holds its own list of checks, it invokes
`scripts/ci-pipeline.mjs`.

```
        scripts/ci-pipeline.mjs      <- the one definition of what CI is
             /            \
   scripts/ci.{ps1,sh}    .github/workflows/ci.yml
   Docker, developer      hosted runner, native
```

The hosted job runs the pipeline natively rather than through Docker, because a GitHub runner is
already a clean disposable Linux environment with a pinned Node — which is what the container
provides locally. A **self-hosted** runner is the opposite case and should call `scripts/ci.sh`, so
that it gets the same container a developer gets. That substitution requires no change to the
pipeline. This repository does not use a self-hosted runner today.

The pull-request body says "verified on a developer machine" and explicitly disclaims being a
GitHub-hosted result. If GitHub-hosted Actions cannot run — quota, billing, a disabled workflow —
local CI is unaffected. It has no dependency on GitHub at all until the push.

## Reusing this pattern in another repository

The parts that are not specific to this repository: `ci.Dockerfile`, `compose.ci.yml`,
`scripts/ci-entrypoint.sh`, `scripts/ci.ps1`, `scripts/ci.sh`, and `scripts/submit-pr.mjs` with its
two wrappers. Copy them, then:

1. Change the base image and the `mls-ci` / `mls-local-ci` names.
2. Replace the `STAGES` array in `scripts/ci-pipeline.mjs` with that repository's checks, each
   naming a script its package manager already defines. Do not restate the commands.
3. If it has services or a database, add them to `compose.ci.yml` with a real `healthcheck` and
   `depends_on: condition: service_healthy` — never a sleep — and point the application at the
   disposable instance, never a developer's own.
4. Point its CI workflow at the same pipeline.

The guards in `scripts/submit-pr.mjs` need no changes; none of them know anything about this
repository.
