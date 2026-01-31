import { categoryToNodeType, DEXPI_CATEGORIES } from "@/lib/dexpi-config";
import { CATEGORY_ORDER } from "@/lib/drawio-pid-config";
import type { DiagramMode } from "@/lib/modes";
import { bfdNodeTypes } from "./bfd-nodes";
import { createDexpiNodeType, DexpiNodeComponent } from "./dexpi-node";
import {
  createDrawioPidNodeType,
  DrawioPidNodeComponent,
} from "./drawio-pid-node";
import { pfdNodeTypes } from "./pfd-nodes";
import { playgroundNodeTypes } from "./playground-nodes";

// Generate DEXPI node types dynamically for all categories
export const dexpiNodeTypes: Record<string, typeof DexpiNodeComponent> = {};

// Create a node type for each DEXPI category
DEXPI_CATEGORIES.forEach((categoryName) => {
  const nodeType = categoryToNodeType(categoryName);
  dexpiNodeTypes[nodeType] = createDexpiNodeType(categoryName);
});

// Generate Draw.io P&ID node types for all categories
export const drawioPidNodeTypes: Record<string, typeof DrawioPidNodeComponent> =
  {};

// Create a node type for each draw.io category
// Using "drawio_" prefix to distinguish from DEXPI types
CATEGORY_ORDER.forEach((categoryName) => {
  const nodeType = `drawio_${categoryName}`;
  drawioPidNodeTypes[nodeType] = createDrawioPidNodeType(categoryName);
});

// Also add a generic drawio_pid type
drawioPidNodeTypes["drawio_pid"] = DrawioPidNodeComponent;

export const allNodeTypes = {
  ...playgroundNodeTypes,
  ...bfdNodeTypes,
  ...pfdNodeTypes,
  ...dexpiNodeTypes,
  ...drawioPidNodeTypes,
};

export function getNodeTypesForMode(mode: DiagramMode) {
  switch (mode) {
    case "playground":
      return playgroundNodeTypes;
    case "bfd":
      return bfdNodeTypes;
    case "pfd":
      // PFD mode now uses DEXPI and Draw.io P&ID node types
      return { ...pfdNodeTypes, ...dexpiNodeTypes, ...drawioPidNodeTypes };
    default:
      return allNodeTypes;
  }
}

export {
  bfdNodeTypes,
  dexpiNodeTypes,
  drawioPidNodeTypes,
  pfdNodeTypes,
  playgroundNodeTypes,
};
