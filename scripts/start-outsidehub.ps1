$ErrorActionPreference = "SilentlyContinue"

$repo = "C:\Users\CLIENTE\Desktop\OUTSIDEHUB\OUTSIDEHUB"
$logDir = Join-Path $repo "logs"
$logFile = Join-Path $logDir "startup.log"
$cloudflared = Join-Path $repo "cloudflared.exe"
$cloudflaredConfig = "C:\Users\CLIENTE\.cloudflared\config.yml"

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-StartupLog {
  param([string]$Message)
  "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" | Add-Content -Path $logFile
}

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

Set-Location $repo
Write-StartupLog "OutsideHub startup begin"

if (-not (Test-PortListening -Port 3334)) {
  Write-StartupLog "Starting backend on port 3334"
  $env:NODE_ENV = "production"
  $env:PORT = "3334"
  $env:STATIC_PATH = "dist/public"
  Start-Process -FilePath "pnpm.cmd" -ArgumentList @("run", "start") -WorkingDirectory $repo -WindowStyle Hidden
} else {
  Write-StartupLog "Backend already listening on port 3334"
}

Start-Sleep -Seconds 3

$cloudflaredRunning = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -eq $cloudflared
}

if (-not $cloudflaredRunning -and (Test-Path $cloudflared) -and (Test-Path $cloudflaredConfig)) {
  Write-StartupLog "Starting Cloudflare tunnel"
  Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--config", $cloudflaredConfig, "run") -WorkingDirectory $repo -WindowStyle Hidden
} elseif ($cloudflaredRunning) {
  Write-StartupLog "Cloudflare tunnel already running"
} else {
  Write-StartupLog "Cloudflare tunnel not started: executable or config missing"
}

Write-StartupLog "OutsideHub startup end"
