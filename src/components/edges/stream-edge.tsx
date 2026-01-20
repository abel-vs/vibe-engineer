"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type StreamEdgeData = {
  label?: string;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
  streamType?: "material" | "energy" | "utility" | "signal";
};

export type StreamEdge = Edge<StreamEdgeData>;

const getEdgeStyle = (streamType?: string, selected?: boolean) => {
  const baseStyle = {
    strokeWidth: selected ? 3 : 2,
  };

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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style = getEdgeStyle(data?.streamType, selected);
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
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
              "px-2 py-1 rounded text-xs font-medium bg-white border shadow-sm",
              selected ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
