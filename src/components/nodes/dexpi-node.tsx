"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    getCategoryDisplayName,
    getSymbol,
    getSymbolPath,
    nodeTypeToCategory,
} from "@/lib/dexpi-config";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, useEdges, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useState } from "react";

export type DexpiNodeData = {
  label?: string;
  description?: string;
  properties?: Record<string, string>;
  // DEXPI-specific fields
  dexpiCategory?: string;
  symbolIndex?: number;
  dexpiSubclass?: string;
};

export type DexpiNode = Node<DexpiNodeData>;

interface DexpiNodeComponentProps extends NodeProps<DexpiNode> {
  nodeType?: string;
}

// SVG size for the node
const SVG_SIZE = 64;

export const DexpiNodeComponent = memo(function DexpiNodeComponent(
  props: DexpiNodeComponentProps
) {
  const { id, data, selected, type } = props;
  const edges = useEdges();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);

  // Determine the category from node type or data
  const category = data?.dexpiCategory || nodeTypeToCategory(type || "") || "";
  const symbolIndex = data?.symbolIndex ?? 0;
  const symbolPath = getSymbolPath(category, symbolIndex);
  const symbol = getSymbol(category, symbolIndex);

  // Only show user-provided label, not category or symbol description
  const displayLabel = data?.label || null;
  
  // Tooltip info - category and subtype
  const categoryDisplayName = getCategoryDisplayName(category);
  const subtypeName = symbol?.description || "";

  // Fetch SVG content for inline rendering
  useEffect(() => {
    if (!symbolPath) {
      setSvgError(true);
      return;
    }

    fetch(symbolPath)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load SVG");
        return res.text();
      })
      .then((text) => {
        // Clean up the SVG for inline rendering
        // Remove XML declaration and extract just the SVG element
        const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
        if (svgMatch) {
          setSvgContent(svgMatch[0]);
          setSvgError(false);
        } else {
          setSvgError(true);
        }
      })
      .catch(() => {
        setSvgError(true);
      });
  }, [symbolPath]);

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

  // Get properties to display
  const properties = data?.properties ?? {};
  const hasProperties = Object.keys(properties).length > 0;

  // Support resizing
  const nodeWidth = (props as NodeProps<DexpiNode> & { width?: number }).width;
  const nodeHeight = (props as NodeProps<DexpiNode> & { height?: number }).height;
  const displaySize = nodeWidth || nodeHeight || SVG_SIZE;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="dexpi-node relative flex flex-col items-center">
        <NodeResizer
          minWidth={48}
          minHeight={48}
          keepAspectRatio
          isVisible={selected}
          lineClassName="!border-gray-700"
          handleClassName="!w-2 !h-2 !bg-gray-700 !border-white"
        />
        {/* SVG Container with handles attached to edges */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative flex items-center justify-center",
                selected && "ring-2 ring-blue-400 ring-offset-1 rounded"
              )}
              style={{ width: displaySize, height: displaySize }}
            >
              {/* Handles positioned at the edges of the SVG */}
              <Handle
                type="source"
                position={Position.Top}
                id="top"
                className={cn(
                  "!w-2 !h-2 !bg-gray-700 !border-0 !rounded-full !-top-1",
                  connectedHandles.has("top") && "connected-handle"
                )}
                style={{ left: "50%" }}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className={cn(
                  "!w-2 !h-2 !bg-gray-700 !border-0 !rounded-full !-bottom-1",
                  connectedHandles.has("bottom") && "connected-handle"
                )}
                style={{ left: "50%" }}
              />
              <Handle
                type="source"
                position={Position.Left}
                id="left"
                className={cn(
                  "!w-2 !h-2 !bg-gray-700 !border-0 !rounded-full !-left-1",
                  connectedHandles.has("left") && "connected-handle"
                )}
                style={{ top: "50%" }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id="right"
                className={cn(
                  "!w-2 !h-2 !bg-gray-700 !border-0 !rounded-full !-right-1",
                  connectedHandles.has("right") && "connected-handle"
                )}
                style={{ top: "50%" }}
              />

              {/* SVG Symbol */}
              {svgContent && !svgError ? (
                <div
                  className="dexpi-symbol w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : svgError ? (
                <div className="w-10 h-10 bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-400 rounded">
                  ?
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-50 animate-pulse rounded" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="font-medium">{categoryDisplayName}</div>
            {subtypeName && <div className="text-gray-500">{subtypeName}</div>}
          </TooltipContent>
        </Tooltip>

        {/* Label - only shown if provided, positioned below the node */}
        {displayLabel && (
          <div className="text-center mt-1 max-w-[100px]">
            <div className="font-medium text-gray-900 text-xs leading-tight truncate">
              {displayLabel}
            </div>
          </div>
        )}

        {/* Description if provided */}
        {data?.description && (
          <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[100px] text-center">
            {data.description}
          </div>
        )}

        {/* Properties - shown below label if any */}
        {hasProperties && (
          <div className="mt-1 text-center">
            {Object.entries(properties).map(([key, value]) => (
              <div key={key} className="text-[9px] text-gray-600">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

// Factory function to create node types for each DEXPI category
export function createDexpiNodeType(categoryName: string) {
  return memo(function DexpiCategoryNode(props: NodeProps<DexpiNode>) {
    return (
      <DexpiNodeComponent
        {...props}
        data={{
          ...props.data,
          dexpiCategory: props.data?.dexpiCategory || categoryName,
        }}
      />
    );
  });
}
