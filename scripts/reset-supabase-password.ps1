# Reset du mot de passe d'un utilisateur Auth Supabase (Admin API).
# Usage :
#   .\scripts\reset-supabase-password.ps1 -UserId "uuid-utilisateur" -Password "NouveauMotDePasse"
#   .\scripts\reset-supabase-password.ps1 -Email "user@example.com" -Password "NouveauMotDePasse"
#
# Prérequis : SUPABASE_URL + SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) dans .env
# Note : sous PowerShell, curl natif = Invoke-WebRequest — ce script utilise Invoke-RestMethod.

param(
  [Parameter(Mandatory = $false)]
  [string]$UserId,

  [Parameter(Mandatory = $false)]
  [string]$Email,

  [Parameter(Mandatory = $true)]
  [string]$Password,

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

$url = Get-EnvValue "SUPABASE_URL"
if (-not $url) { $url = Get-EnvValue "VITE_SUPABASE_URL" }

$key = Get-EnvValue "SUPABASE_SECRET_KEY"
if (-not $key) { $key = Get-EnvValue "SUPABASE_SERVICE_ROLE_KEY" }

if (-not $url -or -not $key) {
  Write-Error "SUPABASE_URL et SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) sont requis dans .env"
}

$url = $url.TrimEnd("/")

$headers = @{
  apikey         = $key
  Authorization  = "Bearer $key"
  "Content-Type" = "application/json"
  # Les clés sb_secret_* refusent les User-Agent « navigateur » → se faire passer pour curl
  "User-Agent"   = "curl/8.5.0"
}

if (-not $UserId -and $Email) {
  Write-Host "Recherche de l'utilisateur $Email…"
  $encoded = [uri]::EscapeDataString($Email.Trim().ToLowerInvariant())
  $list = Invoke-RestMethod -Method Get -Uri "$url/auth/v1/admin/users?page=1&per_page=200" -Headers $headers
  $match = @($list.users) | Where-Object { $_.email -and $_.email.ToLowerInvariant() -eq $Email.Trim().ToLowerInvariant() } | Select-Object -First 1
  if (-not $match) {
    # Fallback filtre email si supporté par l'API
    try {
      $filtered = Invoke-RestMethod -Method Get -Uri "$url/auth/v1/admin/users?email=$encoded" -Headers $headers
      $match = @($filtered.users) | Select-Object -First 1
      if (-not $match -and $filtered.id) { $match = $filtered }
    } catch {
      # ignore
    }
  }
  if (-not $match -or -not $match.id) {
    Write-Error "Aucun utilisateur trouvé pour $Email"
  }
  $UserId = $match.id
  Write-Host "UID trouvé : $UserId"
}

$body = @{ password = $Password } | ConvertTo-Json -Compress

try {
  $res = Invoke-RestMethod -Method Put -Uri "$url/auth/v1/admin/users/$UserId" -Headers $headers -Body $body
  Write-Host "OK — mot de passe mis à jour pour $($res.email)"
} catch {
  Write-Host "ERREUR :" $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
