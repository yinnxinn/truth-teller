param(
  [Parameter(Mandatory = $true)][string]$ManifestPath,
  [int]$StartIndex = 0,
  [int]$EndIndex = 59,
  [switch]$DryRun,
  [string]$ResultsPath = ''
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $ManifestPath)) { throw "Manifest not found: $ManifestPath" }
$manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding utf8 | ConvertFrom-Json
if ($StartIndex -lt 0 -or $EndIndex -ge $manifest.Count -or $StartIndex -gt $EndIndex) { throw "Invalid index range $StartIndex..$EndIndex for $($manifest.Count) items." }
if ($DryRun) {
  foreach ($i in $StartIndex..$EndIndex) {
    [pscustomobject]@{manifest=$ManifestPath;index=$i;title=$manifest[$i].title} | ConvertTo-Json -Compress
  }
  exit 0
}
$records = @()
for ($i = $StartIndex; $i -le $EndIndex; $i++) {
  $env:WECHAT_HOTSPOT_MANIFEST = $ManifestPath
  $env:WECHAT_HOTSPOT_INDEX = [string]$i
  Remove-Item Env:WECHAT_EXISTING_DRAFT_ID -ErrorAction SilentlyContinue
  $raw = & node 'D:\wechat\app\create_hotspot_draft_cdp.mjs' 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Draft upload failed at index $i. Output: $raw" }
  $text = $raw -join [Environment]::NewLine
  $id = if ($text -match 'appmsgid=(\d+)') { $Matches[1] } else { '' }
  $record = [pscustomobject]@{index=$i;title=$manifest[$i].title;appmsgid=$id;body=0;cover=$false;ok=([bool]$id)}
  $records += $record
  $record | ConvertTo-Json -Compress
  if ($ResultsPath) { $records | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ResultsPath -Encoding utf8 }
}
