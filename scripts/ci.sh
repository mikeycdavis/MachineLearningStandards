#!/usr/bin/env bash
#
# Run this repository's complete CI pipeline in an ephemeral Docker environment.
#
# The POSIX counterpart of scripts/ci.ps1 — same behaviour, same exit codes. It exists for Linux
# and macOS checkouts and for a future GitHub self-hosted runner, which can call this file and get
# byte-for-byte the same pipeline a developer runs. Neither script defines any check: the stage
# list lives in scripts/ci-pipeline.mjs.
#
# Usage: scripts/ci.sh [--keep-on-failure] [--verbose] [--expected-commit <sha>]
#
# Exit 0 only when every stage passed. 1 on a failing check. 2 when CI could not be run at all.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/compose.ci.yml"
OUT_DIR="$REPO_ROOT/artifacts/local-ci"

KEEP_ON_FAILURE=0
PIPELINE_ARGS=()
EXPECTED_COMMIT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --keep-on-failure) KEEP_ON_FAILURE=1 ;;
    --verbose)         PIPELINE_ARGS+=("--verbose") ;;
    --expected-commit) EXPECTED_COMMIT="${2:-}"; shift ;;
    -h|--help)         sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v docker >/dev/null 2>&1 || {
  echo "docker is not on PATH. Local CI requires Docker; nothing else needs to be installed." >&2
  exit 2
}
docker compose version >/dev/null 2>&1 || {
  echo "docker compose (v2) is unavailable. Local CI requires the compose plugin." >&2
  exit 2
}

# Unique per run, for the same reason as in ci.ps1: concurrent runs and other repositories using
# this pattern must not collide, and cleanup must be incapable of reaching outside this project.
PROJECT="mls-ci-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"

mkdir -p "$OUT_DIR"

export LOCAL_CI_ENVIRONMENT="docker ($PROJECT)"
export LOCAL_CI_REPOSITORY="$(basename "$REPO_ROOT")"
export LOCAL_CI_EXPECTED_COMMIT="$EXPECTED_COMMIT"

cleanup() {
  # Runs on success, on failure, and on interrupt. Scoped to this project only — this repository
  # contains no `docker system prune`, and a CI script that reaps a developer's unrelated
  # containers gets deleted rather than fixed.
  if [ "$KEEP_ON_FAILURE" -eq 1 ] && [ "${EXIT_CODE:-1}" -ne 0 ]; then
    container="$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT" ps -a --format '{{.Name}}' | head -1)"
    echo ""
    echo "Container kept for inspection: $container"
    echo "  docker logs $container"
    echo "  docker run --rm -it --entrypoint sh mls-local-ci:node20   # a fresh shell in the image"
    echo "  docker compose -f compose.ci.yml -p $PROJECT down --volumes   # when finished"
  else
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down --remove-orphans --volumes >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "Building the CI image..."
if ! docker compose -f "$COMPOSE_FILE" -p "$PROJECT" build; then
  echo "The CI image failed to build. No checks were run." >&2
  EXIT_CODE=2
  exit 2
fi

RUN_ARGS=(compose -f "$COMPOSE_FILE" -p "$PROJECT" run)
[ "$KEEP_ON_FAILURE" -eq 1 ] || RUN_ARGS+=(--rm)
RUN_ARGS+=(ci)

set +e
docker "${RUN_ARGS[@]}" "${PIPELINE_ARGS[@]+"${PIPELINE_ARGS[@]}"}"
EXIT_CODE=$?
set -e

echo ""
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Local CI passed. Verification evidence: artifacts/local-ci/latest.json"
else
  echo "Local CI failed (exit $EXIT_CODE)."
fi
exit "$EXIT_CODE"
