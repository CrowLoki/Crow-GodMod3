[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param()
$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
$sourceDirectory = Join-Path $PSScriptRoot 'ttf'
$fonts = @(
    @{ File = 'CrowBitfeatherDisplay-Regular.ttf'; Name = 'Crow Bitfeather Display Regular (TrueType)' },
    @{ File = 'CrowBitfeatherDisplay-Bold.ttf'; Name = 'Crow Bitfeather Display Bold (TrueType)' },
    @{ File = 'CrowBitfeatherMono-Regular.ttf'; Name = 'Crow Bitfeather Mono Regular (TrueType)' },
    @{ File = 'CrowBitfeatherMono-Bold.ttf'; Name = 'Crow Bitfeather Mono Bold (TrueType)' }
)

$nativeSource = @"
using System;
using System.Runtime.InteropServices;

public static class CrowBitfeatherFontNative
{
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "AddFontResourceExW")]
    public static extern int AddFontResourceEx(string name, uint flags, IntPtr reserved);

    [return: MarshalAs(UnmanagedType.Bool)]
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "RemoveFontResourceExW")]
    public static extern bool RemoveFontResourceEx(string name, uint flags, IntPtr reserved);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "SendMessageTimeoutW")]
    public static extern IntPtr SendMessageTimeout(
        IntPtr window,
        uint message,
        IntPtr wParam,
        IntPtr lParam,
        uint flags,
        uint timeout,
        out IntPtr result);
}
"@

function Initialize-CrowBitfeatherNative {
    if ($null -eq ('CrowBitfeatherFontNative' -as [type])) {
        Add-Type -TypeDefinition $nativeSource -ErrorAction Stop
    }
}

function Send-CrowBitfeatherFontChange {
    $result = [IntPtr]::Zero
    $sent = [CrowBitfeatherFontNative]::SendMessageTimeout(
        [IntPtr]0xFFFF,
        [uint32]0x001D,
        [IntPtr]::Zero,
        [IntPtr]::Zero,
        [uint32]0x0002,
        [uint32]5000,
        [ref]$result
    )
    if ($sent -eq [IntPtr]::Zero) {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "WM_FONTCHANGE broadcast failed with Win32 error $code."
    }
}

foreach ($entry in $fonts) {
    $source = Join-Path $sourceDirectory $entry.File
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing font file: $source"
    }
}

if (-not (Test-Path -LiteralPath $fontDirectory -PathType Container)) {
    if ($PSCmdlet.ShouldProcess($fontDirectory, 'Create per-user font directory')) {
        New-Item -ItemType Directory -Path $fontDirectory -Force -ErrorAction Stop | Out-Null
    }
}
if (-not (Test-Path -LiteralPath $registryPath)) {
    if ($PSCmdlet.ShouldProcess($registryPath, 'Create per-user font registry key')) {
        New-Item -Path $registryPath -Force -ErrorAction Stop | Out-Null
    }
}
if (-not $WhatIfPreference) {
    if (-not (Test-Path -LiteralPath $fontDirectory -PathType Container)) {
        throw "Per-user font directory was not created: $fontDirectory"
    }
    if (-not (Test-Path -LiteralPath $registryPath)) {
        throw "Per-user font registry key was not created: $registryPath"
    }
}

$attempted = 0
$activated = [Collections.Generic.List[string]]::new()
$failures = [Collections.Generic.List[string]]::new()
$nativeReady = $false

foreach ($entry in $fonts) {
    $source = Join-Path $sourceDirectory $entry.File
    $destination = Join-Path $fontDirectory $entry.File
    if ($PSCmdlet.ShouldProcess($destination, "Install and activate $($entry.Name)")) {
        $attempted++
        try {
            if (-not $nativeReady) {
                Initialize-CrowBitfeatherNative
                $nativeReady = $true
            }
            Copy-Item -LiteralPath $source -Destination $destination -Force -ErrorAction Stop
            New-ItemProperty -LiteralPath $registryPath -Name $entry.Name -Value $destination -PropertyType String -Force -ErrorAction Stop | Out-Null
            $loaded = [CrowBitfeatherFontNative]::AddFontResourceEx(
                $destination,
                [uint32]0,
                [IntPtr]::Zero
            )
            if ($loaded -lt 1) {
                $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
                throw "persistent registration succeeded, but current-session activation failed with Win32 error $code"
            }
            [void]$activated.Add($entry.Name)
        }
        catch {
            [void]$failures.Add("$($entry.Name): $($_.Exception.Message)")
        }
    }
}

if ($activated.Count -gt 0) {
    if ($PSCmdlet.ShouldProcess('Windows desktop session', 'Broadcast WM_FONTCHANGE')) {
        try {
            Send-CrowBitfeatherFontChange
        }
        catch {
            [void]$failures.Add($_.Exception.Message)
        }
    }
    else {
        [void]$failures.Add('WM_FONTCHANGE was not broadcast.')
    }
}

if ($WhatIfPreference) {
    Write-Host 'WhatIf preview complete. No changes were made.'
    return
}
if ($failures.Count -gt 0) {
    throw ("Crow Bitfeather installation did not complete:`n - " + ($failures -join "`n - "))
}
if ($attempted -eq 0) {
    Write-Host 'No Crow Bitfeather installation changes were approved.'
    return
}
Write-Host ("Installed and activated {0} Crow Bitfeather fonts for the current Windows user." -f $activated.Count)
