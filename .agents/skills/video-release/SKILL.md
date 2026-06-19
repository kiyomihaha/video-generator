---
name: video-release
description: Package Remotion videos for publishing with native 1080p rendering, 4:3 cover generation, licensed BGM adaptation, voice-priority sidechain mixing, media QA, and output cleanup. Use when preparing a final video for Xiaohongshu or another publishing platform, exporting high-resolution deliverables, creating a cover, adding background music, or validating final media files.
---

# Video Release

Follow this order. Do not skip QA.

## 1. Preflight

1. Run `npm run typecheck`.
2. Confirm the Composition ID and frame rate.
3. Confirm narration and subtitle assets are present.
4. Keep generated media in `out/`; never commit it.

## 2. Render

```powershell
npm run release:render -- -Composition ChipIOVideo
```

- Render 16:9 source compositions at native 1920×1080 with Remotion `--scale=1.5`.
- Use H.264, CRF 18, and concurrency 1 on memory-constrained Windows systems.
- Never upscale a completed 720p MP4 when the Remotion source is available.
- Preserve the source frame rate.

## 3. Cover

- Xiaohongshu landscape cover ratio: 4:3.
- Delivery size: 1600×1200.
- Recompose for 4:3; do not crop a 16:9 cover blindly.
- Use one dominant technical focal point and large mobile-readable Chinese copy.
- Keep text and critical objects inside 6% safe margins.
- Export PNG and high-quality JPG.
- Inspect the resized output visually.

## 4. BGM

Only use music for which the user has valid rights.

```powershell
npm run release:mix -- `
  -Video out/ChipIOVideo-1080p.mp4 `
  -Bgm path/to/bgm.mp3 `
  -Output out/ChipIOVideo-1080p-bgm.mp4
```

The script trims or loops the BGM, removes low rumble, reduces the 2–4 kHz speech band, applies fades, and uses narration as a sidechain signal.

Target the standalone BGM near -30 LUFS. Target the final mix near -16 LUFS and below -1 dBTP. Narration must remain dominant.

## 5. QA

```powershell
npm run release:qa -- -Video out/ChipIOVideo-1080p-bgm.mp4
```

Also inspect the title card, one frame per segment, every scene boundary, waveform/subtitle coexistence, and the final 1.5 seconds.

Reject missing subtitles, clipped text, unexpected black frames, audible pumping, BGM masking speech, incorrect resolution, or incomplete frame count.

## 6. Cleanup

Keep only the final video with BGM, narration-only master when requested, 4:3 cover PNG/JPG, and adapted standalone BGM when requested.

Delete previews, contact sheets, obsolete covers, source screen recordings, and intermediate mixes. Never delete source narration under `public/audio/`.
