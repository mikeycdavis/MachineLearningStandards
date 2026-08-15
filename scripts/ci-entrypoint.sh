#!/bin/sh
# Container entrypoint for local CI. Baked into the image by ci.Dockerfile.
#
# Copies the read-only source mount into a writable tmpfs workspace and runs the authoritative
# pipeline there. The copy is what lets the checks behave normally — writing a temporary verdict,
# resolving git — while leaving the developer's working tree provably untouched.
set -eu

: "${CI_SRC:=/repo}"
: "${CI_WORK:=/work}"
: "${LOCAL_CI_OUT:=/out}"

# The source is mounted from the host, so its ownership will not match the container user. This is
# scoped to the workspace rather than a global wildcard: git should trust this checkout, not any
# repository that happens to appear inside the container.
git config --global --add safe.directory "$CI_SRC"
git config --global --add safe.directory "$CI_WORK"

# -a preserves the tree including .git, which the pipeline needs to state which commit it verified
# and which scripts/ownership.mjs needs to distinguish owned files from ignored ones.
cp -a "$CI_SRC"/. "$CI_WORK"/
cd "$CI_WORK"

exec node scripts/ci-pipeline.mjs --out "$LOCAL_CI_OUT" "$@"
