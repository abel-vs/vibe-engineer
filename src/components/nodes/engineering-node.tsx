"use client";

import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, useEdges, type Node, type NodeProps } from "@xyflow/react";
import { memo, useMemo } from "react";
import { EditableLabel } from "./editable-label";

export type EngineeringNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

export type EngineeringNode = Node<EngineeringNodeData>;

interface EngineeringNodeComponentProps extends NodeProps<EngineeringNode> {
  originalType?: string;
}

// Handle positions with unique IDs for bidirectional connections
const HANDLE_POSITIONS = [
  { position: Position.Top, id: "top" },
  { position: Position.Bottom, id: "bottom" },
  { position: Position.Left, id: "left" },
  { position: Position.Right, id: "right" },
] as const;

export const EngineeringNodeComponent = memo(function EngineeringNodeComponent(
  props: EngineeringNodeComponentProps
) {
  const { id, data, selected, originalType } = props;
  const properties = data?.properties ?? {};
  const hasProperties = Object.keys(properties).length > 0;
  const edges = useEdges();

  // Determine which handles are connected (check both source and target for each handle)
  const connectedHandles = useMemo(() => {
    const connected = new Set<string>();
    
    edges.forEach((edge) => {
      // Check source connections
      if (edge.source === id && edge.sourceHandle) {
        connected.add(edge.sourceHandle);
      }
      // Check target connections  
      if (edge.target === id && edge.targetHandle) {
        connected.add(edge.targetHandle);
      }
    });
    
    return connected;
  }, [edges, id]);

  // Support resizing from props (set by NodeResizer)
  const propsWidth = (props as EngineeringNodeComponentProps & { width?: number }).width;
  const propsHeight = (props as EngineeringNodeComponentProps & { height?: number }).height;

  return (
    <div
      className={cn(
        "engineering-node bg-white border-2 border-black shadow-none text-center min-w-[80px] min-h-[40px]",
        selected && "border-blue-500 ring-2 ring-blue-200"
      )}
      style={{
        // Only apply explicit dimensions if set by NodeResizer, otherwise let content determine size
        ...(propsWidth ? { width: propsWidth } : {}),
        ...(propsHeight ? { height: propsHeight } : {}),
      }}
    >
      <NodeResizer
        minWidth={80}
        minHeight={40}
        isVisible={selected}
        lineClassName="!border-blue-500"
        handleClassName="!w-2 !h-2 !bg-blue-500 !border-white"
      />
      {/* Render handles for each position - using type="source" with ConnectionMode.Loose 
          allows bidirectional connections */}
      {HANDLE_POSITIONS.map(({ position, id: handleId }) => (
        <Handle
          key={handleId}
          type="source"
          position={position}
          id={handleId}
          className={cn(
            "engineering-handle !w-1.5 !h-1.5 !bg-black !border-0 !rounded-none",
            connectedHandles.has(handleId) && "connected-handle"
          )}
        />
      ))}

      {/* Content */}
      <div className="px-3 py-2 flex flex-col justify-center">
        {/* Label - Bold, editable on double-click */}
        <EditableLabel
          nodeId={id}
          value={data?.label || originalType?.toUpperCase() || "NODE"}
          className="font-bold text-black text-sm"
          placeholder={originalType?.toUpperCase() || "NODE"}
        />

        {/* Description - Italic */}
        {data?.description && (
          <div className="text-xs text-gray-600 italic mt-0.5">
            {data.description}
          </div>
        )}

        {/* Properties - Key: Value pairs */}
        {hasProperties && (
          <div className="mt-2 pt-2 border-t border-gray-300 text-left">
            {Object.entries(properties).map(([key, value]) => (
              <div key={key} className="text-xs text-black">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
