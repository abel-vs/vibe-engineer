"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { cn } from "@/lib/utils";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

type PlaygroundNodeData = {
  label: string;
  description?: string;
  properties?: Record<string, string>;
};

type PlaygroundNode = Node<PlaygroundNodeData>;

// Rectangle Node
export const RectangleNode = memo(function RectangleNode(props: NodeProps<PlaygroundNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);
  const isEngineering = style === "engineering";

  return (
    <div
      className={cn(
        "px-6 py-4 bg-white min-w-[100px] min-h-[40px] text-center",
        isEngineering
          ? cn("border-2 border-black", selected && "border-blue-500 ring-2 ring-blue-200")
          : cn("rounded-lg border-2 shadow-md", selected ? "border-blue-500 shadow-lg ring-2 ring-blue-200" : "border-gray-400")
      )}
    >
      <NodeResizer
        minWidth={100}
        minHeight={40}
        isVisible={selected}
        lineClassName="!border-blue-500"
        handleClassName="!w-2 !h-2 !bg-blue-500 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-blue-500 !border-2 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-blue-500 !border-2 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-blue-500 !border-2 !border-white"}
      />
      <div className={cn("font-medium flex items-center justify-center", isEngineering ? "text-black" : "text-gray-800")}>{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-blue-500 !border-2 !border-white"}
      />
    </div>
  );
});

// Circle Node
export const CircleNode = memo(function CircleNode(props: NodeProps<PlaygroundNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);
  const isEngineering = style === "engineering";

  return (
    <div
      className={cn(
        "w-20 h-20 rounded-full border-2 bg-white flex items-center justify-center",
        isEngineering
          ? cn("border-black", selected && "border-blue-500 ring-2 ring-blue-200")
          : cn("shadow-md", selected ? "border-green-500 shadow-lg ring-2 ring-green-200" : "border-gray-400")
      )}
    >
      <NodeResizer
        minWidth={60}
        minHeight={60}
        keepAspectRatio
        isVisible={selected}
        lineClassName={isEngineering ? "!border-blue-500" : "!border-green-500"}
        handleClassName={isEngineering ? "!w-2 !h-2 !bg-blue-500 !border-white" : "!w-2 !h-2 !bg-green-500 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-green-500 !border-2 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-green-500 !border-2 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-green-500 !border-2 !border-white"}
      />
      <div className={cn("font-medium text-sm text-center px-1", isEngineering ? "text-black" : "text-gray-800")}>
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none" : "!w-3 !h-3 !bg-green-500 !border-2 !border-white"}
      />
    </div>
  );
});

// Diamond Node
export const DiamondNode = memo(function DiamondNode(props: NodeProps<PlaygroundNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);
  const isEngineering = style === "engineering";

  return (
    <div className="relative w-24 h-24">
      <NodeResizer
        minWidth={60}
        minHeight={60}
        keepAspectRatio
        isVisible={selected}
        lineClassName={isEngineering ? "!border-blue-500" : "!border-orange-500"}
        handleClassName={isEngineering ? "!w-2 !h-2 !bg-blue-500 !border-white" : "!w-2 !h-2 !bg-orange-500 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !left-0 !top-1/2" : "!w-3 !h-3 !bg-orange-500 !border-2 !border-white !left-0 !top-1/2"}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !top-0 !left-1/2" : "!w-3 !h-3 !bg-orange-500 !border-2 !border-white !top-0 !left-1/2"}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !bottom-0 !left-1/2" : "!w-3 !h-3 !bg-orange-500 !border-2 !border-white !bottom-0 !left-1/2"}
      />
      <div
        className={cn(
          "absolute inset-2 rotate-45 border-2 bg-white",
          isEngineering
            ? cn("border-black", selected && "border-blue-500 ring-2 ring-blue-200")
            : cn("shadow-md", selected ? "border-orange-500 shadow-lg ring-2 ring-orange-200" : "border-gray-400")
        )}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-medium text-sm text-center", isEngineering ? "text-black" : "text-gray-800")}>
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !right-0 !top-1/2" : "!w-3 !h-3 !bg-orange-500 !border-2 !border-white !right-0 !top-1/2"}
      />
    </div>
  );
});

// Triangle Node
export const TriangleNode = memo(function TriangleNode(props: NodeProps<PlaygroundNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);
  const isEngineering = style === "engineering";

  return (
    <div className="relative w-24 h-20">
      <NodeResizer
        minWidth={60}
        minHeight={50}
        isVisible={selected}
        lineClassName={isEngineering ? "!border-blue-500" : "!border-purple-500"}
        handleClassName={isEngineering ? "!w-2 !h-2 !bg-blue-500 !border-white" : "!w-2 !h-2 !bg-purple-500 !border-white"}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !top-1/2" : "!w-3 !h-3 !bg-purple-500 !border-2 !border-white !top-1/2"}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !top-0 !left-1/2" : "!w-3 !h-3 !bg-purple-500 !border-2 !border-white !top-0 !left-1/2"}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !bottom-0 !left-1/2" : "!w-3 !h-3 !bg-purple-500 !border-2 !border-white !bottom-0 !left-1/2"}
      />
      <svg viewBox="0 0 100 87" className="w-full h-full">
        <polygon
          points="50,0 100,87 0,87"
          className={cn(
            "fill-white stroke-2",
            isEngineering
              ? cn(selected ? "stroke-blue-500" : "stroke-black")
              : cn(selected ? "stroke-purple-500" : "stroke-gray-400")
          )}
          strokeWidth="3"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <span className={cn("font-medium text-sm", isEngineering ? "text-black" : "text-gray-800")}>{data.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={isEngineering ? "!w-1.5 !h-1.5 !bg-black !border-0 !rounded-none !top-1/2" : "!w-3 !h-3 !bg-purple-500 !border-2 !border-white !top-1/2"}
      />
    </div>
  );
});

// Text Node
export const TextNode = memo(function TextNode(props: NodeProps<PlaygroundNode>) {
  const { data, selected } = props;
  const style = useDiagramStore((state) => state.style);
  const isEngineering = style === "engineering";

  return (
    <div
      className={cn(
        "px-3 py-2 bg-transparent min-w-[50px] min-h-[24px]",
        selected && "outline outline-2 outline-blue-500 outline-dashed rounded"
      )}
    >
      <NodeResizer
        minWidth={50}
        minHeight={24}
        isVisible={selected}
        lineClassName="!border-blue-500"
        handleClassName="!w-2 !h-2 !bg-blue-500 !border-white"
      />
      <div className={cn("font-medium flex items-center", isEngineering ? "text-black" : "text-gray-800")}>{data.label}</div>
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
