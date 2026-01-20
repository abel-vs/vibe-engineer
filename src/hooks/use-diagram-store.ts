import { create } from "zustand";
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { DiagramMode } from "@/lib/modes";

export interface DiagramState {
  // Diagram data
  nodes: Node[];
  edges: Edge[];
  mode: DiagramMode;

  // Selection state
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // React Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Actions
  setMode: (mode: DiagramMode) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addEdgeAction: (edge: Edge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  clearCanvas: () => void;

  // Load/save
  loadDiagram: (nodes: Node[], edges: Edge[], mode: DiagramMode) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  mode: "playground",
  selectedNodeIds: [],
  selectedEdgeIds: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });

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
    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
      type: "stream",
    };
    set({ edges: addEdge(newEdge, get().edges) });
  },

  setMode: (mode) => set({ mode }),

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  addEdgeAction: (edge) => {
    set({ edges: [...get().edges, edge] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
    });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeIds: get().selectedEdgeIds.filter((id) => id !== edgeId),
    });
  },

  updateNode: (nodeId, updates) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
    });
  },

  updateEdge: (edgeId, updates) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, ...updates } : e
      ),
    });
  },

  setSelectedNodes: (nodeIds) => {
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        selected: nodeIds.includes(n.id),
      })),
      selectedNodeIds: nodeIds,
    });
  },

  setSelectedEdges: (edgeIds) => {
    set({
      edges: get().edges.map((e) => ({
        ...e,
        selected: edgeIds.includes(e.id),
      })),
      selectedEdgeIds: edgeIds,
    });
  },

  clearCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },

  loadDiagram: (nodes, edges, mode) => {
    set({
      nodes,
      edges,
      mode,
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  },
}));
