"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useDiagramStore } from "@/hooks/use-diagram-store";
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
        "px-5 py-4 rounded-md border-2 bg-blue-100 shadow-md min-w-[100px] text-center",
        selected ? "border-blue-700 shadow-lg ring-2 ring-blue-300" : "border-blue-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <div className="font-bold text-blue-900 text-sm">{data.label}</div>
      {data.description && (
        <div className="text-xs text-blue-700">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-blue-700 !border-2 !border-white"
      />
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
        "px-4 py-5 rounded-xl border-2 bg-cyan-100 shadow-md min-w-[80px] text-center",
        "border-b-4",
        selected ? "border-cyan-700 shadow-lg ring-2 ring-cyan-300" : "border-cyan-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <div className="font-bold text-cyan-900 text-sm">{data.label}</div>
      {data.description && (
        <div className="text-xs text-cyan-700">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
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
        "px-4 py-8 rounded-xl border-2 bg-cyan-50 shadow-md min-w-[70px] text-center",
        selected ? "border-cyan-700 shadow-lg ring-2 ring-cyan-300" : "border-cyan-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <div className="font-bold text-cyan-900 text-sm">{data.label}</div>
      {data.description && (
        <div className="text-xs text-cyan-700">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-cyan-700 !border-2 !border-white"
      />
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
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
      <div className="font-bold text-green-900 text-xs text-center">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-700 !border-2 !border-white"
      />
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
        "px-4 py-3 bg-yellow-100 shadow-md min-w-[80px] text-center border-2",
        "clip-path-[polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]",
        selected ? "border-yellow-700 shadow-lg ring-2 ring-yellow-300" : "border-yellow-500"
      )}
      style={{
        clipPath: "polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
      <div className="font-bold text-yellow-900 text-xs">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-yellow-700 !border-2 !border-white"
      />
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
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !left-0 !top-1/2"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !top-0 !left-1/2"
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
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !right-0 !top-1/2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-orange-700 !border-2 !border-white !bottom-0 !left-1/2"
      />
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
        "px-3 py-10 rounded-t-full rounded-b-lg border-2 bg-teal-100 shadow-md min-w-[60px] text-center",
        selected ? "border-teal-700 shadow-lg ring-2 ring-teal-300" : "border-teal-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <div className="font-bold text-teal-900 text-xs">{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-teal-700 !border-2 !border-white"
      />
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
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
      <div className="font-bold text-gray-900 text-[10px] -rotate-45">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-gray-700 !border-2 !border-white !-rotate-45"
      />
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
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
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
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
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
      <Handle
        type="target"
        position={Position.Left}
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
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-purple-700 !border-2 !border-white"
      />
    </div>
  );
});

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
