"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

type PlaygroundNodeData = {
  label: string;
};

type PlaygroundNode = Node<PlaygroundNodeData>;

// Rectangle Node
export const RectangleNode = memo(function RectangleNode({
  data,
  selected,
}: NodeProps<PlaygroundNode>) {
  return (
    <div
      className={cn(
        "px-6 py-4 rounded-lg border-2 bg-white shadow-md min-w-[100px] text-center",
        selected ? "border-blue-500 shadow-lg ring-2 ring-blue-200" : "border-gray-400"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
      <div className="font-medium text-gray-800">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
});

// Circle Node
export const CircleNode = memo(function CircleNode({
  data,
  selected,
}: NodeProps<PlaygroundNode>) {
  return (
    <div
      className={cn(
        "w-20 h-20 rounded-full border-2 bg-white shadow-md flex items-center justify-center",
        selected ? "border-green-500 shadow-lg ring-2 ring-green-200" : "border-gray-400"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
      <div className="font-medium text-gray-800 text-sm text-center px-1">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
});

// Diamond Node
export const DiamondNode = memo(function DiamondNode({
  data,
  selected,
}: NodeProps<PlaygroundNode>) {
  return (
    <div className="relative w-24 h-24">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white !left-0 !top-1/2"
      />
      <div
        className={cn(
          "absolute inset-2 rotate-45 border-2 bg-white shadow-md",
          selected ? "border-orange-500 shadow-lg ring-2 ring-orange-200" : "border-gray-400"
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-medium text-gray-800 text-sm text-center">
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white !right-0 !top-1/2"
      />
    </div>
  );
});

// Triangle Node
export const TriangleNode = memo(function TriangleNode({
  data,
  selected,
}: NodeProps<PlaygroundNode>) {
  return (
    <div className="relative w-24 h-20">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !top-1/2"
      />
      <svg viewBox="0 0 100 87" className="w-full h-full">
        <polygon
          points="50,0 100,87 0,87"
          className={cn(
            "fill-white stroke-2",
            selected ? "stroke-purple-500" : "stroke-gray-400"
          )}
          strokeWidth="3"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <span className="font-medium text-gray-800 text-sm">{data.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !top-1/2"
      />
    </div>
  );
});

// Text Node
export const TextNode = memo(function TextNode({
  data,
  selected,
}: NodeProps<PlaygroundNode>) {
  return (
    <div
      className={cn(
        "px-3 py-2 bg-transparent",
        selected && "outline outline-2 outline-blue-500 outline-dashed rounded"
      )}
    >
      <div className="text-gray-800 font-medium">{data.label}</div>
    </div>
  );
});

export const playgroundNodeTypes = {
  rectangle: RectangleNode,
  circle: CircleNode,
  diamond: DiamondNode,
  triangle: TriangleNode,
  text: TextNode,
};
