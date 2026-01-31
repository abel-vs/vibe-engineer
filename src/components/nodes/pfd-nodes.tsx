"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { SIMPLIFIED_PFD_EQUIPMENT, getSimplifiedPfdSymbolPath } from "@/lib/dexpi-config";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, useEdges, type Node, type NodeProps } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { EngineeringNodeComponent } from "./engineering-node";

type PFDNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

type PFDNode = Node<PFDNodeData>;

// Reactor - Blue rectangle
export const ReactorNode = memo(function ReactorNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="reactor" />;
  }

  return (
    <div
      className={cn(
        "px-5 py-4 rounded-md border-2 bg-blue-100 shadow-md min-w-[100px] min-h-[50px] text-center",
        selected ? "border-blue-700 shadow-lg ring-2 ring-blue-300" : "border-blue-500"
      )}
    >
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineClassName="!border-blue-700"
        handleClassName="!w-2 !h-2 !bg-blue-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <div className="font-bold text-blue-900 text-sm flex items-center justify-center flex-col">
        {data.label}
        {data.description && (
          <div className="text-xs text-blue-700">{data.description}</div>
        )}
      </div>
    </div>
  );
});

// Tank/Vessel - Rounded cyan rectangle
export const TankNode = memo(function TankNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="tank" />;
  }

  return (
    <div
      className={cn(
        "px-4 py-5 rounded-xl border-2 bg-cyan-100 shadow-md min-w-[80px] min-h-[60px] text-center",
        "border-b-4",
        selected ? "border-cyan-700 shadow-lg ring-2 ring-cyan-300" : "border-cyan-500"
      )}
    >
      <NodeResizer
        minWidth={80}
        minHeight={60}
        isVisible={selected}
        lineClassName="!border-cyan-700"
        handleClassName="!w-2 !h-2 !bg-cyan-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <div className="font-bold text-cyan-900 text-sm flex items-center justify-center flex-col">
        {data.label}
        {data.description && (
          <div className="text-xs text-cyan-700">{data.description}</div>
        )}
      </div>
    </div>
  );
});

// Vessel - Similar to tank but taller
export const VesselNode = memo(function VesselNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="vessel" />;
  }

  return (
    <div
      className={cn(
        "px-4 py-8 rounded-xl border-2 bg-cyan-50 shadow-md min-w-[70px] min-h-[80px] text-center",
        selected ? "border-cyan-700 shadow-lg ring-2 ring-cyan-300" : "border-cyan-500"
      )}
    >
      <NodeResizer
        minWidth={70}
        minHeight={80}
        isVisible={selected}
        lineClassName="!border-cyan-700"
        handleClassName="!w-2 !h-2 !bg-cyan-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <div className="font-bold text-cyan-900 text-sm flex items-center justify-center flex-col">
        {data.label}
        {data.description && (
          <div className="text-xs text-cyan-700">{data.description}</div>
        )}
      </div>
    </div>
  );
});

// Pump - Green circle
export const PumpNode = memo(function PumpNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="pump" />;
  }

  return (
    <div
      className={cn(
        "w-16 h-16 rounded-full border-2 bg-green-100 shadow-md flex items-center justify-center",
        selected ? "border-green-700 shadow-lg ring-2 ring-green-300" : "border-green-500"
      )}
    >
      <NodeResizer
        minWidth={48}
        minHeight={48}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-green-700"
        handleClassName="!w-2 !h-2 !bg-green-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
      <div className="font-bold text-green-900 text-xs text-center">
        {data.label}
      </div>
    </div>
  );
});

// Compressor - Yellow pentagon-like shape
export const CompressorNode = memo(function CompressorNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="compressor" />;
  }

  return (
    <div
      className={cn(
        "px-4 py-3 bg-yellow-100 shadow-md min-w-[80px] min-h-[50px] text-center border-2",
        selected ? "border-yellow-700 shadow-lg ring-2 ring-yellow-300" : "border-yellow-500"
      )}
      style={{
        clipPath: "polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)",
      }}
    >
      <NodeResizer
        minWidth={80}
        minHeight={50}
        isVisible={selected}
        lineClassName="!border-yellow-700"
        handleClassName="!w-2 !h-2 !bg-yellow-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
      <div className="font-bold text-yellow-900 text-xs flex items-center justify-center">{data.label}</div>
    </div>
  );
});

