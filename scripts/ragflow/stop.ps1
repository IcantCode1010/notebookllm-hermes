param(
  [string]$RagflowPath = ".local\ragflow",
  [string]$ComposeFile = "docker-compose.yml",
  [switch]$RemoveVolumes
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ResolvedRagflowPath = if ([System.IO.Path]::IsPathRooted($RagflowPath)) {
  $RagflowPath
}
else {
  Join-Path $RepoRoot $RagflowPath
}
$DockerPath = Join-Path $ResolvedRagflowPath "docker"

if (-not (Test-Path $DockerPath)) {
  throw "RAGFlow docker folder not found at $DockerPath."
}

Push-Location $DockerPath
try {
  if ($RemoveVolumes) {
    docker compose -f $ComposeFile down --volumes
  }
  else {
    docker compose -f $ComposeFile down
  }
}
finally {
  Pop-Location
}
