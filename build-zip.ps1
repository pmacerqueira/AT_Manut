param(
  [string]$SourceRepo = "C:\Users\Pedro\.cursor\worktrees\AT_Manut\nsb",
  [string]$OutputZip = "C:\AT_Manut\dist_upload.zip"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourceRepo)) {
  throw "Repositorio de origem nao encontrado: $SourceRepo"
}

$outputDir = Split-Path -Parent $OutputZip
if (-not (Test-Path $outputDir)) {
  throw "Pasta de destino nao encontrada: $outputDir"
}

Write-Host "Origem: $sourceRepo" -ForegroundColor Cyan
Write-Host "Destino: $OutputZip" -ForegroundColor Cyan

Push-Location $sourceRepo
try {
  npm run build:zip
  if ($LASTEXITCODE -ne 0) {
    throw "Build falhou com codigo $LASTEXITCODE"
  }

  $sourceZip = Join-Path $sourceRepo "dist_upload.zip"
  if (-not (Test-Path $sourceZip)) {
    throw "ZIP nao foi gerado em: $sourceZip"
  }

  Copy-Item -Path $sourceZip -Destination $OutputZip -Force

  $file = Get-Item $OutputZip
  Write-Host ""
  Write-Host "Concluido com sucesso." -ForegroundColor Green
  Write-Host ("ZIP final: {0}" -f $file.FullName) -ForegroundColor Green
  Write-Host ("Tamanho: {0} bytes" -f $file.Length) -ForegroundColor Green
  Write-Host ("Modificado em: {0}" -f $file.LastWriteTime) -ForegroundColor Green
}
finally {
  Pop-Location
}
