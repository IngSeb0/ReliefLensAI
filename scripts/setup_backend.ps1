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
$BackendDir = Join-Path $RepoRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\\python.exe"

Require-Command "python"

Set-Location $BackendDir

if (-not (Test-Path "requirements.txt")) {
  throw "backend/requirements.txt not found"
}

if (-not (Test-Path ".env.example")) {
  throw "backend/.env.example not found"
}

if (-not (Test-Path $PythonExe)) {
  Write-Info "Creating backend virtual environment at $VenvDir"
  python -m venv $VenvDir
}

Write-Info "Installing backend dependencies"
& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Info "Created backend/.env from .env.example"
}

$DataDirs = @("data", "data\\dispatch", "data\\incidents", "data\\resources", "data\\sessions", "data\\signals")
foreach ($dir in $DataDirs) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}

Write-Info "Backend setup complete"
