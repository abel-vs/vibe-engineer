"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { MODES, type DiagramMode } from "@/lib/modes";

interface ShapeItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const playgroundShapes: ShapeItem[] = [
  {
    type: "rectangle",
    label: "Rectangle",
    icon: <div className="w-8 h-6 border-2 border-gray-500 bg-white rounded" />,
    color: "bg-gray-50",
  },
  {
    type: "circle",
    label: "Circle",
    icon: <div className="w-7 h-7 border-2 border-green-500 bg-white rounded-full" />,
    color: "bg-green-50",
  },
  {
    type: "diamond",
    label: "Diamond",
    icon: (
      <div className="w-6 h-6 border-2 border-orange-500 bg-white rotate-45" />
    ),
    color: "bg-orange-50",
  },
  {
    type: "triangle",
    label: "Triangle",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7">
        <polygon
          points="12,4 22,20 2,20"
          fill="white"
          stroke="rgb(168 85 247)"
          strokeWidth="2"
        />
      </svg>
    ),
    color: "bg-purple-50",
  },
  {
    type: "text",
    label: "Text",
    icon: <span className="text-sm font-bold text-gray-600">Aa</span>,
    color: "bg-gray-50",
  },
];

const bfdShapes: ShapeItem[] = [
  {
    type: "process_block",
    label: "Process Block",
    icon: <div className="w-10 h-6 border-2 border-blue-500 bg-blue-100 rounded" />,
    color: "bg-blue-50",
  },
  {
    type: "input_output",
    label: "Input/Output",
    icon: (
      <div className="w-10 h-5 border-2 border-green-500 bg-green-100 rounded-full" />
    ),
    color: "bg-green-50",
  },
  {
    type: "storage",
    label: "Storage",
    icon: (
      <div className="w-8 h-6 border-2 border-amber-500 bg-amber-100 rounded border-b-4" />
    ),
    color: "bg-amber-50",
  },
];

const pfdShapes: ShapeItem[] = [
  {
    type: "reactor",
    label: "Reactor",
    icon: <div className="w-8 h-6 border-2 border-blue-600 bg-blue-100 rounded" />,
    color: "bg-blue-50",
  },
  {
    type: "tank",
    label: "Tank",
    icon: (
      <div className="w-7 h-7 border-2 border-cyan-600 bg-cyan-100 rounded-xl border-b-4" />
    ),
    color: "bg-cyan-50",
  },
  {
    type: "vessel",
    label: "Vessel",
    icon: (
      <div className="w-5 h-8 border-2 border-cyan-500 bg-cyan-50 rounded-xl" />
    ),
    color: "bg-cyan-50",
  },
  {
    type: "pump",
    label: "Pump",
    icon: (
      <div className="w-6 h-6 border-2 border-green-600 bg-green-100 rounded-full" />
    ),
    color: "bg-green-50",
  },
  {
    type: "compressor",
    label: "Compressor",
    icon: (
      <div
        className="w-8 h-6 border-2 border-yellow-600 bg-yellow-100"
        style={{
          clipPath:
            "polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)",
        }}
      />
    ),
    color: "bg-yellow-50",
  },
  {
    type: "heat_exchanger",
    label: "Heat Exchanger",
    icon: (
      <div className="w-6 h-6 border-2 border-orange-600 bg-orange-100 rotate-45" />
    ),
    color: "bg-orange-50",
  },
  {
    type: "column",
    label: "Column",
    icon: (
      <div className="w-4 h-8 border-2 border-teal-600 bg-teal-100 rounded-t-full rounded-b" />
    ),
    color: "bg-teal-50",
  },
  {
    type: "valve",
    label: "Valve",
    icon: <div className="w-4 h-4 border-2 border-gray-600 bg-gray-200 rotate-45" />,
    color: "bg-gray-50",
  },
  {
    type: "mixer",
    label: "Mixer",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <polygon
          points="0,0 24,12 0,24"
          fill="rgb(243 232 255)"
          stroke="rgb(126 34 206)"
          strokeWidth="2"
        />
      </svg>
    ),
    color: "bg-purple-50",
  },
  {
    type: "splitter",
    label: "Splitter",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <polygon
          points="24,0 0,12 24,24"
          fill="rgb(243 232 255)"
          stroke="rgb(126 34 206)"
          strokeWidth="2"
        />
      </svg>
    ),
    color: "bg-purple-50",
  },
];

const shapesByMode: Record<DiagramMode, ShapeItem[]> = {
  playground: playgroundShapes,
  bfd: bfdShapes,
  pfd: pfdShapes,
};

interface DraggableShapeProps {
  item: ShapeItem;
}

const DraggableShape = memo(function DraggableShape({ item }: DraggableShapeProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.type, item.label)}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg cursor-grab active:cursor-grabbing",
        "border border-transparent hover:border-gray-300 hover:bg-gray-50",
        "transition-all duration-150"
      )}
      title={`Drag to add ${item.label}`}
    >
      <div
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-md",
          item.color
        )}
      >
        {item.icon}
      </div>
      <span className="text-[10px] text-gray-600 text-center leading-tight">
        {item.label}
      </span>
    </div>
  );
});

export function ShapeToolbar() {
  const { mode } = useDiagramStore();
  const shapes = shapesByMode[mode];
  const modeConfig = MODES[mode];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Shapes</h3>
        <p className="text-xs text-gray-500 mt-0.5">{modeConfig.name} Mode</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1">
          {shapes.map((item) => (
            <DraggableShape key={item.type} item={item} />
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-[10px] text-gray-500 text-center">
          Drag shapes to canvas
        </p>
      </div>
    </div>
  );
}
