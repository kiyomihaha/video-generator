import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Hello } from "./hello/index";
import { TitleOpen, titleOpenSchema } from "./title-open/index";
import { NarrationVideo } from "./narration/index";
import type { z } from "zod";
import { sceneRegistry } from "./scenes/registry";

type TitleOpenProps = z.infer<typeof titleOpenSchema>;

const calcTitleDuration: CalculateMetadataFunction<TitleOpenProps> = ({ props }) => {
  const fps = 30;
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
      {Object.entries(sceneRegistry).map(([id, entry]) => (
        <Composition
          key={id}
          id={id}
          component={entry.component}
          defaultProps={{ spec: entry.spec }}
          calculateMetadata={entry.calculateMetadata}
          fps={entry.fps}
          width={entry.width}
          height={entry.height}
        />
      ))}
    </>
  );
};
