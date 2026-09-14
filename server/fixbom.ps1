# BOM self-heal helper. ASCII only, no path-quoting hazards.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File fixbom.ps1 <file1.ps1> [file2.ps1 ...]
param([string[]]$Files)
foreach ($f in $Files) {
  if (-not (Test-Path -LiteralPath $f)) { continue }
  $b = [System.IO.File]::ReadAllBytes($f)
  $n = 0
  while ($n + 2 -lt $b.Length -and $b[$n] -eq 239 -and $b[$n+1] -eq 187 -and $b[$n+2] -eq 191) { $n += 3 }
  if ($n -gt 3) {
    $head = New-Object byte[] 3
    $head[0] = 239; $head[1] = 187; $head[2] = 191
    $rest = New-Object byte[] ($b.Length - $n)
    [Array]::Copy($b, $n, $rest, 0, $rest.Length)
    [System.IO.File]::WriteAllBytes($f, $head + $rest)
  }
}
exit 0
