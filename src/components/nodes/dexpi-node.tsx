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
import { EditableLabel } from "./editable-label";

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

// Default SVG size for the node
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

  // Fetch and process SVG for proper scaling
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
        // Extract the SVG element
        const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
        if (svgMatch) {
          let svg = svgMatch[0];
          
          // Extract original dimensions from inline style
          const styleMatch = svg.match(/style="[^"]*width:\s*(\d+)px[^"]*height:\s*(\d+)px[^"]*"/i);
          let width = 42;
          let height = 42;
          if (styleMatch) {
            width = parseInt(styleMatch[1], 10) || 42;
            height = parseInt(styleMatch[2], 10) || 42;
          }
          
          // Remove the inline style attribute entirely
          svg = svg.replace(/\s*style="[^"]*"/i, '');
          
          // Add viewBox if not present, and set width/height to 100%
          if (!svg.includes('viewBox')) {
            svg = svg.replace(
              /<svg/,
              `<svg viewBox="0 0 ${width} ${height}"`
            );
          }
          
          // Add width="100%" height="100%" and preserveAspectRatio
          svg = svg.replace(
            /<svg([^>]*)>/,
            '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet">'
          );
          
          setSvgContent(svg);
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

  // Support resizing - get dimensions from node props
  const nodeWidth = (props as NodeProps<DexpiNode> & { width?: number }).width;
  const nodeHeight = (props as NodeProps<DexpiNode> & { height?: number }).height;
  const displayWidth = nodeWidth || SVG_SIZE;
  const displayHeight = nodeHeight || SVG_SIZE;

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
              style={{ width: displayWidth, height: displayHeight }}
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

              {/* SVG Symbol - inline for proper scaling */}
              {svgContent && !svgError ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : svgError ? (
                <div className="w-full h-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-400 rounded">
                  ?
                </div>
              ) : (
                <div className="w-full h-full bg-gray-50 animate-pulse rounded" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="font-medium">{categoryDisplayName}</div>
            {subtypeName && <div className="text-gray-500">{subtypeName}</div>}
          </TooltipContent>
        </Tooltip>

        {/* 
          NOTE: These "below-node" details are positioned absolutely so they do NOT
          participate in React Flow's node dimension measurement. Otherwise, feeding
          measured height back into the symbol size (via props.height) can cause an
          infinite growth loop.
        */}
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-center max-w-[140px]">
          {/* Label - always available for editing */}
          <EditableLabel
            nodeId={id}
            value={displayLabel || ""}
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
