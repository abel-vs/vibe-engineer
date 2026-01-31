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
    ViewportPortal,
    type Edge,
    type Node,
    type ReactFlowInstance,
    type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { edgeTypes } from "@/components/edges/stream-edge";
import {
    InlineComponentSelector,
    type InlineComponentSelection,
} from "@/components/inline-component-selector";
import { allNodeTypes } from "@/components/nodes";
import { useCodeView } from "@/contexts/code-view-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { canExportToDexpi } from "@/lib/dexpi";
import { MODES } from "@/lib/modes";
import { STYLES } from "@/lib/styles";
import { useReactFlow } from "@xyflow/react";
import { Braces, FileCode } from "lucide-react";

interface DiagramCanvasProps {
  onNodeSelect?: (nodeIds: string[]) => void;
  onEdgeSelect?: (edgeIds: string[]) => void;
}

export function DiagramCanvas({ onNodeSelect, onEdgeSelect }: DiagramCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const { fitView, getNodes } = useReactFlow();
  const { highlightEdge } = useCodeView();

  // State for inline component selector (edge double-click)
  const [inlineSelectorOpen, setInlineSelectorOpen] = useState(false);
  const [inlineSelectorPosition, setInlineSelectorPosition] = useState<{ x: number; y: number } | undefined>();
  const [selectedEdgeForInline, setSelectedEdgeForInline] = useState<string | null>(null);
  const [inlineInsertPosition, setInlineInsertPosition] = useState<XYPosition | null>(null);

  // State for edge hover preview (PFD mode)
  const [edgeHoverPosition, setEdgeHoverPosition] = useState<XYPosition | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // State for edge context menu (right-click)
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    edge: Edge;
    x: number;
    y: number;
  } | null>(null);

  const {
    nodes,
    edges,
    mode,
    style,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    insertNodeOnEdge,
    selectedNodeIds,
    selectedEdgeIds,
    shouldZoomToSelection,
    clearZoomFlag,
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
      
      // Draw.io P&ID specific data
      const drawioCategory = event.dataTransfer.getData("application/reactflow/drawioCategory");
      const drawioShapeName = event.dataTransfer.getData("application/reactflow/drawioShapeName");
      const drawioShapeData = event.dataTransfer.getData("application/reactflow/drawioShape");

      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return;
      }

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // Build node data, including DEXPI-specific or Draw.io fields if present
      const nodeData: Record<string, unknown> = {};

      // For Draw.io P&ID nodes
      if (drawioCategory && drawioShapeName) {
        nodeData.category = drawioCategory;
        nodeData.shapeName = drawioShapeName;
        // Parse shape data if provided (for connection points)
        if (drawioShapeData) {
          try {
            nodeData.shape = JSON.parse(drawioShapeData);
          } catch {
            // Ignore parse errors
          }
        }
        // Label is intentionally not set - show nothing by default
      }
      // For DEXPI nodes, don't set a default label - show nothing unless user provides one
      else if (dexpiCategory) {
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

  // Zoom to selected nodes/edges only when triggered programmatically (e.g., voice commands)
  useEffect(() => {
    if (!reactFlowInstance.current || !shouldZoomToSelection) return;

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
        // Clear the zoom flag after zooming
        clearZoomFlag();
      }, 100);
    } else {
      // Clear the flag even if no nodes to zoom
      clearZoomFlag();
    }
  }, [selectedNodeIds, selectedEdgeIds, shouldZoomToSelection, nodes, edges, clearZoomFlag]);

  // Cmd+A (Mac) / Ctrl+A (Windows) to select all nodes and fit view
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+A (Mac) or Ctrl+A (Windows)
      if ((event.metaKey || event.ctrlKey) && event.key === "a") {
        // Only handle if focus is on the canvas, not on input fields
        const activeElement = document.activeElement;
        const isInputFocused = 
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement?.getAttribute("contenteditable") === "true";
        
        if (isInputFocused) return;
        
        event.preventDefault();
        
        // Get all current nodes
        const allNodes = getNodes();
        if (allNodes.length === 0) return;
        
        // Select all nodes
        const allNodeIds = allNodes.map((n) => n.id);
        useDiagramStore.getState().setSelectedNodes(allNodeIds, false);
        
        // Fit view to show all nodes
        fitView({
          padding: 0.1,
          duration: 300,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fitView, getNodes]);

  // Double-click handler to zoom to a node
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!reactFlowInstance.current) return;
      
      reactFlowInstance.current.fitView({
        nodes: [node],
        padding: 0.2,
        duration: 300,
      });
    },
    []
  );

  // Helper function to find closest point on an edge's SVG path
  const getClosestPointOnEdge = useCallback((edgeId: string, mousePosition: XYPosition): XYPosition | null => {
    // Find the edge's SVG path element
    const pathElement = document.querySelector(`[data-testid="rf__edge-${edgeId}"] path`) as SVGPathElement | null;
    if (!pathElement) return null;

    const pathLength = pathElement.getTotalLength();
    if (pathLength === 0) return null;

    // Sample points along the path to find the closest one
    const numSamples = Math.max(50, Math.ceil(pathLength / 5)); // At least 50 samples, or 1 per 5px
    let closestPoint: XYPosition | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i <= numSamples; i++) {
      const length = (i / numSamples) * pathLength;
      const point = pathElement.getPointAtLength(length);
      const distance = Math.hypot(point.x - mousePosition.x, point.y - mousePosition.y);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = { x: point.x, y: point.y };
      }
    }

    return closestPoint;
  }, []);

  // Edge hover handlers for preview dot (PFD mode only)
  const onEdgeMouseEnter = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (mode !== "pfd" || inlineSelectorOpen) return;
      setHoveredEdgeId(edge.id);
    },
    [mode, inlineSelectorOpen]
  );

  const onEdgeMouseMove = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (mode !== "pfd" || inlineSelectorOpen) return;
      if (!reactFlowInstance.current) return;

      // Convert screen position to flow position
      const flowPosition = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to the edge path
      const snappedPosition = getClosestPointOnEdge(edge.id, flowPosition);
      setEdgeHoverPosition(snappedPosition || flowPosition);
    },
    [mode, inlineSelectorOpen, getClosestPointOnEdge]
  );

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
    setEdgeHoverPosition(null);
  }, []);

  // Edge context menu (right-click)
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Prevent the native context menu from showing
      event.preventDefault();
      
      setEdgeContextMenu({
        edge,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Close edge context menu
  const closeEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(null);
  }, []);

  // Double-click handler to insert inline component on edge (PFD mode only)
  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Only enable in PFD mode where DEXPI symbols are available
      if (mode !== "pfd") return;
      if (!reactFlowInstance.current) return;

      // Use the snapped hover position if available, otherwise calculate from click
      let flowPosition: XYPosition;
      if (edgeHoverPosition && hoveredEdgeId === edge.id) {
        flowPosition = edgeHoverPosition;
      } else {
        flowPosition = reactFlowInstance.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        // Try to snap to edge
        const snapped = getClosestPointOnEdge(edge.id, flowPosition);
        if (snapped) flowPosition = snapped;
      }

      // Store the edge and flow position for insertion
      setSelectedEdgeForInline(edge.id);
      setInlineInsertPosition(flowPosition);

      // Clear hover state
      setHoveredEdgeId(null);
      setEdgeHoverPosition(null);

      // Store screen position for the popover (fixed UI element)
      const screenPos = reactFlowInstance.current.flowToScreenPosition(flowPosition);
      setInlineSelectorPosition({
        x: screenPos.x,
        y: screenPos.y,
      });
      setInlineSelectorOpen(true);
    },
    [mode, edgeHoverPosition, hoveredEdgeId, getClosestPointOnEdge]
  );

  // Compute screen position for popover on-demand (for when viewport changes)
  const getPopoverScreenPosition = useCallback(() => {
    if (!inlineInsertPosition || !reactFlowInstance.current) {
      return inlineSelectorPosition;
    }
    // flowToScreenPosition returns raw screen coordinates
    const screenPos = reactFlowInstance.current.flowToScreenPosition(inlineInsertPosition);
    return {
      x: screenPos.x,
      y: screenPos.y,
    };
  }, [inlineInsertPosition, inlineSelectorPosition]);

  // Handle inline component selection
  const handleInlineComponentSelect = useCallback(
    (selection: InlineComponentSelection) => {
      if (!selectedEdgeForInline || !inlineInsertPosition) return;

      // Insert the node on the edge
      insertNodeOnEdge(selectedEdgeForInline, inlineInsertPosition, {
        type: selection.nodeType,
        data: {
          dexpiCategory: selection.category,
          symbolIndex: selection.symbolIndex,
          dexpiSubclass: selection.dexpiSubclass,
        },
      });

      // Reset state
      setSelectedEdgeForInline(null);
      setInlineInsertPosition(null);
      setInlineSelectorOpen(false);
    },
    [selectedEdgeForInline, inlineInsertPosition, insertNodeOnEdge]
  );

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
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={allNodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid={mode === "bfd"}
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

        {/* Preview dot when hovering over edges (PFD mode) - snaps to edge */}
        {!inlineSelectorOpen && edgeHoverPosition && hoveredEdgeId && (
          <ViewportPortal>
            <div
              className="pointer-events-none"
              style={{
                position: "absolute",
                transform: `translate(${edgeHoverPosition.x}px, ${edgeHoverPosition.y}px) translate(-50%, -50%)`,
              }}
            >
              {/* Preview dot - black, 50% opacity */}
              <div className="w-3 h-3 rounded-full bg-black/50" />
            </div>
          </ViewportPortal>
        )}

        {/* Pulsating indicator dot for inline component insertion - rendered in viewport coordinates */}
        {inlineSelectorOpen && inlineInsertPosition && (
          <ViewportPortal>
            <div
              className="pointer-events-none"
              style={{
                position: "absolute",
                transform: `translate(${inlineInsertPosition.x}px, ${inlineInsertPosition.y}px) translate(-50%, -50%)`,
              }}
            >
              <div className="relative flex items-center justify-center">
                {/* Outer pulsating ring */}
                <div className="absolute w-6 h-6 rounded-full bg-red-500/30 animate-ping" />
                {/* Inner solid dot */}
                <div className="w-3 h-3 rounded-full bg-red-500/70 shadow-lg shadow-red-500/50" />
              </div>
            </div>
          </ViewportPortal>
        )}
      </ReactFlow>

      {/* Inline component selector for edge double-click */}
      <InlineComponentSelector
        open={inlineSelectorOpen}
        onOpenChange={(open) => {
          setInlineSelectorOpen(open);
          if (!open) {
            // Reset state when closing
            setSelectedEdgeForInline(null);
            setInlineInsertPosition(null);
            setInlineSelectorPosition(undefined);
          }
        }}
        onSelect={handleInlineComponentSelect}
        position={getPopoverScreenPosition()}
      />

      {/* Edge context menu (right-click) */}
      {edgeContextMenu && (
        <EdgeContextMenuPopup
          edge={edgeContextMenu.edge}
          x={edgeContextMenu.x}
          y={edgeContextMenu.y}
          onClose={closeEdgeContextMenu}
          mode={mode}
          onHighlightEdge={highlightEdge}
        />
      )}
    </div>
  );
}

