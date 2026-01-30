"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import type { DiagramStyle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    getSmoothStepPath,
    type Edge,
    type EdgeProps,
} from "@xyflow/react";
import { memo, useMemo } from "react";

export type StreamEdgeData = {
  label?: string;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
  streamType?: "material" | "energy" | "utility" | "signal";
};

export type StreamEdge = Edge<StreamEdgeData>;

// Calculate Y offset for edges to prevent overlapping when multiple edges share a source or target
function calculateEdgeOffset(
  edgeId: string,
  sourceId: string,
  targetId: string,
  allEdges: Edge[]
): { sourceOffset: number; targetOffset: number } {
  const offsetStep = 15;

  // Find all edges from the same source
  const sourceEdges = allEdges.filter((e) => e.source === sourceId);
  const sourceIndex = sourceEdges.findIndex((e) => e.id === edgeId);
  const sourceOffset =
    sourceEdges.length > 1
      ? (sourceIndex - (sourceEdges.length - 1) / 2) * offsetStep
      : 0;

  // Find all edges to the same target
  const targetEdges = allEdges.filter((e) => e.target === targetId);
  const targetIndex = targetEdges.findIndex((e) => e.id === edgeId);
  const targetOffset =
    targetEdges.length > 1
      ? (targetIndex - (targetEdges.length - 1) / 2) * offsetStep
      : 0;

  return { sourceOffset, targetOffset };
}

const getEdgeStyle = (streamType?: string, selected?: boolean, diagramStyle?: DiagramStyle) => {
  const baseStyle = {
    strokeWidth: selected ? 3 : 2,
  };

  // Engineering style: all black, differentiate by dash pattern
  if (diagramStyle === "engineering") {
    const engineeringBase = {
      ...baseStyle,
      stroke: selected ? "#1f2937" : "#000000",
    };

    switch (streamType) {
      case "energy":
        return {
          ...engineeringBase,
          strokeDasharray: "8,4",
        };
      case "utility":
        return {
          ...engineeringBase,
          strokeDasharray: "2,2",
        };
      case "signal":
        return {
          ...engineeringBase,
          strokeDasharray: "12,4,2,4",
          strokeWidth: 1.5,
        };
      case "material":
      default:
        return engineeringBase;
    }
  }

  // Colorful style: existing colored implementation
  switch (streamType) {
    case "energy":
      return {
        ...baseStyle,
        stroke: selected ? "#dc2626" : "#ef4444",
        strokeDasharray: "5,5",
      };
    case "utility":
      return {
        ...baseStyle,
        stroke: selected ? "#7c3aed" : "#8b5cf6",
        strokeDasharray: "2,2",
      };
    case "signal":
      return {
        ...baseStyle,
        stroke: selected ? "#0891b2" : "#06b6d4",
        strokeDasharray: "8,4",
        strokeWidth: 1.5,
      };
    case "material":
    default:
      return {
        ...baseStyle,
        stroke: selected ? "#1d4ed8" : "#3b82f6",
      };
  }
};

export const StreamEdgeComponent = memo(function StreamEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<StreamEdge>) {
  const diagramStyle = useDiagramStore((state) => state.style);
  const allEdges = useDiagramStore((state) => state.edges);

  // Calculate offsets to prevent overlapping edges
  const { sourceOffset, targetOffset } = useMemo(
    () => calculateEdgeOffset(id, source, target, allEdges),
    [id, source, target, allEdges]
  );

  // Apply offsets perpendicular to the edge direction
  // For horizontal edges (LR layout), offset Y; for vertical edges (TB layout), offset X
  const isHorizontal = sourcePosition === "right" || sourcePosition === "left";
  const adjustedSourceX = isHorizontal ? sourceX : sourceX + sourceOffset;
  const adjustedSourceY = isHorizontal ? sourceY + sourceOffset : sourceY;
  const adjustedTargetX = isHorizontal ? targetX : targetX + targetOffset;
  const adjustedTargetY = isHorizontal ? targetY + targetOffset : targetY;

  // Engineering style: use step path with hard corners (borderRadius: 0)
  // Colorful style: use smooth bezier curves
  const [edgePath, labelX, labelY] = diagramStyle === "engineering"
    ? getSmoothStepPath({
        sourceX: adjustedSourceX,
        sourceY: adjustedSourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY: adjustedTargetY,
        targetPosition,
        borderRadius: 0, // Hard 90-degree corners
      })
    : getBezierPath({
        sourceX: adjustedSourceX,
        sourceY: adjustedSourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY: adjustedTargetY,
        targetPosition,
      });

  const edgeStyle = getEdgeStyle(data?.streamType, selected, diagramStyle);
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "px-2 py-1 text-xs font-medium bg-white border",
              diagramStyle === "engineering"
                ? cn(
                    "rounded-none border-black",
                    selected && "border-2"
                  )
                : cn(
                    "rounded shadow-sm",
                    selected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  )
            )}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// Material Stream
export const MaterialStreamEdge = memo(function MaterialStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "material" }}
    />
  );
});

// Energy Stream
export const EnergyStreamEdge = memo(function EnergyStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "energy" }}
    />
  );
});

// Utility Stream
export const UtilityStreamEdge = memo(function UtilityStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "utility" }}
    />
  );
});

// Signal (for instrumentation)
export const SignalEdge = memo(function SignalEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "signal" }}
    />
  );
});

export const edgeTypes = {
  stream: StreamEdgeComponent,
  default: StreamEdgeComponent,
  material_stream: MaterialStreamEdge,
  energy_stream: EnergyStreamEdge,
  utility_stream: UtilityStreamEdge,
  signal: SignalEdge,
  arrow: StreamEdgeComponent,
  dashed: EnergyStreamEdge,
};
