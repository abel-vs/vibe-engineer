"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type BaseNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

export type BaseNode = Node<BaseNodeData>;

interface BaseNodeProps extends NodeProps<BaseNode> {
  className?: string;
  children?: React.ReactNode;
  color?: string;
  showHandles?: boolean;
}

export const BaseNodeComponent = memo(function BaseNodeComponent({
  data,
  selected,
  className,
  children,
  showHandles = true,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg border-2 bg-white shadow-md transition-all min-w-[120px]",
        selected ? "border-blue-500 shadow-lg ring-2 ring-blue-200" : "border-gray-300",
        className
      )}
    >
      {showHandles && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top"
            className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
          />
        </>
      )}

      {children || (
        <div className="text-center">
          <div className="font-semibold text-sm text-gray-800">{data.label}</div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-1">{data.description}</div>
          )}
        </div>
      )}
    </div>
  );
});
