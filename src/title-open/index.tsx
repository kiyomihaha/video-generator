import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence, spring } from "remotion";
import { z } from "zod";

// 用 Zod 定义参数类型和默认值
export const titleOpenSchema = z.object({
  lines: z.array(z.string()),
  bgColor: z.string().default("#0a0a2e"),
  textColor: z.string().default("#ffffff"),
});

type Props = z.infer<typeof titleOpenSchema>;

export const TitleOpen: React.FC<Props> = ({ lines, bgColor, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowOpacity = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.3, 0.6],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          width: 600,
          height: 600,
          marginLeft: -300,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(40,40,120,${glowOpacity}) 0%, transparent 70%)`,
        }}
      />
      {lines.map((line, i) => (
        <Sequence key={i} from={i * 2 * fps} durationInFrames={4 * fps}>
          <SlideIn text={line} fps={fps} textColor={textColor} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SlideIn = ({ text, fps, textColor }: { text: string; fps: number; textColor: string }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const slide = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const translateY = interpolate(slide, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        textAlign: "center",
        top: "45%",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <span style={{ fontSize: 72, color: textColor, fontWeight: 600, letterSpacing: 8 }}>
        {text}
      </span>
    </div>
  );
};
