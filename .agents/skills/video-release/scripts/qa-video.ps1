param(
  [Parameter(Mandatory = $true)]
  [string]$Video
)

$ErrorActionPreference = "Continue"
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

Write-Host "=== Media metadata ==="
& ffprobe -v error `
  -show_entries "format=filename,duration,size,bit_rate" `
  -show_entries "stream=index,codec_name,codec_type,width,height,r_frame_rate,nb_frames,sample_rate,channels" `
  -of json $Video

Write-Host "=== Loudness ==="
& ffmpeg -hide_banner -i $Video -map 0:a:0 `
  -af "loudnorm=I=-16:TP=-1:LRA=11:print_format=json" `
  -f null NUL 2>&1 | Select-Object -Last 24

Write-Host "=== Silence >= 1 second ==="
& ffmpeg -hide_banner -i $Video -map 0:a:0 `
  -af "silencedetect=noise=-45dB:d=1.0" `
  -f null NUL 2>&1 | Select-String "silence_"

Write-Host "=== Black frames >= 0.15 second ==="
& ffmpeg -hide_banner -i $Video `
  -vf "blackdetect=d=0.15:pix_th=0.02" `
  -an -f null NUL 2>&1 | Select-String "black_"

Write-Host "=== SHA-256 ==="
Get-FileHash $Video -Algorithm SHA256 | Format-List
