# Crow Talon per-user cursor scheme installer.
# Running this script registers the scheme. It only activates it with -Activate.
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Activate)

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon'
$source = Join-Path $PSScriptRoot 'windows'
$destination = Join-Path $env:LOCALAPPDATA 'Crow\Cursors\Crow-Talon'
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

foreach ($file in $roles.Values) {
    $candidate = Join-Path $source $file
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Missing cursor payload: $candidate"
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

Write-Host "Crow Talon is registered for this Windows account."
if (-not $Activate) {
    Write-Host "Select it in Mouse Properties > Pointers, or rerun with -Activate."
}