// Edge context menu popup component
interface EdgeContextMenuPopupProps {
  edge: Edge;
  x: number;
  y: number;
  onClose: () => void;
  mode: string;
  onHighlightEdge: (edgeId: string, format: "json" | "dexpi") => void;
}

function EdgeContextMenuPopup({ edge, x, y, onClose, mode, onHighlightEdge }: EdgeContextMenuPopupProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isDexpiAvailable = canExportToDexpi(mode as Parameters<typeof canExportToDexpi>[0]);
  
  // Get edge label for display
  const edgeLabel = (edge.data?.label as string) || (edge.label as string) || edge.id;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose();
      }
    };

    // Close on escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Calculate adjusted position to keep menu in viewport
  // Menu is approximately 200px wide and ~80px tall
  const menuWidth = 200;
  const menuHeight = 80;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      <div className="px-2 py-1.5 text-xs text-muted-foreground truncate font-semibold">
        {edgeLabel}
      </div>
      <div className="h-px bg-border my-1" />
      <button
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
        onClick={() => {
          onHighlightEdge(edge.id, "json");
          onClose();
        }}
      >
        <Braces className="w-4 h-4" />
        View in JSON
      </button>
      <button
        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isDexpiAvailable}
        onClick={() => {
          if (isDexpiAvailable) {
            onHighlightEdge(edge.id, "dexpi");
            onClose();
          }
        }}
      >
        <FileCode className="w-4 h-4" />
        View in DEXPI XML
        {!isDexpiAvailable && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            P&ID only
          </span>
        )}
      </button>
    </div>
  );
}
