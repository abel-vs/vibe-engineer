"use client";

import { cn } from "@/lib/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export type NozzleNodeData = {
  label: string;
  direction?: "inlet" | "outlet";
  nominalDiameter?: string;
};

export type NozzleNode = Node<NozzleNodeData>;

/**
 * Nozzle Node Component
 * Renders a small nozzle indicator for equipment connection points
 * Displays the nozzle label (N1, N2, etc.) and optionally the nominal diameter
 */
export const NozzleNodeComponent = memo(function NozzleNodeComponent({
  data,
  selected,
}: NodeProps<NozzleNode>) {
  const { label, direction = "inlet", nominalDiameter } = data;

  // Determine handle position based on direction
  // Inlets typically come from left, outlets go to right
  const handlePosition = direction === "inlet" ? Position.Left : Position.Right;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-w-[24px] min-h-[24px]",
        selected && "ring-2 ring-blue-400 rounded"
      )}
    >
      {/* Nozzle stub visualization */}
      <div
        className={cn(
          "w-6 h-3 border border-black bg-white",
          direction === "inlet" ? "border-r-2" : "border-l-2"
        )}
      />

      {/* Label below the nozzle */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] font-medium text-gray-700">{label}</span>
        {nominalDiameter && (
          <span className="text-[8px] text-gray-500 ml-0.5">
            ({nominalDiameter})
          </span>
        )}
      </div>

      {/* Single connection handle */}
      <Handle
        type="source"
        position={handlePosition}
        id="default"
        className="!w-2 !h-2 !bg-black !border-0 !rounded-none"
      />
    </div>
  );
});

export const nozzleNodeTypes = {
  nozzle: NozzleNodeComponent,
};
