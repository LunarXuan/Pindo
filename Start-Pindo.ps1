$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

function Pause-And-Exit([int]$Code) {
  Write-Host ''
  Read-Host 'Press Enter to close this window'
  exit $Code
}

try {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Host 'ERROR: Node.js was not found. Please install Node.js and try again.' -ForegroundColor Red
    Pause-And-Exit 1
  }

  if (-not (Test-Path (Join-Path $ProjectDir 'node_modules'))) {
    Write-Host 'First launch: installing dependencies...'
    npm ci
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'ERROR: npm ci failed.' -ForegroundColor Red
      Pause-And-Exit 1
    }
  }

  if (-not (Test-Path (Join-Path $ProjectDir 'out\index.html'))) {
    Write-Host 'First launch: building the app...'
    npm run build
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'ERROR: npm run build failed.' -ForegroundColor Red
      Pause-And-Exit 1
    }
  }

  Write-Host 'Starting Pindo...'
  Write-Host 'If the browser does not open, copy the http://localhost:PORT URL from the server window.'

  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/k', 'node server.mjs --open' `
    -WorkingDirectory $ProjectDir
} catch {
  Write-Host "Launch failed: $($_.Exception.Message)" -ForegroundColor Red
  Pause-And-Exit 1
}
