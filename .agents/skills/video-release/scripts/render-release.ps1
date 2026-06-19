param(
  [Parameter(Mandatory = $true)]
  [string]$Composition,
  [string]$Output,
  [double]$Scale = 1.5,
  [int]$Concurrency = 1,
  [int]$Crf = 18
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
Set-Location $repo

if (-not $Output) { $Output = "out/$Composition-1080p.mp4" }
New-Item -ItemType Directory -Path (Split-Path $Output) -Force | Out-Null
$env:NODE_OPTIONS = "--max-old-space-size=4096"

& npx.cmd remotion render src/index.ts $Composition $Output `
  --codec=h264 --crf=$Crf --scale=$Scale --concurrency=$Concurrency

if ($LASTEXITCODE -ne 0) { throw "Remotion render failed: $LASTEXITCODE" }

& ffprobe -v error `
  -show_entries "format=duration,size,bit_rate" `
  -show_entries "stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames,sample_rate,channels" `
  -of json $Output

if ($LASTEXITCODE -ne 0) { throw "ffprobe validation failed" }
