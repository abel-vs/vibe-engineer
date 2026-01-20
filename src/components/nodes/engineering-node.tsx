"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useEdges, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

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

export const EngineeringNodeComponent = memo(function EngineeringNodeComponent({
  id,
  data,
  selected,
  originalType,
}: EngineeringNodeComponentProps) {
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

  return (
    <div
      className={cn(
        "engineering-node bg-white border-2 border-black shadow-none min-w-[120px] text-center",
        selected && "border-blue-500 ring-2 ring-blue-200"
      )}
    >
      {/* Render handles for each position - using type="source" with ConnectionMode.Loose 
          allows bidirectional connections */}
      {HANDLE_POSITIONS.map(({ position, id: handleId }) => (
        <Handle
          key={handleId}
          type="source"
          position={position}
          id={handleId}
          className={cn(
            "engineering-handle !w-2.5 !h-2.5 !bg-black !border-0 !rounded-none",
            connectedHandles.has(handleId) && "connected-handle"
          )}
        />
      ))}

      {/* Content */}
      <div className="px-3 py-2">
        {/* Label - Bold */}
        <div className="font-bold text-black text-sm">
          {data?.label || originalType?.toUpperCase() || "NODE"}
        </div>

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
