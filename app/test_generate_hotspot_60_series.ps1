$ErrorActionPreference = 'Stop'
$root = 'D:\wechat\content\drafts\2026-08-25-hotspot-60'
$generator = 'D:\wechat\app\generate_hotspot_60_series.mjs'
$run = & node $generator 2>&1
if ($LASTEXITCODE -ne 0) { throw "Generator must create a 60-item manifest. Output: $run" }
$manifestPath = Join-Path $root 'manifest.json'
if (!(Test-Path -LiteralPath $manifestPath)) { throw 'Manifest is missing.' }
$items = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($items.Count -ne 60) { throw "Expected 60 articles, got $($items.Count)." }
$titles = @{}
foreach ($item in $items) {
  if ($titles.ContainsKey($item.title)) { throw "Duplicate title: $($item.title)" }
  $titles[$item.title] = $true
  $html = Get-Content -LiteralPath $item.body_file -Raw
  $text = (($html -replace '<[^>]+>', '') -replace '\s+', ' ').Trim()
  if ($text.Length -lt 1000) { throw "Article too short: $($item.title) ($($text.Length))" }
  if ($html -notmatch '\[最后的判词\]') { throw "Missing verdict: $($item.title)" }
  if ($html -notmatch '原始资料：') { throw "Missing source link: $($item.title)" }
  if (([regex]::Matches($html, '\{\{(?:COVER|BODY)_IMAGE\}\}')).Count -ne 2) { throw "Expected cover and body image markers: $($item.title)" }
}
Write-Output "PASS: 60 complete article manifests."
