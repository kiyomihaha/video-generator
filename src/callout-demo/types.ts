import { z } from "zod";
import { calloutDemoSpecSchema } from "./schemas";

export type DiagramNode = z.infer<typeof calloutDemoSpecSchema>["diagram"]["nodes"][number];
export type CalloutDemoSpec = z.infer<typeof calloutDemoSpecSchema>;
