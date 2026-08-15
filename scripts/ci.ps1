#Requires -Version 7.0
<#
.SYNOPSIS
    Run this repository's complete CI pipeline in an ephemeral Docker environment.

.DESCRIPTION
    The authoritative local CI command. Exits 0 only if every stage in scripts/ci-pipeline.mjs
    passed; nonzero otherwise.

    This script owns the container lifecycle and nothing else. It does not know what the checks
    are — that list lives in scripts/ci-pipeline.mjs, which is also what the GitHub workflow runs,
    so there is one definition of CI rather than one per place it is invoked from.

    Isolation: every run gets a unique Compose project name, so concurrent runs and other
    repositories using this pattern cannot collide, and cleanup can remove this project's
    containers and volumes without touching anything else the developer has running. The working
    tree is mounted read-only.

.PARAMETER KeepOnFailure
    Leave the failed container in place for inspection instead of removing it. The command prints
    the docker invocations needed to get a shell in it.

.PARAMETER Verbose
    Print each stage's output even when it passes. By default only failing stages are echoed.

.PARAMETER ExpectedCommit
    The commit the caller believes it is verifying. The pipeline's commit-provenance stage fails
    if the container is looking at anything else. scripts/submit-pr.mjs always passes this.

.EXAMPLE
    .\scripts\ci.ps1
.EXAMPLE
    .\scripts\ci.ps1 -KeepOnFailure -Verbose
#>
[CmdletBinding()]
param(
    [switch] $KeepOnFailure,
    [string] $ExpectedCommit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Exit codes are the interface here, so they are inspected rather than thrown on. Without this,
# PowerShell 7.4+ turns any nonzero native exit into a terminating error and the cleanup below is
# what pays for it.
$PSNativeCommandUseErrorActionPreference = $false

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Compose  = Join-Path $RepoRoot 'compose.ci.yml'
$OutDir   = Join-Path $RepoRoot 'artifacts/local-ci'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error 'docker is not on PATH. Local CI requires Docker; nothing else needs to be installed.'
    exit 2
}
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error 'docker compose (v2) is unavailable. Local CI requires the compose plugin.'
    exit 2
}

# Unique per run: two concurrent invocations, or another repository using this same pattern, get
# separate containers and separate networks. `docker compose down -p <this>` can then be a blanket
# cleanup that is still incapable of touching a developer's unrelated services.
$suffix  = [guid]::NewGuid().ToString('N').Substring(0, 8)
$Project = "mls-ci-$suffix"

# Created here rather than by Docker, so the bind mount does not appear as a root-owned directory.
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$env:LOCAL_CI_ENVIRONMENT      = "docker ($Project)"
$env:LOCAL_CI_REPOSITORY       = Split-Path -Leaf $RepoRoot
$env:LOCAL_CI_EXPECTED_COMMIT  = $ExpectedCommit

$exitCode = 1
try {
    Write-Host "Building the CI image..." -ForegroundColor Cyan
    docker compose -f $Compose -p $Project build
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'The CI image failed to build. No checks were run.'
        $exitCode = 2
        return
    }

    $runArgs = @('compose', '-f', $Compose, '-p', $Project, 'run')
    if (-not $KeepOnFailure) { $runArgs += '--rm' }
    $runArgs += 'ci'
    if ($VerbosePreference -ne 'SilentlyContinue') { $runArgs += '--verbose' }

    & docker @runArgs
    $exitCode = $LASTEXITCODE
}
finally {
    # Cleanup runs whether the pipeline passed, failed, or the run was interrupted. Scoped to this
    # project: it removes this run's containers and its own volumes and nothing else. There is no
    # `docker system prune` anywhere in this repository, and there should not be — a CI script that
    # reaps a developer's unrelated containers gets deleted rather than fixed.
    if ($KeepOnFailure -and $exitCode -ne 0) {
        $container = (& docker compose -f $Compose -p $Project ps -a --format '{{.Name}}' | Select-Object -First 1)
        Write-Host ''
        Write-Host "Container kept for inspection: $container" -ForegroundColor Yellow
        Write-Host "  docker logs $container"
        Write-Host "  docker run --rm -it --entrypoint sh mls-local-ci:node20   # a fresh shell in the image"
        Write-Host "  docker compose -f compose.ci.yml -p $Project down --volumes   # when finished"
    }
    else {
        & docker compose -f $Compose -p $Project down --remove-orphans --volumes *> $null
    }
    Remove-Item Env:LOCAL_CI_ENVIRONMENT, Env:LOCAL_CI_REPOSITORY, Env:LOCAL_CI_EXPECTED_COMMIT -ErrorAction SilentlyContinue
}

if ($exitCode -eq 0) {
    Write-Host ''
    Write-Host 'Local CI passed. Verification evidence: artifacts/local-ci/latest.json' -ForegroundColor Green
}
else {
    Write-Host ''
    Write-Host "Local CI failed (exit $exitCode)." -ForegroundColor Red
}
exit $exitCode
