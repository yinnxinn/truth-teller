$ErrorActionPreference = 'Stop'
$scriptPath = 'D:\wechat\app\generate_ai_job_series.mjs'
$output = & node $scriptPath 2>&1
if ($LASTEXITCODE -ne 0) { throw "Generator should create a complete 10-article manifest. Output: $output" }
$manifestPath = 'D:\wechat\content\drafts\2026-08-24-ai-jobs-series\manifest.json'
if (!(Test-Path -LiteralPath $manifestPath)) { throw 'Manifest was not created.' }
$items = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($items.Count -ne 10) { throw "Expected 10 articles, got $($items.Count)." }
foreach ($item in $items) {
  $html = Get-Content -LiteralPath $item.body_file -Raw
  $text = (($html -replace '<[^>]+>', '') -replace '\s+', ' ').Trim()
  if ($text.Length -lt 1050) { throw "Article is too short after stripping markup: $($item.title) ($($text.Length))." }
  if (([regex]::Matches($html, '\{\{COVER_IMAGE\}\}')).Count -ne 1) { throw "Cover marker missing or duplicated: $($item.title)." }
}
Write-Output "PASS: $($items.Count) articles, each at least 1050 text characters."
