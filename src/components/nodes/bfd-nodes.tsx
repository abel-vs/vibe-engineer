"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { cn } from "@/lib/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { EngineeringNodeComponent } from "./engineering-node";

type BFDNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

type BFDNode = Node<BFDNodeData>;

// Process Block - Major process unit
export const ProcessBlockNode = memo(function ProcessBlockNode(props: NodeProps<BFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="process_block" />;
  }

  return (
    <div
      className={cn(
        "px-6 py-4 rounded-lg border-2 bg-blue-50 shadow-md min-w-[140px] text-center",
        selected ? "border-blue-600 shadow-lg ring-2 ring-blue-300" : "border-blue-400"
      )}
    >
      {/* Target handles (incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <div className="font-bold text-blue-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-blue-700 mt-1">{data.description}</div>
      )}
      {/* Source handles (outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
    </div>
  );
});

// Input/Output - Rendered as simple text label for boundary streams
export const InputOutputNode = memo(function InputOutputNode(props: NodeProps<BFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="input_output" />;
  }

  // Render as simple text element
  return (
    <div className="relative">
      {/* Target handles (incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
      <div
        className={cn(
          "px-2 py-1 text-center",
          selected ? "bg-blue-50 rounded" : ""
        )}
      >
        <div className="font-medium text-gray-700 text-sm whitespace-nowrap">{data.label}</div>
      </div>
      {/* Source handles (outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
    </div>
  );
});

// Storage - Tank or inventory
export const StorageNode = memo(function StorageNode(props: NodeProps<BFDNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="storage" />;
  }

  return (
    <div
      className={cn(
        "px-5 py-4 rounded-lg border-2 bg-amber-50 shadow-md min-w-[100px] text-center",
        "border-b-4",
        selected ? "border-amber-600 shadow-lg ring-2 ring-amber-300" : "border-amber-400"
      )}
    >
      {/* Target handles (incoming) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <div className="font-semibold text-amber-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-amber-700 mt-1">{data.description}</div>
      )}
      {/* Source handles (outgoing) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
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
