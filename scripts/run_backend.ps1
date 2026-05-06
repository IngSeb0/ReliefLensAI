param(
  [string]$Host = "0.0.0.0",
  [int]$Port = 8080,
  [switch]$NoReload
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[INFO] $Message"
}

$BackendDir = Join-Path $PSScriptRoot "..\backend"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

Set-Location $BackendDir

if (-not (Test-Path $PythonExe)) {
  Write-Error "Missing backend/.venv. Run .\scripts\setup_backend.ps1 first."
}

$Args = @("-m", "uvicorn", "main:app", "--host", $Host, "--port", "$Port")
if (-not $NoReload) {
  $Args += "--reload"
}

Write-Info "Starting backend on http://$Host`:$Port"
& $PythonExe @Args
