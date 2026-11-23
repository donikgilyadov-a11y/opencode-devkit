param(
    [string]$Action = "info",
    [int]$X = 0,
    [int]$Y = 0,
    [string]$Button = "left",
    [string]$Double = "0",
    [string]$Text = "",
    [string]$Key = "",
    [string]$Keys = "",
    [int]$Amount = 0,
    [string]$Title = "",
    [long]$Handle = 0
)
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class NativeInput {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, int data, UIntPtr extra);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class DpiHelperInput {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
[DpiHelperInput]::SetProcessDPIAware() | Out-Null

$KEYMAP = @{
    Enter = '{ENTER}'; Return = '{ENTER}'; Esc = '{ESC}'; Escape = '{ESC}';
    Tab = '{TAB}'; Backspace = '{BACKSPACE}'; Delete = '{DELETE}'; Insert = '{INSERT}';
    Home = '{HOME}'; End = '{END}'; PageUp = '{PGUP}'; PageDown = '{PGDN}';
    ArrowUp = '{UP}'; Up = '{UP}'; ArrowDown = '{DOWN}'; Down = '{DOWN}';
    ArrowLeft = '{LEFT}'; Left = '{LEFT}'; ArrowRight = '{RIGHT}'; Right = '{RIGHT}';
    Space = ' '; CapsLock = '{CAPSLOCK}'; NumLock = '{NUMLOCK}'; ScrollLock = '{SCROLLLOCK}';
    F1 = '{F1}'; F2 = '{F2}'; F3 = '{F3}'; F4 = '{F4}'; F5 = '{F5}'; F6 = '{F6}';
    F7 = '{F7}'; F8 = '{F8}'; F9 = '{F9}'; F10 = '{F10}'; F11 = '{F11}'; F12 = '{F12}'
}

function Resolve-Key([string]$k) {
    $t = $k.Trim()
    if ($KEYMAP.ContainsKey($t)) { return $KEYMAP[$t] }
    if ($t.Length -eq 1) { return $t }
    return $t
}

function Foreground-Title() {
    $h = [NativeInput]::GetForegroundWindow()
    $sb = New-Object System.Text.StringBuilder 512
    [NativeInput]::GetWindowText($h, $sb, 512) | Out-Null
    return $sb.ToString()
}

switch ($Action) {
    'info' {
        $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
        Write-Output "screen=$($b.Width)x$($b.Height) origin=$($b.X),$($b.Y) foreground=$(Foreground-Title)"
    }
    'move' {
        [NativeInput]::SetCursorPos($X, $Y) | Out-Null
        Write-Output "moved=$X,$Y"
    }
    'click' {
        [NativeInput]::SetCursorPos($X, $Y) | Out-Null
        $down = 0x0002
        $up = 0x0004
        if ($Button -eq 'right') { $down = 0x0008; $up = 0x0010 }
        if ($Button -eq 'middle') { $down = 0x0020; $up = 0x0040 }
        $count = 1
        if ($Double -eq '1' -or $Double -eq 'true') { $count = 2 }
        for ($i = 0; $i -lt $count; $i++) {
            [NativeInput]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
            [NativeInput]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
            if ($count -eq 2) { Start-Sleep -Milliseconds 80 }
        }
        Write-Output "clicked=$Button at=$X,$Y times=$count"
    }
    'type' {
        $old = $null
        try { $old = Get-Clipboard -Raw -ErrorAction SilentlyContinue } catch { $old = $null }
        Set-Clipboard -Value $Text
        [System.Windows.Forms.SendKeys]::SendWait('^v')
        Start-Sleep -Milliseconds 150
        Write-Output "typed chars=$($Text.Length) via clipboard"
        if ($null -ne $old) { Set-Clipboard -Value $old }
    }
    'key' {
        [System.Windows.Forms.SendKeys]::SendWait((Resolve-Key $Key))
        Write-Output "key=$Key"
    }
    'hotkey' {
        $parts = $Keys -split ',' | Where-Object { $_.Trim() -ne '' }
        if ($parts.Count -lt 2) { throw "hotkey needs at least two keys, for example Ctrl,Shift,S" }
        $seq = ''
        for ($i = 0; $i -lt $parts.Count - 1; $i++) {
            $m = $parts[$i].Trim().ToLowerInvariant()
            if ($m -eq 'ctrl' -or $m -eq 'control') { $seq += '^' }
            elseif ($m -eq 'alt') { $seq += '%' }
            elseif ($m -eq 'shift') { $seq += '+' }
            else { throw "unsupported modifier: $($parts[$i])" }
        }
        $seq += Resolve-Key $parts[$parts.Count - 1]
        [System.Windows.Forms.SendKeys]::SendWait($seq)
        Write-Output "hotkey=$($parts -join '+')"
    }
    'scroll' {
        [NativeInput]::mouse_event(0x0800, 0, 0, ($Amount * 120), [UIntPtr]::Zero)
        Write-Output "scroll=$Amount"
    }
    'windows' {
        Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | ForEach-Object {
            $r = New-Object NativeInput+RECT
            [NativeInput]::GetWindowRect($_.MainWindowHandle, [ref]$r) | Out-Null
            "handle=$($_.MainWindowHandle.ToInt64()) pid=$($_.Id) proc=$($_.ProcessName) rect=$($r.Left),$($r.Top),$($r.Right),$($r.Bottom) title=$($_.MainWindowTitle)"
        }
    }
    'activate' {
        $h = [IntPtr]::Zero
        if ($Handle -ne 0) { $h = [IntPtr]$Handle }
        else {
            $p = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$Title*" } | Select-Object -First 1
            if ($null -eq $p) { throw "window not found: $Title" }
            $h = $p.MainWindowHandle
        }
        [NativeInput]::ShowWindow($h, 9) | Out-Null
        $ok = [NativeInput]::SetForegroundWindow($h)
        Write-Output "activate=$h ok=$ok title=$(Foreground-Title)"
    }
    default { throw "unknown action: $Action" }
}
