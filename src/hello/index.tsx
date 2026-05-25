import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate,Easing,spring } from "remotion";

export const Hello = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scaleProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scaleProgress})`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: "#ffffff",
            margin: 0,
          }}
        >
          Hello
        </h1>
        <p
          style={{
            fontSize: 32,
            color: "#8888cc",
            marginTop: 20,
          }}
        >
          Remotion Video Generator
        </p>
      </div>
    </AbsoluteFill>
  );
};
