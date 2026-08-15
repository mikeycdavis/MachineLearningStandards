#!/usr/bin/env bash
#
# Verify this branch with the full local Docker CI pipeline, then push the exact verified commit
# and open a pull request.
#
# A wrapper. Every guard — clean tree, branch, the before/after commit comparison that enforces the
# exact-commit invariant — lives in scripts/submit-pr.mjs, where it is a pure function with a test.
#
#   scripts/submit-pr.sh
#   scripts/submit-pr.sh --draft --base develop
#   scripts/submit-pr.sh --dry-run
set -Eeuo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$REPO_ROOT/scripts/submit-pr.mjs" "$@"
