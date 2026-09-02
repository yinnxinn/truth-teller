$ErrorActionPreference = 'Stop'
$runner = 'D:\wechat\app\upload_hotspot_drafts.ps1'
$manifest = 'D:\wechat\content\drafts\2026-08-25-hotspot-60\manifest.json'
$out = & $runner -ManifestPath $manifest -StartIndex 1 -EndIndex 2 -DryRun 2>&1
if ($LASTEXITCODE -ne 0) { throw "Runner should accept an explicit manifest. Output: $out" }
$records = $out | ForEach-Object { $_ | ConvertFrom-Json }
if ($records[0].manifest -ne $manifest) { throw 'Runner did not preserve the explicit manifest path.' }
if ($records.Count -ne 2 -or $records[0].index -ne 1 -or $records[1].index -ne 2) { throw 'Runner did not emit the requested indices.' }
Write-Output 'PASS: explicit manifest and index range survive child execution.'
