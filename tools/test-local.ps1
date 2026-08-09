# ============================================================
# test-local.ps1 — run the full local test suite before pushing.
#
#   .\scripts\test-local.ps1
#
# Mirrors what CI runs on every push to main:
#   1. HTMLHint          (lint.yml)
#   2. npm audit         (security.yml — high/critical, prod deps)
#   3. Playwright e2e    (playwright.yml — against a local server;
#                         nginx/CloudFront-specific tests auto-skip)
#   4. Terraform checks  (terraform.yml — fmt, validate, unit tests)
#
# Gitleaks and Trivy also run in CI but need their own binaries —
# install them locally if you want the complete pre-push picture.
# ============================================================
$ErrorActionPreference = 'Stop'
$failed = @()

function Step($name, $script) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    & $script
    if ($LASTEXITCODE -ne 0) { $script:failed += $name }
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
    if (-not (Test-Path node_modules)) {
        Step 'npm ci' { npm ci }
    }

    Step 'HTMLHint'  { npm run lint:html }
    Step 'npm audit (high/critical, prod deps)' { npm audit --audit-level=high --omit=dev }

    # Playwright browsers are cached after the first install
    Step 'Playwright browsers' { npx playwright install chromium }
    Step 'Playwright e2e (local server)' { npx playwright test }

    if (Get-Command terraform -ErrorAction SilentlyContinue) {
        Push-Location terraform
        try {
            Step 'terraform fmt'      { terraform fmt -check -recursive }
            Step 'terraform init'     { terraform init -backend=false -input=false }
            Step 'terraform validate' { terraform validate }
            Step 'terraform test'     { terraform test }
        } finally { Pop-Location }
    } else {
        Write-Host "`nterraform not found on PATH - skipping (CI runs it on every PR)" -ForegroundColor Yellow
    }
} finally { Pop-Location }

Write-Host ''
if ($failed.Count -gt 0) {
    Write-Host ("FAILED: " + ($failed -join ', ')) -ForegroundColor Red
    exit 1
}
Write-Host 'All local checks passed - safe to push.' -ForegroundColor Green
