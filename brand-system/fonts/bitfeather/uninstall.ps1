[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param()
$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
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

function Get-CrowBitfeatherRegistryProperty {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Test-Path -LiteralPath $registryPath)) {
        return $null
    }
    $properties = Get-ItemProperty -LiteralPath $registryPath -ErrorAction Stop
    return $properties.PSObject.Properties[$Name]
}

$attempted = 0
$removed = 0
$changed = $false
$failures = [Collections.Generic.List[string]]::new()
$nativeReady = $false

foreach ($entry in $fonts) {
    $destination = Join-Path $fontDirectory $entry.File
    $registryProperty = Get-CrowBitfeatherRegistryProperty -Name $entry.Name
    $filePresent = Test-Path -LiteralPath $destination -PathType Leaf
    if (-not $filePresent -and $null -eq $registryProperty) {
        continue
    }

    if ($PSCmdlet.ShouldProcess($destination, "Deactivate and uninstall $($entry.Name)")) {
        $attempted++
        $entryChanged = $false
        try {
            if (-not $nativeReady) {
                Initialize-CrowBitfeatherNative
                $nativeReady = $true
            }
            $resourcePath = $destination
            if (
                $null -ne $registryProperty -and
                -not [string]::IsNullOrWhiteSpace([string]$registryProperty.Value) -and
                [IO.Path]::IsPathRooted([string]$registryProperty.Value)
            ) {
                $resourcePath = [string]$registryProperty.Value
            }

            $resourceRemovals = 0
            while (
                [CrowBitfeatherFontNative]::RemoveFontResourceEx(
                    $resourcePath,
                    [uint32]0,
                    [IntPtr]::Zero
                )
            ) {
                $resourceRemovals++
                $entryChanged = $true
                if ($resourceRemovals -ge 64) {
                    throw 'font resource reference count exceeded the safe removal limit'
                }
            }

            if ($null -ne $registryProperty) {
                Remove-ItemProperty -LiteralPath $registryPath -Name $entry.Name -ErrorAction Stop
                $entryChanged = $true
            }
            if ($filePresent) {
                Remove-Item -LiteralPath $destination -Force -ErrorAction Stop
                $entryChanged = $true
            }
            if ($entryChanged) {
                $changed = $true
                $removed++
            }
        }
        catch {
            if ($entryChanged) {
                $changed = $true
            }
            [void]$failures.Add("$($entry.Name): $($_.Exception.Message)")
        }
    }
}

if ($changed) {
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
    throw ("Crow Bitfeather removal did not complete:`n - " + ($failures -join "`n - "))
}
if ($attempted -eq 0) {
    Write-Host 'No installed Crow Bitfeather fonts were found or approved for removal.'
    return
}
Write-Host ("Deactivated and removed {0} Crow Bitfeather fonts for the current Windows user." -f $removed)
