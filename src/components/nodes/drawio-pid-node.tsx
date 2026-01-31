"use client";

import { getDrawioCategorySize } from "@/lib/dexpi-config";
import {
    ConnectionPoint,
    DrawioShape,
    getConnectionPoints,
    getPositionHint,
    getSvgPath,
} from "@/lib/drawio-pid-config";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, useEdges, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { EditableLabel } from "./editable-label";
import { NodeContextMenu } from "./node-context-menu";

// Node data type
export type DrawioPidNodeData = {
  category: string;
  shapeName: string;
  shape?: DrawioShape;
  label?: string;
  description?: string;
  properties?: Record<string, string>;
};

export type DrawioPidNode = Node<DrawioPidNodeData>;

// Map position hint to React Flow Position enum
const positionMap: Record<string, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

export const DrawioPidNodeComponent = memo(function DrawioPidNodeComponent(
  props: NodeProps<DrawioPidNode>
) {
  const { id, data, selected } = props;
  const { category, shapeName, shape, label } = data;
  const edges = useEdges();
  
  // Get category-specific default size (valves smaller, vessels larger, etc.)
  const defaultSize = getDrawioCategorySize(category);

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);

  // Get SVG path
  const svgPath = getSvgPath(category, shapeName);

  // Fetch SVG content for inline rendering
  useEffect(() => {
    if (!svgPath) {
      setSvgError(true);
      return;
    }

    fetch(svgPath)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load SVG");
        return res.text();
      })
      .then((text) => {
        // Clean up SVG: hide connection-points group
        // Add class to hide connection points markers
        let cleanedSvg = text;
        
        // Hide the connection-points group by setting display:none
        cleanedSvg = cleanedSvg.replace(
          /<g class="connection-points"[^>]*>/g,
          '<g class="connection-points" style="display:none">'
        );

        // Remove fixed width/height from root SVG to allow scaling
        cleanedSvg = cleanedSvg.replace(
          /<svg([^>]*)\s+width="[^"]*"([^>]*)>/,
          '<svg$1$2 style="width:100%;height:100%">'
        );
        cleanedSvg = cleanedSvg.replace(
          /<svg([^>]*)\s+height="[^"]*"([^>]*)>/,
          '<svg$1$2>'
        );

        setSvgContent(cleanedSvg);
        setSvgError(false);
      })
      .catch(() => {
        setSvgError(true);
      });
  }, [svgPath]);

  // Get connection points from shape data
  const connectionPoints: ConnectionPoint[] = shape
    ? getConnectionPoints(shape)
    : [];

  // Determine which handles are connected
  const connectedHandles = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source === id && edge.sourceHandle) {
      connectedHandles.add(edge.sourceHandle);
    }
    if (edge.target === id && edge.targetHandle) {
      connectedHandles.add(edge.targetHandle);
    }
  });

  // Get node dimensions (support resizing), falling back to category-specific defaults
  const nodeWidth =
    (props as NodeProps<DrawioPidNode> & { width?: number }).width ||
    shape?.width ||
    defaultSize.width;
  const nodeHeight =
    (props as NodeProps<DrawioPidNode> & { height?: number }).height ||
    shape?.height ||
    defaultSize.height;

  // Get properties to display
  const properties = data?.properties ?? {};
  const hasProperties = Object.keys(properties).length > 0;
  
  // Label for context menu
  const nodeLabel = label || shapeName || category || id;

  return (
    <NodeContextMenu nodeId={id} nodeLabel={nodeLabel}>
      <div className="drawio-pid-node relative flex flex-col items-center">
        <NodeResizer
          minWidth={24}
          minHeight={24}
          isVisible={selected}
          lineClassName="!border-gray-700"
          handleClassName="!w-2 !h-2 !bg-gray-700 !border-white"
        />

        {/* SVG Container with handles */}
        <div
          className={cn(
            "relative flex items-center justify-center",
            selected && "ring-2 ring-blue-400 ring-offset-1 rounded"
          )}
          style={{ width: nodeWidth, height: nodeHeight }}
        >
          {/* SVG Symbol */}
          {svgContent && !svgError ? (
            <div
              className="drawio-symbol w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : svgError ? (
            <div className="w-full h-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-400 rounded">
              ?
            </div>
          ) : (
            <div className="w-full h-full bg-gray-50 animate-pulse rounded" />
          )}

          {/* Handles - all source type for bidirectional connections with ConnectionMode.Loose */}
          {connectionPoints.map((cp) => {
            const posHint = getPositionHint(cp);
            const isConnected = connectedHandles.has(cp.name);
            return (
              <Handle
                key={cp.name}
                id={cp.name}
                type="source"
                position={positionMap[posHint]}
                isConnectable={true}
                className={cn(
                  "!w-1.5 !h-1.5 !bg-gray-600 !border-0 !rounded-full",
                  isConnected && "connected-handle"
                )}
                style={{
                  left: `${cp.x * 100}%`,
                  top: `${cp.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            );
          })}

          {/* Fallback handles if no connection points defined - all source type for bidirectional connections */}
          {connectionPoints.length === 0 && (
            <>
              <Handle type="source" position={Position.Top} id="N" className="!w-1.5 !h-1.5 !bg-gray-600 !border-0 !rounded-full" style={{ left: "50%", top: 0, transform: "translate(-50%, -50%)" }} />
              <Handle type="source" position={Position.Bottom} id="S" className="!w-1.5 !h-1.5 !bg-gray-600 !border-0 !rounded-full" style={{ left: "50%", top: "100%", transform: "translate(-50%, -50%)" }} />
              <Handle type="source" position={Position.Left} id="W" className="!w-1.5 !h-1.5 !bg-gray-600 !border-0 !rounded-full" style={{ left: 0, top: "50%", transform: "translate(-50%, -50%)" }} />
              <Handle type="source" position={Position.Right} id="E" className="!w-1.5 !h-1.5 !bg-gray-600 !border-0 !rounded-full" style={{ left: "100%", top: "50%", transform: "translate(-50%, -50%)" }} />
            </>
          )}
        </div>

        {/* 
          NOTE: Below-node text is absolutely positioned so it does NOT affect
          React Flow's node dimension measurement (prevents size feedback loops).
        */}
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-center max-w-[160px]">
          {/* Label - below the symbol, always editable */}
          <EditableLabel
            nodeId={id}
            value={label || ""}
            className="font-medium text-gray-900 text-xs leading-tight"
            placeholder=""
          />

          {/* Description if provided */}
          {data?.description && (
            <div className="text-[10px] text-gray-500 mt-0.5 truncate">
              {data.description}
            </div>
          )}

          {/* Properties - shown below label if any */}
          {hasProperties && (
            <div className="mt-1">
              {Object.entries(properties).map(([key, value]) => (
                <div key={key} className="text-[9px] text-gray-600">
                  <span className="font-medium">{key}:</span> {value}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NodeContextMenu>
  );
});

// Factory function to create node type component for a specific category
export function createDrawioPidNodeType(categoryName: string) {
  return memo(function DrawioCategoryNode(props: NodeProps<DrawioPidNode>) {
    return (
      <DrawioPidNodeComponent
        {...props}
        data={{
          ...props.data,
          category: props.data?.category || categoryName,
        }}
      />
    );
  });
}

export default DrawioPidNodeComponent;
