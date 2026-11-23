param(
  [string]$Boost = "$env:USERPROFILE\Desktop\opencode-boost",
  [string]$Config = "$env:USERPROFILE\.config\opencode",
  [switch]$NoConfig
)

$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path $node)) { throw 'Node.js не найден. Установите Node.js 18+ и повторите.' }

$script = Join-Path $PSScriptRoot 'install.js'
$argv = @($script, '--boost', $Boost, '--config', $Config)
if ($NoConfig) { $argv += '--no-config' }

& $node @argv
if ($LASTEXITCODE -ne 0) { throw "Установщик завершился с кодом $LASTEXITCODE" }
