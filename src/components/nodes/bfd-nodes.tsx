"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

type BFDNodeData = {
  label: string;
  description?: string;
};

type BFDNode = Node<BFDNodeData>;

// Process Block - Major process unit
export const ProcessBlockNode = memo(function ProcessBlockNode({
  data,
  selected,
}: NodeProps<BFDNode>) {
  return (
    <div
      className={cn(
        "px-6 py-4 rounded-lg border-2 bg-blue-50 shadow-md min-w-[140px] text-center",
        selected ? "border-blue-600 shadow-lg ring-2 ring-blue-300" : "border-blue-400"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <div className="font-bold text-blue-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-blue-700 mt-1">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
    </div>
  );
});

// Input/Output - Feed or product terminal
export const InputOutputNode = memo(function InputOutputNode({
  data,
  selected,
}: NodeProps<BFDNode>) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-600 !border-2 !border-white"
      />
      <div
        className={cn(
          "px-6 py-3 bg-green-50 shadow-md min-w-[100px] text-center",
          "rounded-l-full rounded-r-full border-2",
          selected ? "border-green-600 shadow-lg ring-2 ring-green-300" : "border-green-400"
        )}
      >
        <div className="font-semibold text-green-900">{data.label}</div>
        {data.description && (
          <div className="text-xs text-green-700">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-600 !border-2 !border-white"
      />
    </div>
  );
});

// Storage - Tank or inventory
export const StorageNode = memo(function StorageNode({
  data,
  selected,
}: NodeProps<BFDNode>) {
  return (
    <div
      className={cn(
        "px-5 py-4 rounded-lg border-2 bg-amber-50 shadow-md min-w-[100px] text-center",
        "border-b-4",
        selected ? "border-amber-600 shadow-lg ring-2 ring-amber-300" : "border-amber-400"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <div className="font-semibold text-amber-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-amber-700 mt-1">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
    </div>
  );
});

export const bfdNodeTypes = {
  process_block: ProcessBlockNode,
  input_output: InputOutputNode,
  storage: StorageNode,
};
