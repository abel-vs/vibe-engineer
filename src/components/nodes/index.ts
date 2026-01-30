import { playgroundNodeTypes } from "./playground-nodes";
import { bfdNodeTypes } from "./bfd-nodes";
import { pfdNodeTypes } from "./pfd-nodes";
import { createDexpiNodeType, DexpiNodeComponent } from "./dexpi-node";
import { DEXPI_CATEGORIES, categoryToNodeType } from "@/lib/dexpi-config";
import type { DiagramMode } from "@/lib/modes";

// Generate DEXPI node types dynamically for all categories
export const dexpiNodeTypes: Record<string, typeof DexpiNodeComponent> = {};

// Create a node type for each DEXPI category
DEXPI_CATEGORIES.forEach((categoryName) => {
  const nodeType = categoryToNodeType(categoryName);
  dexpiNodeTypes[nodeType] = createDexpiNodeType(categoryName);
});

export const allNodeTypes = {
  ...playgroundNodeTypes,
  ...bfdNodeTypes,
  ...pfdNodeTypes,
  ...dexpiNodeTypes,
};

export function getNodeTypesForMode(mode: DiagramMode) {
  switch (mode) {
    case "playground":
      return playgroundNodeTypes;
    case "bfd":
      return bfdNodeTypes;
    case "pfd":
      // PFD mode now uses DEXPI node types
      return { ...pfdNodeTypes, ...dexpiNodeTypes };
    default:
      return allNodeTypes;
  }
}

export { playgroundNodeTypes, bfdNodeTypes, pfdNodeTypes, dexpiNodeTypes };
