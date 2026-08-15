# The isolation boundary for local CI.
#
# Node 20 is pinned to match .github/workflows/ci.yml. The point of running CI in a container is
# that the result does not depend on which Node the developer happens to have installed — the host
# here is Node 24, and a check that behaves differently on 20 should fail here rather than on a
# GitHub runner after the branch is already pushed.
#
# Nothing is installed at build time beyond git, because this repository has no dependencies to
# install. That is the whole build. If this file ever grows an `npm ci`, the zero-dependency
# decision changed and artifacts/adr/0001-standalone-domain-first-design.md should say so.
#
# The repository source is NOT copied into the image. It is mounted read-only at run time and
# copied to a tmpfs workspace inside the container, so that:
#   - the image does not go stale relative to the working tree;
#   - CI physically cannot write to the developer's checkout, which is what makes "CI never
#     commits anything to make itself pass" a property of the setup rather than a promise.
FROM node:20-alpine

# git is a real dependency of the checks, not a convenience: scripts/ownership.mjs asks
# `git ls-files` which files the project owns, and the pipeline reports the commit it verified.
RUN apk add --no-cache git

COPY scripts/ci-entrypoint.sh /usr/local/bin/ci-entrypoint
RUN chmod +x /usr/local/bin/ci-entrypoint

# CI is untrusted code execution. It runs as the image's unprivileged user, with no host paths
# writable, no Docker socket, and no credentials of any kind present in the image.
USER node
WORKDIR /work

ENTRYPOINT ["/usr/local/bin/ci-entrypoint"]
