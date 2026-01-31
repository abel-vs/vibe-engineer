import type { DiagramMode } from "@/lib/modes";
import type { Edge, Node } from "@xyflow/react";
import dagre from "dagre";

export interface LayoutOptions {
  direction: "TB" | "LR" | "BT" | "RL"; // Top-Bottom, Left-Right, etc.
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number; // Separation between ranks (levels)
  nodeSep?: number; // Separation between nodes in the same rank
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: "TB",
  nodeWidth: 172,
  nodeHeight: 60,
  rankSep: 80,
  nodeSep: 50,
};

/**
 * Get the default layout direction based on diagram mode.
 * BFD, PFD, and P&ID use left-to-right flow (engineering convention), playground uses top-to-bottom.
 */
export function getDefaultDirection(
  mode: DiagramMode
): LayoutOptions["direction"] {
  return mode === "playground" ? "TB" : "LR";
}

/**
 * Get mode-specific layout options for better diagram organization.
 * P&ID needs more horizontal spacing for inline valves, BFD needs less detail spacing.
 */
export function getModeLayoutOptions(
  mode: DiagramMode
): Partial<LayoutOptions> {
  switch (mode) {
    case "pid":
      // P&ID: More horizontal spacing for inline valves, closer vertical spacing
      return {
        direction: "LR",
        nodeWidth: 80,
        nodeHeight: 80,
        rankSep: 120, // More space between process stages for valves
        nodeSep: 60, // Moderate vertical spacing
      };
    case "pfd":
      // PFD: Standard equipment spacing
      return {
        direction: "LR",
        nodeWidth: 100,
        nodeHeight: 80,
        rankSep: 100,
        nodeSep: 60,
      };
    case "bfd":
      // BFD: Larger blocks, more spacing
      return {
        direction: "LR",
        nodeWidth: 150,
        nodeHeight: 80,
        rankSep: 100,
        nodeSep: 70,
      };
    case "playground":
    default:
      return DEFAULT_OPTIONS;
  }
}

/**
 * Auto-layout nodes using the dagre graph layout algorithm.
 * Returns a new array of nodes with updated positions.
 * Pinned nodes (manually positioned by user) retain their positions.
 */
export function getLayoutedNodes(
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {},
  pinnedNodeIds: Set<string> = new Set()
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph options
  dagreGraph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    // Get node dimensions from measured dimensions or use defaults
    const width = node.measured?.width ?? node.width ?? opts.nodeWidth!;
    const height = node.measured?.height ?? node.height ?? opts.nodeHeight!;

    dagreGraph.setNode(node.id, {
      width,
      height,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Map the new positions back to nodes (respecting pinned nodes)
  return nodes.map((node) => {
    // If node is pinned, keep its current position
    if (pinnedNodeIds.has(node.id)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.measured?.width ?? node.width ?? opts.nodeWidth!;
    const height = node.measured?.height ?? node.height ?? opts.nodeHeight!;

    // Dagre returns center positions, convert to top-left for React Flow
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });
}

/**
 * Layout direction labels for UI
 */
export const LAYOUT_DIRECTIONS: {
  value: LayoutOptions["direction"];
  label: string;
}[] = [
  { value: "TB", label: "Top to Bottom" },
  { value: "LR", label: "Left to Right" },
  { value: "BT", label: "Bottom to Top" },
  { value: "RL", label: "Right to Left" },
];
