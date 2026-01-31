import { getLayoutedNodes, type LayoutOptions } from "@/lib/auto-layout";
import { recalculateEdgeHandles } from "@/lib/edge-routing";
import type { DiagramMode } from "@/lib/modes";
import type { DiagramStyle } from "@/lib/styles";
import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  XYPosition,
} from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { create } from "zustand";

// History snapshot - only track the data that changes with user actions
interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

// Maximum history size to prevent memory issues
const MAX_HISTORY_SIZE = 50;

export interface DiagramState {
  // Diagram data
  nodes: Node[];
  edges: Edge[];
  mode: DiagramMode;
  style: DiagramStyle;

  // Selection state
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Flag to trigger zoom on selection (for voice commands)
  shouldZoomToSelection: boolean;

  // Pinned nodes (manually positioned, preserved during auto-layout)
  pinnedNodeIds: Set<string>;

  // History for undo/redo
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // React Flow instance for viewport control
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance) => void;

  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setMode: (mode: DiagramMode) => void;
  setStyle: (style: DiagramStyle) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addEdgeAction: (edge: Edge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  setSelectedNodes: (nodeIds: string[], zoomTo?: boolean) => void;
  setSelectedEdges: (edgeIds: string[], zoomTo?: boolean) => void;
  clearZoomFlag: () => void;
  clearCanvas: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Load/save
  loadDiagram: (
    nodes: Node[],
    edges: Edge[],
    mode: DiagramMode,
    style?: DiagramStyle
  ) => void;

  // Layout
  organizeLayout: (
    direction?: LayoutOptions["direction"],
    pinnedNodeIds?: Set<string>
  ) => void;

  // Viewport control
  zoomToNode: (nodeId: string) => void;

  // Edge routing
  updateEdgeHandles: () => void;

  // Pinning
  clearPinnedNodes: () => void;

  // Inline component insertion (for P&ID)
  insertNodeOnEdge: (
    edgeId: string,
    position: XYPosition,
    nodeConfig: Partial<Node>
  ) => string | null;
}

