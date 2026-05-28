import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Hello } from "./hello/index";
import { TitleOpen, titleOpenSchema } from "./title-open/index";
import { NarrationVideo } from "./narration/index";
import { ClockToQDemo } from "./digital-demo/index";
import { FanoutDemo } from "./fanout-demo/index";
import { LatchDemo } from "./latch-demo/index";
import { GlitchDemo } from "./glitch-demo/index";
import { MetastabilityDemo } from "./metastability-demo/index";
import { PipelineDemo } from "./pipeline-demo/index";
import type { z } from "zod";

type TitleOpenProps = z.infer<typeof titleOpenSchema>;

const calcTitleDuration: CalculateMetadataFunction<TitleOpenProps> = ({ props }) => {
  const fps = 30;
  // 每行间隔2秒(2*fps)，最后一行持续4秒(4*fps)
  const frames = (props.lines.length - 1) * 2 * fps + 4 * fps;
  return { durationInFrames: frames, fps, width: 1080, height: 1920 };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Hello"
        component={Hello}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="TitleOpen"
        component={TitleOpen}
        schema={titleOpenSchema}
        defaultProps={{"lines":["春来","花开","万物复苏"],"bgColor":"#0a0a2e","textColor":"#ffffff"}}
        calculateMetadata={calcTitleDuration}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="NarrationVideo"
        component={NarrationVideo}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ClockToQ"
        component={ClockToQDemo}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={600}
      />
      <Composition
        id="FanoutDemo"
        component={FanoutDemo}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={720}
      />
      <Composition
        id="LatchDemo"
        component={LatchDemo}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="GlitchDemo"
        component={GlitchDemo}
        durationInFrames={180}
        fps={60}
        width={1280}
        height={720}
      />
      <Composition
        id="MetastabilityDemo"
        component={MetastabilityDemo}
        durationInFrames={180}
        fps={60}
        width={1280}
        height={720}
      />
      <Composition
        id="PipelineDemo"
        component={PipelineDemo}
        durationInFrames={480}
        fps={60}
        width={1280}
        height={720}
      />
    </>
  );
};
