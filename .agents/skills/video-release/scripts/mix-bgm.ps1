param(
  [Parameter(Mandatory = $true)]
  [string]$Video,
  [Parameter(Mandatory = $true)]
  [string]$Bgm,
  [Parameter(Mandatory = $true)]
  [string]$Output,
  [double]$BgmGainDb = -14,
  [double]$FadeInSeconds = 2.5,
  [double]$FadeOutSeconds = 4
)

$ErrorActionPreference = "Stop"
$durationText = & ffprobe -v error -show_entries format=duration -of csv=p=0 $Video
if ($LASTEXITCODE -ne 0) { throw "Cannot read video duration" }
$duration = [double]::Parse($durationText, [Globalization.CultureInfo]::InvariantCulture)
$fadeOutStart = [Math]::Max(0, $duration - $FadeOutSeconds)

$bgmFilter = "highpass=f=85,lowpass=f=12500,equalizer=f=2600:t=q:w=1.2:g=-4,volume=${BgmGainDb}dB,afade=t=in:st=0:d=${FadeInSeconds},afade=t=out:st=${fadeOutStart}:d=${FadeOutSeconds}"
$filter = "[1:a]$bgmFilter[bgm];[bgm][0:a]sidechaincompress=threshold=0.018:ratio=8:attack=20:release=500:makeup=1[ducked];[0:a][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[aout]"

& ffmpeg -y -v error -i $Video -stream_loop -1 -i $Bgm `
  -filter_complex $filter -map 0:v:0 -map "[aout]" -t $duration `
  -c:v copy -c:a aac -b:a 256k -movflags +faststart $Output

if ($LASTEXITCODE -ne 0) { throw "BGM mix failed: $LASTEXITCODE" }
