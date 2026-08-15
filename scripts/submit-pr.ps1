#Requires -Version 7.0
<#
.SYNOPSIS
    Verify this branch with the full local Docker CI pipeline, then push the exact verified commit
    and open a pull request.

.DESCRIPTION
    A wrapper. Every guard — clean tree, branch, the before/after commit comparison that enforces
    the exact-commit invariant — lives in scripts/submit-pr.mjs, where it is a pure function with
    a test. Duplicating any of it here would create a second implementation that only one platform
    exercises.

    Arguments pass through unchanged:
        .\scripts\submit-pr.ps1
        .\scripts\submit-pr.ps1 -- --draft --base develop
        .\scripts\submit-pr.ps1 -- --dry-run
#>
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$RepoRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $RepoRoot 'scripts/submit-pr.mjs') @args
exit $LASTEXITCODE
