$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root '.env'
if (Test-Path -LiteralPath $target) { Write-Host '.env existente preservado.'; exit 0 }
$randomBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$databasePassword = [System.BitConverter]::ToString($randomBytes).Replace('-', '').ToLower()
$lines = @('POSTGRES_DB=frotagest', 'POSTGRES_USER=frotagest', ('POSTGRES_PASSWORD=' + $databasePassword), 'APP_PORT=8088', 'COOKIE_SECURE=false', 'ALLOWED_ORIGINS=http://localhost:8088,http://127.0.0.1:8088,http://localhost:5173')
[System.IO.File]::WriteAllLines($target, $lines, [System.Text.Encoding]::ASCII)
Write-Host '.env criado com senha aleatória. Nenhuma credencial foi exibida.'
