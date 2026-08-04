# Passe un membre staff existant en super_admin (table staff_members).
# Usage :
#   .\scripts\set-super-admin.ps1 -Email "user@example.com"
#   .\scripts\set-super-admin.ps1 -UserId "uuid-utilisateur"
#   .\scripts\set-super-admin.ps1 -Email "user@example.com" -AlsoEnv
#
# Prérequis : DIRECT_URL ou DATABASE_URL dans .env
# -AlsoEnv : ajoute aussi l'e-mail à SUPER_ADMIN_EMAIL (recommandé — rôle durable au login)

param(
  [Parameter(Mandatory = $false)]
  [string]$UserId,

  [Parameter(Mandatory = $false)]
  [string]$Email,

  [Parameter(Mandatory = $false)]
  [switch]$AlsoEnv,

  [Parameter(Mandatory = $false)]
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"

if (-not $UserId -and -not $Email) {
  Write-Error "Indiquez -UserId <uuid> ou -Email <adresse>."
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) {
  $EnvFile = Join-Path $root ".env"
}

if (-not (Test-Path $EnvFile)) {
  Write-Error "Fichier .env introuvable : $EnvFile"
}

$activeLines = Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#\s]' }

function Get-EnvValue([string]$Name) {
  $line = $activeLines | Where-Object { $_ -match ("^\s*" + [regex]::Escape($Name) + "\s*=") } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -replace ("^\s*" + [regex]::Escape($Name) + "\s*="), "").Trim().Trim('"').Trim("'")
}

$dbUrl = Get-EnvValue "DIRECT_URL"
if (-not $dbUrl) { $dbUrl = Get-EnvValue "DATABASE_URL" }
if (-not $dbUrl) {
  Write-Error "DIRECT_URL ou DATABASE_URL est requis dans .env"
}

Push-Location $root
try {
  if ($Email) {
    $raw = & pnpm exec node .\scripts\set-super-admin.mjs --email $Email.Trim() 2>&1
  } else {
    $raw = & pnpm exec node .\scripts\set-super-admin.mjs --id $UserId.Trim() 2>&1
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host ($raw | Out-String)
    exit 1
  }
  $jsonLine = ($raw | Where-Object { "$_" -match '^\s*\{' } | Select-Object -Last 1)
  if (-not $jsonLine) {
    Write-Host ($raw | Out-String)
    Write-Error "Réponse inattendue de la mise à jour SQL."
  }
  $result = "$jsonLine" | ConvertFrom-Json
} finally {
  Pop-Location
}

$staffEmail = $result.staff.email
if ($result.already) {
  Write-Host "OK — déjà super_admin : $staffEmail ($($result.staff.id))"
} else {
  Write-Host "OK — rôle mis à jour : $($result.before.role) → super_admin pour $staffEmail ($($result.staff.id))"
  Write-Host "   cabinet : $($result.before.cabinet) → null"
}

# Durabilité : SUPER_ADMIN_EMAIL
$saRaw = Get-EnvValue "SUPER_ADMIN_EMAIL"
$saList = @()
if ($saRaw) {
  $saList = @($saRaw.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
$inEnv = $saList | Where-Object { $_.ToLowerInvariant() -eq $staffEmail.ToLowerInvariant() }

if ($inEnv) {
  Write-Host "OK — déjà présent dans SUPER_ADMIN_EMAIL"
} elseif ($AlsoEnv) {
  $newList = @($saList + $staffEmail) -join ","
  $content = Get-Content $EnvFile -Raw
  if ($content -match '(?m)^\s*SUPER_ADMIN_EMAIL\s*=') {
    $content = [regex]::Replace(
      $content,
      '(?m)^\s*SUPER_ADMIN_EMAIL\s*=.*$',
      "SUPER_ADMIN_EMAIL=$newList"
    )
  } else {
    if (-not $content.EndsWith("`n")) { $content += "`n" }
    $content += "SUPER_ADMIN_EMAIL=$newList`n"
  }
  Set-Content -Path $EnvFile -Value $content -Encoding UTF8 -NoNewline
  Write-Host "OK — e-mail ajouté à SUPER_ADMIN_EMAIL dans .env"
  Write-Host "    Redémarrez pnpm dev pour prendre en compte la variable."
} else {
  Write-Host ""
  Write-Host "ATTENTION : pour un rôle durable au login, ajoutez l'e-mail à SUPER_ADMIN_EMAIL :"
  Write-Host "  SUPER_ADMIN_EMAIL=$staffEmail"
  Write-Host "  ou relancez avec -AlsoEnv"
}
