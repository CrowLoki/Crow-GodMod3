# Crow Talon v0.4 per-user cursor scheme uninstaller.
[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon v0.4'
$destination = Join-Path $env:LOCALAPPDATA 'Crow\Cursors\Crow-Talon-v0.4'
$schemesKey = 'HKCU:\Control Panel\Cursors\Schemes'
$cursorsKey = 'HKCU:\Control Panel\Cursors'
$registryRoles = @(
    'Arrow','Help','AppStarting','Wait','Crosshair','IBeam','NWPen','No',
    'SizeNS','SizeWE','SizeNWSE','SizeNESW','SizeAll','UpArrow','Hand'
)
$removed = $false

if ($PSCmdlet.ShouldProcess($schemeName, 'Unregister cursor scheme')) {
    Remove-ItemProperty -Path $schemesKey -Name $schemeName -ErrorAction SilentlyContinue

    $wasActive = $false
    foreach ($role in $registryRoles) {
        $current = (Get-ItemProperty -Path $cursorsKey -Name $role `
            -ErrorAction SilentlyContinue).$role
        if ($current -and $current.StartsWith($destination, [StringComparison]::OrdinalIgnoreCase)) {
            Set-ItemProperty -Path $cursorsKey -Name $role -Value ''
            $wasActive = $true
        }
    }
    if ($wasActive) {
        Set-Item -Path $cursorsKey -Value ''
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrowCursorRefresh {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SystemParametersInfo(
        uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
'@
        [void][CrowCursorRefresh]::SystemParametersInfo(0x0057, 0, [IntPtr]::Zero, 3)
    }

    $safeRoot = Join-Path $env:LOCALAPPDATA 'Crow\Cursors'
    if ((Test-Path -LiteralPath $destination) -and
        $destination.StartsWith($safeRoot, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $destination -Recurse -Force
    }
    $removed = $true
}

if ($removed) {
    Write-Host 'Crow Talon v0.4 has been removed from this Windows account.'
} else {
    Write-Host 'Crow Talon removal was not performed.'
}
