Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinInspector {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$procs = Get-Process -Name "StudyLab*" -ErrorAction SilentlyContinue
foreach ($p in $procs) {
  Write-Host "Process ID: $($p.Id)"
  [WinInspector]::EnumWindows({
    param($h, $l)
    $pidVal = 0
    [WinInspector]::GetWindowThreadProcessId($h, [ref]$pidVal) | Out-Null
    if ($pidVal -eq $p.Id) {
      $r = New-Object WinInspector+RECT
      [WinInspector]::GetWindowRect($h, [ref]$r) | Out-Null
      $sb = New-Object System.Text.StringBuilder 256
      [WinInspector]::GetWindowText($h, $sb, 256) | Out-Null
      $w = $r.Right - $r.Left
      $h = $r.Bottom - $r.Top
      if ($w -gt 0 -and $h -gt 0) {
        Write-Host "  HWND: $h Title: '$($sb.ToString())' Rect: ($($r.Left), $($r.Top), $($r.Right), $($r.Bottom)) Width: $w Height: $h"
      }
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
}
