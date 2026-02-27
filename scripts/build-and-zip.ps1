# Build e zip para deploy cPanel — executar no terminal Windows
# Uso: .\scripts\build-and-zip.ps1   ou   npm run build:zip

Set-Location $PSScriptRoot\..

Write-Host "Build AT_Manut..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nA criar dist_upload.zip..." -ForegroundColor Cyan
Compress-Archive -Path "dist\*" -DestinationPath "dist_upload.zip" -Force

Write-Host "`nConcluido. dist_upload.zip pronto para public_html/manut/" -ForegroundColor Green
