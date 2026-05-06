$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[INFO] $Message"
}

function Require-Command([string]$CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $CommandName"
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RepoRoot "frontend"

Require-Command "npm"

Set-Location $FrontendDir

if (-not (Test-Path "package.json")) {
  throw "frontend/package.json not found"
}

Write-Info "Installing frontend dependencies"
npm install

Write-Info "Frontend setup complete"
