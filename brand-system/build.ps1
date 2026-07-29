[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw 'Build environment is missing. Run .\setup.ps1 first.'
}

$scripts = @(
    'build_fonts.py',
    'build_cursors.py',
    'build_icons.py',
    'build_raster_exports.py',
    'build_manifest.py',
    'validate_pack.py'
)

foreach ($script in $scripts) {
    & $python (Join-Path $PSScriptRoot "scripts\$script")
    if ($LASTEXITCODE -ne 0) {
        throw "Crow Brand System build failed in $script."
    }
}

Write-Host 'Crow Brand System build and validation completed.'