// Heat Exchanger - Orange diamond
export const HeatExchangerNode = memo(function HeatExchangerNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="heat_exchanger" />;
  }

  return (
    <div className="relative w-20 h-20">
      <NodeResizer
        minWidth={60}
        minHeight={60}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-orange-700"
        handleClassName="!w-2 !h-2 !bg-orange-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !left-0 !top-1/2"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !top-0 !left-1/2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !right-0 !top-1/2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !bottom-0 !left-1/2"
      />
      <div
        className={cn(
          "absolute inset-2 rotate-45 border-2 bg-orange-100 shadow-md",
          selected ? "border-orange-700 ring-2 ring-orange-300" : "border-orange-500"
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-orange-900 text-xs text-center">
          {data.label}
        </span>
      </div>
    </div>
  );
});

// Column - Tall teal rectangle
export const ColumnNode = memo(function ColumnNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="column" />;
  }

  return (
    <div
      className={cn(
        "px-3 py-10 rounded-t-full rounded-b-lg border-2 bg-teal-100 shadow-md min-w-[60px] min-h-[100px] text-center",
        selected ? "border-teal-700 shadow-lg ring-2 ring-teal-300" : "border-teal-500"
      )}
    >
      <NodeResizer
        minWidth={60}
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-teal-700"
        handleClassName="!w-2 !h-2 !bg-teal-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <div className="font-bold text-teal-900 text-xs flex items-center justify-center">{data.label}</div>
    </div>
  );
});

// Valve - Small gray square
export const ValveNode = memo(function ValveNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="valve" />;
  }

  return (
    <div
      className={cn(
        "w-10 h-10 border-2 bg-gray-200 shadow-md flex items-center justify-center",
        "transform rotate-45",
        selected ? "border-gray-700 shadow-lg ring-2 ring-gray-300" : "border-gray-500"
      )}
    >
      <NodeResizer
        minWidth={30}
        minHeight={30}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-gray-700"
        handleClassName="!w-2 !h-2 !bg-gray-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
      <div className="font-bold text-gray-900 text-[10px] -rotate-45">
        {data.label}
      </div>
    </div>
  );
});

// Mixer - Purple triangle pointing right
export const MixerNode = memo(function MixerNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="mixer" />;
  }

  return (
    <div className="relative w-16 h-16">
      <NodeResizer
        minWidth={48}
        minHeight={48}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-purple-700"
        handleClassName="!w-2 !h-2 !bg-purple-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon
          points="0,0 100,50 0,100"
          className={cn(
            "fill-purple-100 stroke-2",
            selected ? "stroke-purple-700" : "stroke-purple-500"
          )}
          strokeWidth="4"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pr-2">
        <span className="font-bold text-purple-900 text-[10px]">{data.label}</span>
      </div>
    </div>
  );
});

// Splitter - Purple triangle pointing left (inverted mixer)
export const SplitterNode = memo(function SplitterNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="splitter" />;
  }

  return (
    <div className="relative w-16 h-16">
      <NodeResizer
        minWidth={48}
        minHeight={48}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-purple-700"
        handleClassName="!w-2 !h-2 !bg-purple-700 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon
          points="100,0 0,50 100,100"
          className={cn(
            "fill-purple-100 stroke-2",
            selected ? "stroke-purple-700" : "stroke-purple-500"
          )}
          strokeWidth="4"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pl-2">
        <span className="font-bold text-purple-900 text-[10px]">{data.label}</span>
      </div>
    </div>
  );
});

// ========================================
// SIMPLIFIED PFD NODES (Generic Equipment with DEXPI SVGs)
// ========================================
// These use DEXPI SVGs - one representative symbol per equipment category

// Reusable component for simplified PFD nodes using DEXPI SVGs
interface SimplifiedPfdNodeProps extends NodeProps<PFDNode> {
  nodeType: string;
}

