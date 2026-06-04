param(
  [string]$RagflowPath = ".local\ragflow",
  [string]$ComposeFile = "docker-compose.yml",
  [switch]$SetVmMaxMapCount,
  [switch]$FollowLogs
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
  throw "RAGFlow docker folder not found at $DockerPath. Run npm run ragflow:setup first."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required to start local RAGFlow."
}

docker --version | Write-Host
docker compose version | Write-Host

if ($SetVmMaxMapCount) {
  if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Setting vm.max_map_count=262144 in docker-desktop WSL."
    wsl -d docker-desktop -u root sysctl -w vm.max_map_count=262144
  }
  else {
    Write-Warning "WSL was not found. Set vm.max_map_count manually if Elasticsearch cannot start."
  }
}

Push-Location $DockerPath
try {
  docker compose -f $ComposeFile up -d
  docker compose -f $ComposeFile ps

  Write-Host ""
  Write-Host "RAGFlow Docker stack is starting."
  Write-Host "HTTP API: http://localhost:9380"
  Write-Host "Web UI:   http://localhost"
  Write-Host "If the UI reports a network anomaly, wait for the ragflow container to finish initializing."
  Write-Host "To follow logs: docker logs -f docker-ragflow-cpu-1"

  if ($FollowLogs) {
    docker logs -f docker-ragflow-cpu-1
  }
}
finally {
  Pop-Location
}
