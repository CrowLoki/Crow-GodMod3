[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'

$fonts = @(
    @{ File = 'CrowSignalDisplay-Regular.ttf'; Name = 'Crow Signal Display Regular (TrueType)' },
    @{ File = 'CrowSignalDisplay-Bold.ttf'; Name = 'Crow Signal Display Bold (TrueType)' },
    @{ File = 'CrowSignalMono-Regular.ttf'; Name = 'Crow Signal Mono Regular (TrueType)' },
    @{ File = 'CrowSignalMono-Bold.ttf'; Name = 'Crow Signal Mono Bold (TrueType)' }
)

foreach ($font in $fonts) {
    $destination = Join-Path $fontDirectory $font.File
    if ($PSCmdlet.ShouldProcess($destination, 'Uninstall Crow Signal font')) {
        Remove-ItemProperty -Path $registryPath -Name $font.Name -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
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

Write-Host 'Crow Signal fonts removed for the current Windows user.'

