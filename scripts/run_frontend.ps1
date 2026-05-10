param(
  [ValidateSet("dev", "start")]
  [string]$Mode = "dev",
  [int]$Port = 3000
)

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

if (-not (Test-Path "node_modules")) {
  throw "Missing frontend/node_modules. Run .\\scripts\\setup_frontend.ps1 first."
}

Write-Info "Starting frontend in $Mode mode on port $Port"

switch ($Mode) {
  "dev" { npm run dev -- --port $Port }
  "start" { npm run start -- --port $Port }
}
