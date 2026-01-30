"use client";

import {
    Background,
    BackgroundVariant,
    ConnectionMode,
    Controls,
    MarkerType,
    MiniMap,
    Panel,
    ReactFlow,
    SelectionMode,
    type Edge,
    type Node,
    type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { edgeTypes } from "@/components/edges/stream-edge";
import { allNodeTypes } from "@/components/nodes";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { MODES } from "@/lib/modes";
import { STYLES } from "@/lib/styles";

interface DiagramCanvasProps {
  onNodeSelect?: (nodeIds: string[]) => void;
  onEdgeSelect?: (edgeIds: string[]) => void;
}

export function DiagramCanvas({ onNodeSelect, onEdgeSelect }: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const {
    nodes,
    edges,
    mode,
    style,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectedNodeIds,
    selectedEdgeIds,
    setReactFlowInstance,
  } = useDiagramStore();

  const modeConfig = MODES[mode];
  const styleConfig = STYLES[style];

  // Default edge options with arrow marker - style aware
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "stream",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: styleConfig.edge.stroke,
      },
    }),
    [styleConfig.edge.stroke]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    setReactFlowInstance(instance);
  }, [setReactFlowInstance]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type");
      const label = event.dataTransfer.getData("application/reactflow/label");
      const dexpiCategory = event.dataTransfer.getData("application/reactflow/dexpiCategory");
      const symbolIndexStr = event.dataTransfer.getData("application/reactflow/symbolIndex");
      const dexpiSubclass = event.dataTransfer.getData("application/reactflow/dexpiSubclass");

      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return;
      }

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // Build node data, including DEXPI-specific fields if present
      const nodeData: Record<string, unknown> = {};

      // For DEXPI nodes, don't set a default label - show nothing unless user provides one
      if (dexpiCategory) {
        nodeData.dexpiCategory = dexpiCategory;
        // Use provided symbol index or default to 0
        nodeData.symbolIndex = symbolIndexStr ? parseInt(symbolIndexStr, 10) : 0;
        // Include subclass if provided
        if (dexpiSubclass) {
          nodeData.dexpiSubclass = dexpiSubclass;
        }
        // Label is intentionally not set - will show nothing by default
      } else {
        // For non-DEXPI nodes, use the provided label or default
        nodeData.label = label || type.toUpperCase();
      }

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      addNode(newNode);
    },
    [addNode]
  );

  // Notify parent of selection changes
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      const nodeIds = selectedNodes.map((n) => n.id);
      const edgeIds = selectedEdges.map((e) => e.id);
      onNodeSelect?.(nodeIds);
      onEdgeSelect?.(edgeIds);
    },
    [onNodeSelect, onEdgeSelect]
  );

  // Zoom to selected nodes/edges when they're highlighted
  useEffect(() => {
    if (!reactFlowInstance.current) return;

    const nodesToZoom: Node[] = [];

    // Add selected nodes
    if (selectedNodeIds.length > 0) {
      const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));
      nodesToZoom.push(...selectedNodes);
    }

    // If edges are selected, add their connected nodes
    if (selectedEdgeIds.length > 0) {
      const selectedEdges = edges.filter((edge) => selectedEdgeIds.includes(edge.id));
      const connectedNodeIds = new Set<string>();
      selectedEdges.forEach((edge) => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });
      const connectedNodes = nodes.filter((node) => connectedNodeIds.has(node.id));
      nodesToZoom.push(...connectedNodes);
    }

    // Remove duplicates
    const uniqueNodes = Array.from(new Map(nodesToZoom.map((node) => [node.id, node])).values());

    if (uniqueNodes.length > 0) {
      // Use setTimeout to ensure React Flow has updated the DOM
      setTimeout(() => {
        reactFlowInstance.current?.fitView({
          nodes: uniqueNodes,
          padding: 0.2,
          duration: 300,
        });
      }, 100);
    }
  }, [selectedNodeIds, selectedEdgeIds, nodes, edges]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={handleSelectionChange}
        nodeTypes={allNodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[styleConfig.canvas.gridGap, styleConfig.canvas.gridGap]}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        panOnScroll
        selectionMode={SelectionMode.Partial}
        connectionMode={ConnectionMode.Loose}
        style={{ backgroundColor: styleConfig.canvas.background }}
      >
        <Background 
          color={styleConfig.canvas.gridColor} 
          gap={styleConfig.canvas.gridGap} 
          variant={styleConfig.canvas.backgroundVariant as BackgroundVariant}
        />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            // In engineering style, all nodes are black/gray
            if (style === "engineering") {
              return "#000000";
            }
            // Colorful style: type-specific colors
            switch (node.type) {
              case "reactor":
                return "#3b82f6";
              case "tank":
              case "vessel":
                return "#06b6d4";
              case "pump":
                return "#22c55e";
              case "heat_exchanger":
                return "#f97316";
              case "column":
                return "#14b8a6";
              case "process_block":
                return "#3b82f6";
              case "storage":
                return "#f59e0b";
              default:
                return "#6b7280";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white/80 !border !border-gray-200 !rounded-lg"
        />
        <Panel position="top-left" className="!m-2">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex gap-3">
            <div>
              <span className="text-xs text-gray-500">Mode:</span>{" "}
              <span className="text-sm font-medium text-gray-800">
                {modeConfig.name}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Style:</span>{" "}
              <span className="text-sm font-medium text-gray-800">
                {styleConfig.name}
              </span>
            </div>
          </div>
        </Panel>
        <Panel position="top-right" className="!m-2">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-xs text-gray-600">
            {nodes.length} nodes · {edges.length} edges
            {selectedNodeIds.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({selectedNodeIds.length} selected)
              </span>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
