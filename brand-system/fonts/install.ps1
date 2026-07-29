[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
$sourceDirectory = Join-Path $PSScriptRoot 'ttf'

$fonts = @(
    @{ File = 'CrowSignalDisplay-Regular.ttf'; Name = 'Crow Signal Display Regular (TrueType)' },
    @{ File = 'CrowSignalDisplay-Bold.ttf'; Name = 'Crow Signal Display Bold (TrueType)' },
    @{ File = 'CrowSignalMono-Regular.ttf'; Name = 'Crow Signal Mono Regular (TrueType)' },
    @{ File = 'CrowSignalMono-Bold.ttf'; Name = 'Crow Signal Mono Bold (TrueType)' }
)

New-Item -ItemType Directory -Path $fontDirectory -Force | Out-Null

foreach ($font in $fonts) {
    $source = Join-Path $sourceDirectory $font.File
    $destination = Join-Path $fontDirectory $font.File
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing font file: $source"
    }

    if ($PSCmdlet.ShouldProcess($destination, 'Install Crow Signal font')) {
        Copy-Item -LiteralPath $source -Destination $destination -Force
        New-ItemProperty -Path $registryPath -Name $font.Name -Value $destination -PropertyType String -Force | Out-Null
    }
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrowFontNotify {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam,
        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
'@

$result = [UIntPtr]::Zero
[void][CrowFontNotify]::SendMessageTimeout(
    [IntPtr]0xffff, 0x001D, [UIntPtr]::Zero, [IntPtr]::Zero,
    0x0002, 1000, [ref]$result
)

Write-Host 'Crow Signal fonts installed for the current Windows user.'

