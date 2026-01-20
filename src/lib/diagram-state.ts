import type { Edge, Node } from "@xyflow/react";
import { DiagramMode, MODES } from "./modes";

export interface SerializedNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, string>;
}

export interface SerializedEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  label?: string;
  data?: Record<string, string>;
}

export interface DiagramStateForAI {
  mode: DiagramMode;
  modeName: string;
  modeRules: string[];
  availableNodeTypes: string[];
  availableEdgeTypes: string[];
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
}

export function serializeDiagramForAI(
  nodes: Node[],
  edges: Edge[],
  mode: DiagramMode,
  selectedNodes: string[],
  selectedEdges: string[]
): DiagramStateForAI {
  const modeConfig = MODES[mode];

  return {
    mode,
    modeName: modeConfig.name,
    modeRules: modeConfig.rules,
    availableNodeTypes: modeConfig.availableNodeTypes,
    availableEdgeTypes: modeConfig.availableEdgeTypes,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type || "default",
      label: (n.data?.label as string) || n.id,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data as Record<string, string> | undefined,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      type: e.type || "default",
      sourceId: e.source,
      targetId: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
      data: e.data as Record<string, string> | undefined,
    })),
    selectedNodeIds: selectedNodes,
    selectedEdgeIds: selectedEdges,
  };
}
