param(
  [string]$TargetRoot = ".local",
  [string]$Tag = "v0.25.6",
  [string]$Repository = "https://github.com/infiniflow/ragflow.git"
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$LocalRoot = Join-Path $RepoRoot $TargetRoot
$RagflowPath = Join-Path $LocalRoot "ragflow"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required to clone RAGFlow."
}

New-Item -ItemType Directory -Force -Path $LocalRoot | Out-Null

if (Test-Path (Join-Path $RagflowPath ".git")) {
  Write-Host "RAGFlow checkout already exists at $RagflowPath"
  Push-Location $RagflowPath
  try {
    git fetch --tags --depth 1 origin $Tag
    git checkout -f $Tag
  }
  finally {
    Pop-Location
  }
}
else {
  git clone --branch $Tag --depth 1 $Repository $RagflowPath
}

Write-Host ""
Write-Host "RAGFlow is ready at $RagflowPath"
Write-Host "Next: npm run ragflow:start"
