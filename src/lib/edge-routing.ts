import type { Edge } from "@xyflow/react";

/**
 * No-op: preserves user handle selections as-is.
 */
export function recalculateEdgeHandles(edges: Edge[]): Edge[] {
  return edges;
}
