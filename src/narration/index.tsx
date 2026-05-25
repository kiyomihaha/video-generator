import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const NarrationVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a", justifyContent: "center", alignItems: "center" }}>
      <Audio src={staticFile("narration.wav")} />
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <h1 style={{ fontSize: 80, fontWeight: 700, color: "#ffffff", margin: 0 }}>AI 视频生成</h1>
        <p style={{ fontSize: 32, color: "#8888cc", marginTop: 20 }}>让创意变为现实</p>
      </div>
    </AbsoluteFill>
  );
};
