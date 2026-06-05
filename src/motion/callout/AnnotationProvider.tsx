// AnnotationProvider — React Context for callout + connector annotation state
// Wraps the spec→schedule→state pipeline so scene components consume context instead of
// calling computeAnnotationLayout / computeCalloutState manually.
import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { computeAnnotationLayout } from "./calloutSchedule";
import { computeCalloutState } from "./calloutState";
import type { CalloutDef, ConnectorDef, CalloutState, AnnotationLayout } from "./types";

interface AnnotationContextValue {
  state: CalloutState;
  layout: AnnotationLayout;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

interface AnnotationProviderProps {
  callouts: CalloutDef[];
  connectors: ConnectorDef[];
  aspectRatio?: "16:9" | "9:16";
  children: React.ReactNode;
}

export const AnnotationProvider: React.FC<AnnotationProviderProps> = ({
  callouts, connectors, aspectRatio, children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const layout = useMemo(
    () => computeAnnotationLayout(callouts, connectors, width, height, aspectRatio),
    [callouts, connectors, width, height, aspectRatio],
  );

  const state = useMemo(
    () => computeCalloutState(layout, frame, fps),
    [layout, frame, fps],
  );

  return (
    <AnnotationContext.Provider value={{ state, layout }}>
      {children}
    </AnnotationContext.Provider>
  );
};

export function useAnnotation(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error("useAnnotation must be used within AnnotationProvider");
  return ctx;
}
