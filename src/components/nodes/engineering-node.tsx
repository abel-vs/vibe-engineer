"use client";

import { STYLES } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, useEdges, type Node, type NodeProps } from "@xyflow/react";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";

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

// Snap a value up to the nearest grid multiple
function snapToGrid(value: number, gridSize: number): number {
  return Math.ceil(value / gridSize) * gridSize;
}

export const EngineeringNodeComponent = memo(function EngineeringNodeComponent(
  props: EngineeringNodeComponentProps
) {
  const { id, data, selected, originalType } = props;
  const properties = data?.properties ?? {};
  const hasProperties = Object.keys(properties).length > 0;
  const edges = useEdges();
  const styleConfig = STYLES.engineering;
  const gridGap = styleConfig.canvas.gridGap;
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [snappedWidth, setSnappedWidth] = useState<number | undefined>(undefined);
  const [snappedHeight, setSnappedHeight] = useState<number | undefined>(undefined);

  // Measure content and snap dimensions to grid
  useLayoutEffect(() => {
    if (contentRef.current) {
      const { offsetWidth, offsetHeight } = contentRef.current;
      // Add border width (2px on each side = 4px total)
      const totalWidth = offsetWidth + 4;
      const totalHeight = offsetHeight + 4;
      setSnappedWidth(snapToGrid(totalWidth, gridGap));
      setSnappedHeight(snapToGrid(totalHeight, gridGap));
    }
  }, [data, gridGap, hasProperties]);

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

  // Support resizing from props
  const propsWidth = (props as EngineeringNodeComponentProps & { width?: number }).width;
  const propsHeight = (props as EngineeringNodeComponentProps & { height?: number }).height;

  return (
    <div
      className={cn(
        "engineering-node bg-white border-2 border-black shadow-none text-center min-w-[80px] min-h-[40px]",
        selected && "border-blue-500 ring-2 ring-blue-200"
      )}
      style={{
        width: propsWidth ?? (snappedWidth ? `${snappedWidth}px` : 'auto'),
        height: propsHeight ?? (snappedHeight ? `${snappedHeight}px` : 'auto'),
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

      {/* Content - wrapped for measurement */}
      <div 
        ref={contentRef}
        className="px-3 py-2 flex flex-col justify-center h-full"
      >
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
