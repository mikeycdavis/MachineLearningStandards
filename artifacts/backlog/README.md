# Backlog

This backlog is in **GitHub Issues**, not in files. `artifacts/backlog/github-mapping.json`
records `authority: "github"` — every legacy id maps to the issue that now carries it.

- Read it: `gh issue list --repo mikeycdavis/MachineLearningStandards`, or the `backlog-validate`
  skill's GitHub adapter (`node backlog-gh.mjs list|json --repo=mikeycdavis/MachineLearningStandards`).
- File-backed tools (`backlog.mjs`, the `backlog` skill) refuse to run here and print this
  same state.
- **Recovery:** restore `artifacts/backlog/items/` from the commit before this one, then set
  `authority` back to `"files"` in `github-mapping.json`. A pre-migration snapshot is also
  retained at `F:\Repos\_migration-snapshots\prep-MachineLearningStandards-20260923-1`
  (owner's machine), independent of this repository's git history.
