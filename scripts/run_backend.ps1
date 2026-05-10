param(
  [string]$BindHost = "0.0.0.0",
  [int]$Port = 8080,
  [switch]$NoReload
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[INFO] $Message"
}

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $RootDir "backend"

$BackendVenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$RootVenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"

if (Test-Path $BackendVenvPython) {
  $PythonExe = $BackendVenvPython
}
elseif (Test-Path $RootVenvPython) {
  $PythonExe = $RootVenvPython
}
else {
  Write-Error "No virtual environment found. Expected backend\.venv or root .venv. Run setup first."
}

Set-Location $BackendDir

$UvicornArgs = @(
  "-m", "uvicorn",
  "main:app",
  "--host", $BindHost,
  "--port", "$Port"
)

if (-not $NoReload) {
  $UvicornArgs += "--reload"
}

Write-Info "Starting backend on http://$BindHost`:$Port"
& $PythonExe @UvicornArgs