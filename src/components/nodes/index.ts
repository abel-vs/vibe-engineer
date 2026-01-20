import { playgroundNodeTypes } from "./playground-nodes";
import { bfdNodeTypes } from "./bfd-nodes";
import { pfdNodeTypes } from "./pfd-nodes";
import type { DiagramMode } from "@/lib/modes";

export const allNodeTypes = {
  ...playgroundNodeTypes,
  ...bfdNodeTypes,
  ...pfdNodeTypes,
};

export function getNodeTypesForMode(mode: DiagramMode) {
  switch (mode) {
    case "playground":
      return playgroundNodeTypes;
    case "bfd":
      return bfdNodeTypes;
    case "pfd":
      return pfdNodeTypes;
    default:
      return allNodeTypes;
  }
}

export { playgroundNodeTypes, bfdNodeTypes, pfdNodeTypes };
