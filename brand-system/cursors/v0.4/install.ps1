# Crow Talon v0.4 per-user cursor scheme installer.
# Running this script registers the scheme. It only activates it with -Activate.
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Activate)

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon v0.4'
$packageVersion = '0.4.0'
$source = Join-Path $PSScriptRoot 'windows'
$destination = Join-Path $env:LOCALAPPDATA 'Crow\Cursors\Crow-Talon-v0.4'
$schemesKey = 'HKCU:\Control Panel\Cursors\Schemes'
$cursorsKey = 'HKCU:\Control Panel\Cursors'

$roles = [ordered]@{
    Arrow       = 'normal.cur'
    Help        = 'help.cur'
    AppStarting = 'working.ani'
    Wait        = 'busy.ani'
    Crosshair   = 'precision.cur'
    IBeam       = 'text.cur'
    NWPen       = 'handwriting.cur'
    No          = 'unavailable.cur'
    SizeNS      = 'resize-v.cur'
    SizeWE      = 'resize-h.cur'
    SizeNWSE    = 'resize-d1.cur'
    SizeNESW    = 'resize-d2.cur'
    SizeAll     = 'move.cur'
    UpArrow     = 'alternate.cur'
    Hand        = 'link.cur'
}
$registered = $false

foreach ($file in $roles.Values) {
    $candidate = Join-Path $source $file
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Incomplete Crow Talon v$packageVersion package. Extract the entire ZIP before running install.ps1. Missing: $candidate"
    }
}

if ($PSCmdlet.ShouldProcess($destination, 'Install Crow Talon cursor files')) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    foreach ($file in $roles.Values) {
        Copy-Item -LiteralPath (Join-Path $source $file) -Destination $destination -Force
    }
    # Keep static fallbacks available even though the scheme prefers ANI.
    Copy-Item -LiteralPath (Join-Path $source 'working.cur') -Destination $destination -Force
    Copy-Item -LiteralPath (Join-Path $source 'busy.cur') -Destination $destination -Force

    New-Item -Path $schemesKey -Force | Out-Null
    $schemePaths = foreach ($file in $roles.Values) { Join-Path $destination $file }
    New-ItemProperty -Path $schemesKey -Name $schemeName -Value ($schemePaths -join ',') `
        -PropertyType String -Force | Out-Null
    $registered = $true
}

if ($Activate -and $PSCmdlet.ShouldProcess($schemeName, 'Activate cursor scheme')) {
    New-Item -Path $cursorsKey -Force | Out-Null
    foreach ($entry in $roles.GetEnumerator()) {
        Set-ItemProperty -Path $cursorsKey -Name $entry.Key `
            -Value (Join-Path $destination $entry.Value)
    }
    Set-Item -Path $cursorsKey -Value $schemeName

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrowCursorRefresh {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SystemParametersInfo(
        uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
'@
    if (-not [CrowCursorRefresh]::SystemParametersInfo(0x0057, 0, [IntPtr]::Zero, 3)) {
        throw "The scheme was registered, but Windows could not reload cursors."
    }
}

if ($registered) {
    Write-Host "Crow Talon v$packageVersion is registered for this Windows account."
} else {
    Write-Host "Crow Talon v$packageVersion registration was not performed."
}
if ($registered -and -not $Activate) {
    Write-Host "Select it in Mouse Properties > Pointers, or rerun with -Activate."
}