const SimplifiedPfdNodeComponent = memo(function SimplifiedPfdNodeComponent({
  nodeType,
  ...props
}: SimplifiedPfdNodeProps) {
  const { id, data, selected } = props;
  const edges = useEdges();
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);

  const symbolPath = getSimplifiedPfdSymbolPath(nodeType);

  // Get equipment info for tooltip
  const equipment = SIMPLIFIED_PFD_EQUIPMENT.find((eq) => eq.nodeType === nodeType);
  const categoryDisplayName = equipment?.label || nodeType;

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

  // Support resizing - get dimensions from node props
  const nodeWidth = (props as SimplifiedPfdNodeProps & { width?: number }).width;
  const nodeHeight = (props as SimplifiedPfdNodeProps & { height?: number }).height;
  const displayWidth = nodeWidth || 64;
  const displayHeight = nodeHeight || 64;

  // Get properties to display
  const properties = data?.properties ?? {};
  const hasProperties = Object.keys(properties).length > 0;

  // Only show user-provided label, not category or symbol description
  const displayLabel = data?.label || null;

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
            {equipment?.description && <div className="text-gray-500">{equipment.description}</div>}
          </TooltipContent>
        </Tooltip>

        {/* Label and properties below the node */}
        {(displayLabel || data?.description || hasProperties) && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-center max-w-[140px]">
            {/* Label - only shown if provided */}
            {displayLabel && (
              <div className="font-medium text-gray-900 text-xs leading-tight truncate">
                {displayLabel}
              </div>
            )}

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
        )}
      </div>
    </TooltipProvider>
  );
});

// Factory function to create simplified PFD node components
function createSimplifiedPfdNode(nodeType: string) {
  const Component = memo(function PfdNode(props: NodeProps<PFDNode>) {
    return <SimplifiedPfdNodeComponent {...props} nodeType={nodeType} />;
  });
  Component.displayName = `Pfd${nodeType.replace("pfd_", "").charAt(0).toUpperCase() + nodeType.slice(5)}Node`;
  return Component;
}

// Create all simplified PFD node components
export const PfdVesselNode = createSimplifiedPfdNode("pfd_vessel");
export const PfdPumpNode = createSimplifiedPfdNode("pfd_pump");
export const PfdCompressorNode = createSimplifiedPfdNode("pfd_compressor");
export const PfdExchangerNode = createSimplifiedPfdNode("pfd_exchanger");
export const PfdSeparatorNode = createSimplifiedPfdNode("pfd_separator");
export const PfdMixerNode = createSimplifiedPfdNode("pfd_mixer");
export const PfdFilterNode = createSimplifiedPfdNode("pfd_filter");
export const PfdAgitatorNode = createSimplifiedPfdNode("pfd_agitator");

// PFD Text label (doesn't use DEXPI SVG)
export const PfdTextNode = memo(function PfdTextNode(props: NodeProps<PFDNode>) {
  const { data, selected } = props;

  return (
    <div
      className={cn(
        "px-2 py-1 text-center",
        selected && "ring-2 ring-blue-300 rounded"
      )}
    >
      <Handle type="source" position={Position.Left} id="left" className="!w-2 !h-2 !bg-gray-400 !opacity-50" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-gray-400 !opacity-50" />
      <div className="font-medium text-gray-700 text-sm whitespace-nowrap">
        {data.label || "Label"}
      </div>
    </div>
  );
});

// Legacy PFD node types (for backward compatibility)
export const pfdNodeTypes = {
  reactor: ReactorNode,
  tank: TankNode,
  vessel: VesselNode,
  pump: PumpNode,
  compressor: CompressorNode,
  heat_exchanger: HeatExchangerNode,
  column: ColumnNode,
  valve: ValveNode,
  mixer: MixerNode,
  splitter: SplitterNode,
};

// Simplified PFD node types for new PFD mode (using DEXPI SVGs)
export const pfdSimplifiedNodeTypes = {
  pfd_vessel: PfdVesselNode,
  pfd_pump: PfdPumpNode,
  pfd_compressor: PfdCompressorNode,
  pfd_exchanger: PfdExchangerNode,
  pfd_separator: PfdSeparatorNode,
  pfd_mixer: PfdMixerNode,
  pfd_filter: PfdFilterNode,
  pfd_agitator: PfdAgitatorNode,
  pfd_text: PfdTextNode,
};