// Helper to create a deep clone of nodes/edges for history
const cloneSnapshot = (nodes: Node[], edges: Edge[]): HistorySnapshot => ({
  nodes: JSON.parse(JSON.stringify(nodes)),
  edges: JSON.parse(JSON.stringify(edges)),
});

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  mode: "playground",
  style: "engineering",
  selectedNodeIds: [],
  selectedEdgeIds: [],
  shouldZoomToSelection: false,
  pinnedNodeIds: new Set<string>(),
  past: [],
  future: [],
  reactFlowInstance: null,

  setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),

  onNodesChange: (changes) => {
    // Check if this is a meaningful change (not just selection or dimension measurements)
    // Note: "dimensions" changes are excluded because React Flow fires them continuously
    // as it measures nodes, which can cause infinite re-render loops
    const hasMeaningfulChange = changes.some(
      (c) => c.type === "remove" || c.type === "position"
    );

    if (hasMeaningfulChange) {
      // Save to history before applying changes
      const { nodes, edges, past } = get();
      const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
        -MAX_HISTORY_SIZE
      );
      set({ past: newPast, future: [] });
    }

    set({ nodes: applyNodeChanges(changes, get().nodes) });

    // Track nodes that were manually dragged (pin them for auto-layout)
    const dragEndChanges = changes.filter(
      (c) => c.type === "position" && c.dragging === false
    ) as Array<{ id: string; type: "position"; dragging: boolean }>;

    if (dragEndChanges.length > 0) {
      const { pinnedNodeIds } = get();
      const newPinnedIds = new Set(pinnedNodeIds);
      dragEndChanges.forEach((c) => newPinnedIds.add(c.id));
      set({ pinnedNodeIds: newPinnedIds });
    }

    // Update selection from changes
    const selectionChanges = changes.filter(
      (c) => c.type === "select"
    ) as Array<{ id: string; selected: boolean; type: "select" }>;

    if (selectionChanges.length > 0) {
      const selectedIds = get()
        .nodes.filter((n) => n.selected)
        .map((n) => n.id);
      set({ selectedNodeIds: selectedIds });
    }
  },

  onEdgesChange: (changes) => {
    // Check if this is a meaningful change (not just selection)
    const hasMeaningfulChange = changes.some((c) => c.type === "remove");

    if (hasMeaningfulChange) {
      // Save to history before applying changes
      const { nodes, edges, past } = get();
      const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
        -MAX_HISTORY_SIZE
      );
      set({ past: newPast, future: [] });
    }

    set({ edges: applyEdgeChanges(changes, get().edges) });

    // Update selection from changes
    const selectionChanges = changes.filter(
      (c) => c.type === "select"
    ) as Array<{ id: string; selected: boolean; type: "select" }>;

    if (selectionChanges.length > 0) {
      const selectedIds = get()
        .edges.filter((e) => e.selected)
        .map((e) => e.id);
      set({ selectedEdgeIds: selectedIds });
    }
  },

  onConnect: (connection) => {
    // Save to history before adding edge
    const { edges, past } = get();
    const newPast = [...past, cloneSnapshot(get().nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );

    // Preserve the actual handle IDs from the user's connection
    const sourceHandle = connection.sourceHandle ?? null;
    const targetHandle = connection.targetHandle ?? null;

    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle,
      targetHandle,
      type: "stream",
    };
    set({ edges: addEdge(newEdge, get().edges), past: newPast, future: [] });
  },

  setMode: (mode) => set({ mode }),

  setStyle: (style) => set({ style }),

  setNodes: (nodes) => {
    const { nodes: currentNodes, edges, past } = get();
    const newPast = [...past, cloneSnapshot(currentNodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({ nodes, past: newPast, future: [] });
  },

  setEdges: (edges) => {
    const { nodes, edges: currentEdges, past } = get();
    const newPast = [...past, cloneSnapshot(nodes, currentEdges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({ edges, past: newPast, future: [] });
  },

  addNode: (node) => {
    const { nodes, edges, past } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({ nodes: [...nodes, node], past: newPast, future: [] });
  },

  addEdgeAction: (edge) => {
    const { nodes, edges, past } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({ edges: [...edges, edge], past: newPast, future: [] });
  },

  removeNode: (nodeId) => {
    const { nodes, edges, past, selectedNodeIds } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );

    // Find edges connected to this node
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    // Check if this is an inline component (exactly 1 incoming and 1 outgoing edge)
    // If so, reconnect the edges to maintain flow continuity
    let newEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );

    if (incomingEdges.length === 1 && outgoingEdges.length === 1) {
      const inEdge = incomingEdges[0];
      const outEdge = outgoingEdges[0];

      // Create a reconnecting edge from the source to the target
      const reconnectingEdge: Edge = {
        id: `edge_reconnect_${Date.now()}`,
        source: inEdge.source,
        target: outEdge.target,
        sourceHandle: inEdge.sourceHandle,
        targetHandle: outEdge.targetHandle,
        type: inEdge.type || outEdge.type, // Preserve edge type
        // Inherit other properties from the incoming edge
        label: inEdge.label,
        data: inEdge.data,
      };

      newEdges = [...newEdges, reconnectingEdge];
    }

    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: newEdges,
      selectedNodeIds: selectedNodeIds.filter((id) => id !== nodeId),
      past: newPast,
      future: [],
    });
  },

  removeEdge: (edgeId) => {
    const { nodes, edges, past, selectedEdgeIds } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({
      edges: edges.filter((e) => e.id !== edgeId),
      selectedEdgeIds: selectedEdgeIds.filter((id) => id !== edgeId),
      past: newPast,
      future: [],
    });
  },

  updateNode: (nodeId, updates) => {
    const { nodes, edges, past } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({
      nodes: nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
      past: newPast,
      future: [],
    });
  },

  updateEdge: (edgeId, updates) => {
    const { nodes, edges, past } = get();
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );
    set({
      edges: edges.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
      past: newPast,
      future: [],
    });
  },

  setSelectedNodes: (nodeIds, zoomTo = false) => {
    // Selection changes don't affect history
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        selected: nodeIds.includes(n.id),
      })),
      selectedNodeIds: nodeIds,
      shouldZoomToSelection: zoomTo,
    });
  },

  setSelectedEdges: (edgeIds, zoomTo = false) => {
    // Selection changes don't affect history
    set({
      edges: get().edges.map((e) => ({
        ...e,
        selected: edgeIds.includes(e.id),
      })),
      selectedEdgeIds: edgeIds,
      shouldZoomToSelection: zoomTo,
    });
  },

  clearZoomFlag: () => {
    set({ shouldZoomToSelection: false });
  },

  clearCanvas: () => {
    const { nodes, edges, past } = get();
    // Only save to history if there's something to clear
    if (nodes.length > 0 || edges.length > 0) {
      const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
        -MAX_HISTORY_SIZE
      );
      set({
        nodes: [],
        edges: [],
        selectedNodeIds: [],
        selectedEdgeIds: [],
        past: newPast,
        future: [],
      });
    }
  },

  undo: () => {
    const { nodes, edges, past, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [cloneSnapshot(nodes, edges), ...future].slice(
      0,
      MAX_HISTORY_SIZE
    );

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: newFuture,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  redo: () => {
    const { nodes, edges, past, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );

    set({
      nodes: next.nodes,
      edges: next.edges,
      past: newPast,
      future: newFuture,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,

  loadDiagram: (nodes, edges, mode, style) => {
    set({
      nodes,
      edges,
      mode,
      style: style ?? "engineering",
      selectedNodeIds: [],
      selectedEdgeIds: [],
      pinnedNodeIds: new Set<string>(),
      past: [],
      future: [],
    });
  },

  organizeLayout: (direction = "TB", pinnedNodeIds) => {
    const {
      nodes,
      edges,
      past,
      pinnedNodeIds: storePinnedIds,
      reactFlowInstance,
    } = get();
    if (nodes.length === 0) return;

    // Save to history before organizing
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );

    // Use provided pinnedNodeIds or fall back to store's pinned nodes
    const effectivePinnedIds = pinnedNodeIds ?? storePinnedIds;

    // Apply auto-layout respecting pinned nodes
    const layoutedNodes = getLayoutedNodes(
      nodes,
      edges,
      { direction },
      effectivePinnedIds
    );

    set({
      nodes: layoutedNodes,
      past: newPast,
      future: [],
    });

    // Fit view to show all nodes after organizing
    if (reactFlowInstance) {
      // Use setTimeout to ensure React Flow has updated the DOM
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.15,
          duration: 300,
        });
      }, 100);
    }
  },

  zoomToNode: (nodeId) => {
    const { reactFlowInstance, nodes } = get();
    if (!reactFlowInstance) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Get node dimensions (default to 100x100 if not set)
    const nodeWidth = node.measured?.width ?? 100;
    const nodeHeight = node.measured?.height ?? 100;

    // Calculate center of the node
    const x = node.position.x + nodeWidth / 2;
    const y = node.position.y + nodeHeight / 2;

    // Zoom to the node with some padding (zoom level 1.5)
    reactFlowInstance.setCenter(x, y, { zoom: 1.5, duration: 500 });
  },

  updateEdgeHandles: () => {
    const { nodes, edges, mode } = get();
    if (mode !== "bfd" && mode !== "pfd") return;
    if (edges.length === 0) return;

    const updatedEdges = recalculateEdgeHandles(edges);
    set({ edges: updatedEdges });
  },

  clearPinnedNodes: () => {
    set({ pinnedNodeIds: new Set<string>() });
  },

  insertNodeOnEdge: (edgeId, position, nodeConfig) => {
    const { nodes, edges, past } = get();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return null;

    // Save to history before making changes
    const newPast = [...past, cloneSnapshot(nodes, edges)].slice(
      -MAX_HISTORY_SIZE
    );

    // Center the node around the click position
    // Default inline component size is ~42x42 for DEXPI symbols
    const NODE_SIZE = 42;
    const centeredPosition: XYPosition = {
      x: position.x - NODE_SIZE / 2,
      y: position.y - NODE_SIZE / 2,
    };

    // Create new inline node
    const newNodeId = `inline_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: nodeConfig.type || "valves",
      position: centeredPosition,
      data: nodeConfig.data || {},
      selected: true, // Auto-select for immediate editing
    };

    // Create two new edges to replace the original
    // No arrow markers - P&ID convention for inline segments
    const timestamp = Date.now();
    const edge1: Edge = {
      id: `edge_${timestamp}_1`,
      source: edge.source,
      target: newNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: "left", // Inline components use left/right handles (W/E in DEXPI)
      type: edge.type,
      markerEnd: undefined, // No arrow
    };

    const edge2: Edge = {
      id: `edge_${timestamp}_2`,
      source: newNodeId,
      target: edge.target,
      sourceHandle: "right",
      targetHandle: edge.targetHandle,
      type: edge.type,
      markerEnd: undefined, // No arrow
    };

    // Atomic operation: remove old edge, add node + 2 new edges
    set({
      nodes: [
        ...nodes.map((n) => ({ ...n, selected: false })), // Deselect other nodes
        newNode,
      ],
      edges: [...edges.filter((e) => e.id !== edgeId), edge1, edge2],
      selectedNodeIds: [newNodeId],
      selectedEdgeIds: [],
      past: newPast,
      future: [],
    });

    return newNodeId;
  },
}));
