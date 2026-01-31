"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { EditableLabel } from "./editable-label";
import { EngineeringNodeComponent } from "./engineering-node";

type BFDNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

type BFDNode = Node<BFDNodeData>;

// Process Block - Major process unit
export const ProcessBlockNode = memo(function ProcessBlockNode(props: NodeProps<BFDNode>) {
  const { id, data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="process_block" />;
  }

  return (
    <div
      className={cn(
        "px-6 py-4 rounded-lg border-2 bg-blue-50 shadow-md min-w-[140px] min-h-[50px] text-center",
        selected ? "border-blue-600 shadow-lg ring-2 ring-blue-300" : "border-blue-400"
      )}
    >
      <NodeResizer
        minWidth={140}
        minHeight={50}
        isVisible={selected}
        lineClassName="!border-blue-600"
        handleClassName="!w-2 !h-2 !bg-blue-600 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white"
      />
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
      <div className="font-bold text-blue-900 flex items-center justify-center flex-col">
        <EditableLabel
          nodeId={id}
          value={data.label}
          className="font-bold text-blue-900"
          placeholder="Process Block"
        />
        {data.description && (
          <div className="text-xs text-blue-700 mt-1">{data.description}</div>
        )}
      </div>
    </div>
  );
});

// Input/Output - Rendered as simple text label for boundary streams
export const InputOutputNode = memo(function InputOutputNode(props: NodeProps<BFDNode>) {
  const { id, data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="input_output" />;
  }

  // Render as simple text element
  return (
    <div className="relative min-w-[60px] min-h-[24px]">
      <NodeResizer
        minWidth={60}
        minHeight={24}
        isVisible={selected}
        lineClassName="!border-gray-400"
        handleClassName="!w-2 !h-2 !bg-gray-400 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-gray-400 !border !border-white !opacity-50"
      />
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
      <div
        className={cn(
          "px-2 py-1 text-center flex items-center justify-center",
          selected ? "bg-blue-50 rounded" : ""
        )}
      >
        <EditableLabel
          nodeId={id}
          value={data.label}
          className="font-medium text-gray-700 text-sm"
          placeholder="Label"
        />
      </div>
    </div>
  );
});

// Storage - Tank or inventory
export const StorageNode = memo(function StorageNode(props: NodeProps<BFDNode>) {
  const { id, data, selected } = props;
  const style = useDiagramStore((state) => state.style);

  if (style === "engineering") {
    return <EngineeringNodeComponent {...props} originalType="storage" />;
  }

  return (
    <div
      className={cn(
        "px-5 py-4 rounded-lg border-2 bg-amber-50 shadow-md min-w-[100px] min-h-[50px] text-center",
        "border-b-4",
        selected ? "border-amber-600 shadow-lg ring-2 ring-amber-300" : "border-amber-400"
      )}
    >
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineClassName="!border-amber-600"
        handleClassName="!w-2 !h-2 !bg-amber-600 !border-white"
      />
      {/* Handles - all type="source" for bidirectional connections with ConnectionMode.Loose */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
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
      <div className="font-semibold text-amber-900 flex items-center justify-center flex-col">
        <EditableLabel
          nodeId={id}
          value={data.label}
          className="font-semibold text-amber-900"
          placeholder="Storage"
        />
        {data.description && (
          <div className="text-xs text-amber-700 mt-1">{data.description}</div>
        )}
      </div>
    </div>
  );
});

export const bfdNodeTypes = {
  process_block: ProcessBlockNode,
  input_output: InputOutputNode,
  storage: StorageNode,
};
