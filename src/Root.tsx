import React from "react";
import { Composition, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { Hello } from "./hello/index";
import { TitleOpen, titleOpenSchema } from "./title-open/index";
import { NarrationVideo } from "./narration/index";
import type { z } from "zod";
import { sceneRegistry } from "./scenes/registry";
import { VideoShell } from "./shell/VideoShell";
import { compositionDimensions } from "./shell/aspect";
import type { VideoShellConfig } from "./shell/types";
import { MASTER_WIDTH, MASTER_HEIGHT } from "./shell/types";

type TitleOpenProps = z.infer<typeof titleOpenSchema>;

const calcTitleDuration: CalculateMetadataFunction<TitleOpenProps> = ({ props }) => {
  const fps = 30;
  const frames = (props.lines.length - 1) * 2 * fps + 4 * fps;
  return { durationInFrames: frames, fps, width: 1080, height: 1920 };
};

/**
 * createShellWrappedComponent — factory that closes over SceneComponent,
 * shell config, and timing, then returns a standard React FC.
 * Avoids passing non-serializable React components through Remotion defaultProps.
 */
function createShellWrappedComponent<TSpec>(
  SceneComponent: React.ComponentType<{ spec: TSpec }>,
  shell: VideoShellConfig,
  titleFrames: number,
  outroFrames: number,
) {
  const displayName = `ShellWrapped(${SceneComponent.displayName ?? SceneComponent.name ?? "Scene"})`;

  const Wrapped: React.FC<{ spec: TSpec }> = ({ spec }) => {
    const { durationInFrames } = useVideoConfig();
    const sceneDuration = durationInFrames - titleFrames - outroFrames;
    return (
      <VideoShell
        config={shell}
        masterCanvasWidth={MASTER_WIDTH}
        masterCanvasHeight={MASTER_HEIGHT}
        sceneDurationFrames={sceneDuration}
        renderScene={() => <SceneComponent spec={spec} />}
      />
    );
  };
  Wrapped.displayName = displayName;
  return Wrapped;
}

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
      {Object.entries(sceneRegistry).map(([id, entry]) => {
        if (entry.shell) {
          const shell = entry.shell as VideoShellConfig;
          const targetAspect = shell.targetAspect ?? "16:9";
          const dims = compositionDimensions(targetAspect);
          const titleFrames = shell.title ? Math.round((shell.titleDurationSec ?? 3) * entry.fps) : 0;
          const outroFrames = shell.outro ? Math.round((shell.outroDurationSec ?? 3) * entry.fps) : 0;

          const ShellCalcMeta: CalculateMetadataFunction<{ spec: any }> = async (props) => {
            const sceneResult = await entry.calculateMetadata(props);
            const sceneDuration = sceneResult.durationInFrames ?? 300;
            return {
              ...sceneResult,
              durationInFrames: titleFrames + sceneDuration + outroFrames,
            };
          };

          const ShellComponent = createShellWrappedComponent(
            entry.component, shell, titleFrames, outroFrames,
          );

          return (
            <Composition
              key={id}
              id={id}
              component={ShellComponent}
              defaultProps={{ spec: entry.spec }}
              calculateMetadata={ShellCalcMeta as any}
              fps={entry.fps}
              width={dims.width}
              height={dims.height}
            />
          );
        }

        return (
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
        );
      })}
    </>
  );
};
