import type { Node, Edge } from "@xyflow/react";

type TargetHandle = "left" | "top" | "bottom-in";

/**
 * Select which target handle to use based on relative node positions.
 * Logic:
 * - Source above target → enter from top
 * - Source below target → enter from bottom
 * - Otherwise (horizontal) → enter from left
 */
export function selectTargetHandle(
  sourceNode: Node,
  targetNode: Node
): TargetHandle {
  const sourceY = sourceNode.position.y + (sourceNode.measured?.height ?? 50) / 2;
  const targetCenterY = targetNode.position.y + (targetNode.measured?.height ?? 50) / 2;

  const verticalOffset = sourceY - targetCenterY;
  const threshold = 60; // pixels - how far off-center before switching handles

  if (verticalOffset < -threshold) {
    // Source is significantly above target → enter from top
    return "top";
  } else if (verticalOffset > threshold) {
    // Source is significantly below target → enter from bottom
    return "bottom-in";
  }

  // Default: roughly horizontal → enter from left
  return "left";
}

/**
 * Recalculate handle assignments for all edges based on current node positions.
 * Used after auto-layout to ensure edges connect to the correct handles.
 */
export function recalculateEdgeHandles(
  edges: Edge[],
  nodes: Node[]
): Edge[] {
  return edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return edge;
    }

    const sourceHandle = "right";
    const targetHandle = selectTargetHandle(sourceNode, targetNode);

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });
}
