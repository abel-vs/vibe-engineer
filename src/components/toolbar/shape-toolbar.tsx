"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { MODES, type DiagramMode } from "@/lib/modes";
import type { DiagramStyle } from "@/lib/styles";
import {
  getOrderedCategories,
  getCategoryDisplayName,
  getSymbolCount,
  getSymbolPath,
  getCategorySymbols,
  categoryToNodeType,
  getSymbolPathFromSymbol,
  type DexpiSymbol,
} from "@/lib/dexpi-config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ShapeItem {
  type: string;
  label: string;
  // Function to render icon based on style
  renderIcon: (style: DiagramStyle) => React.ReactNode;
  colorfulBg: string;
}

// DEXPI category item for PFD mode
interface DexpiCategoryItem {
  categoryName: string;
  nodeType: string;
  label: string;
  symbolCount: number;
  defaultSymbolPath: string;
}

const playgroundShapes: ShapeItem[] = [
  {
    type: "rectangle",
    label: "Rectangle",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-8 h-6",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-gray-500 bg-white rounded"
        )}
      />
    ),
    colorfulBg: "bg-gray-50",
  },
  {
    type: "circle",
    label: "Circle",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-7 h-7",
          style === "engineering"
            ? "border-2 border-black bg-white rounded-full"
            : "border-2 border-green-500 bg-white rounded-full"
        )}
      />
    ),
    colorfulBg: "bg-green-50",
  },
  {
    type: "diamond",
    label: "Diamond",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-6 h-6 rotate-45",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-orange-500 bg-white"
        )}
      />
    ),
    colorfulBg: "bg-orange-50",
  },
  {
    type: "triangle",
    label: "Triangle",
    renderIcon: (style) => (
      <svg viewBox="0 0 24 24" className="w-7 h-7">
        <polygon
          points="12,4 22,20 2,20"
          fill="white"
          stroke={style === "engineering" ? "black" : "rgb(168 85 247)"}
          strokeWidth="2"
        />
      </svg>
    ),
    colorfulBg: "bg-purple-50",
  },
  {
    type: "text",
    label: "Text",
    renderIcon: (style) => (
      <span
        className={cn(
          "text-sm font-bold",
          style === "engineering" ? "text-black" : "text-gray-600"
        )}
      >
        Aa
      </span>
    ),
    colorfulBg: "bg-gray-50",
  },
];

const bfdShapes: ShapeItem[] = [
  {
    type: "process_block",
    label: "Process Block",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-10 h-6",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-blue-500 bg-blue-100 rounded"
        )}
      />
    ),
    colorfulBg: "bg-blue-50",
  },
  {
    type: "input_output",
    label: "Input/Output",
    renderIcon: (style) => (
      <span
        className={cn(
          "text-sm font-medium",
          style === "engineering" ? "text-black" : "text-gray-600"
        )}
      >
        Aa
      </span>
    ),
    colorfulBg: "bg-gray-50",
  },
  {
    type: "storage",
    label: "Storage",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-8 h-6",
          style === "engineering"
            ? "border-2 border-black bg-white border-b-4"
            : "border-2 border-amber-500 bg-amber-100 rounded border-b-4"
        )}
      />
    ),
    colorfulBg: "bg-amber-50",
  },
];

const pfdShapes: ShapeItem[] = [
  {
    type: "reactor",
    label: "Reactor",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-8 h-6",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-blue-600 bg-blue-100 rounded"
        )}
      />
    ),
    colorfulBg: "bg-blue-50",
  },
  {
    type: "tank",
    label: "Tank",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-7 h-7",
          style === "engineering"
            ? "border-2 border-black bg-white border-b-4"
            : "border-2 border-cyan-600 bg-cyan-100 rounded-xl border-b-4"
        )}
      />
    ),
    colorfulBg: "bg-cyan-50",
  },
  {
    type: "vessel",
    label: "Vessel",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-5 h-8",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-cyan-500 bg-cyan-50 rounded-xl"
        )}
      />
    ),
    colorfulBg: "bg-cyan-50",
  },
  {
    type: "pump",
    label: "Pump",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-6 h-6 rounded-full",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-green-600 bg-green-100"
        )}
      />
    ),
    colorfulBg: "bg-green-50",
  },
  {
    type: "compressor",
    label: "Compressor",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-8 h-6",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-yellow-600 bg-yellow-100"
        )}
        style={{
          clipPath:
            "polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)",
        }}
      />
    ),
    colorfulBg: "bg-yellow-50",
  },
  {
    type: "heat_exchanger",
    label: "Heat Exchanger",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-6 h-6 rotate-45",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-orange-600 bg-orange-100"
        )}
      />
    ),
    colorfulBg: "bg-orange-50",
  },
  {
    type: "column",
    label: "Column",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-4 h-8",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-teal-600 bg-teal-100 rounded-t-full rounded-b"
        )}
      />
    ),
    colorfulBg: "bg-teal-50",
  },
  {
    type: "valve",
    label: "Valve",
    renderIcon: (style) => (
      <div
        className={cn(
          "w-4 h-4 rotate-45",
          style === "engineering"
            ? "border-2 border-black bg-white"
            : "border-2 border-gray-600 bg-gray-200"
        )}
      />
    ),
    colorfulBg: "bg-gray-50",
  },
  {
    type: "mixer",
    label: "Mixer",
    renderIcon: (style) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <polygon
          points="0,0 24,12 0,24"
          fill={style === "engineering" ? "white" : "rgb(243 232 255)"}
          stroke={style === "engineering" ? "black" : "rgb(126 34 206)"}
          strokeWidth="2"
        />
      </svg>
    ),
    colorfulBg: "bg-purple-50",
  },
  {
    type: "splitter",
    label: "Splitter",
    renderIcon: (style) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <polygon
          points="24,0 0,12 24,24"
          fill={style === "engineering" ? "white" : "rgb(243 232 255)"}
          stroke={style === "engineering" ? "black" : "rgb(126 34 206)"}
          strokeWidth="2"
        />
      </svg>
    ),
    colorfulBg: "bg-purple-50",
  },
];

const shapesByMode: Record<DiagramMode, ShapeItem[]> = {
  playground: playgroundShapes,
  bfd: bfdShapes,
  pfd: pfdShapes,
};

interface DraggableShapeProps {
  item: ShapeItem;
  style: DiagramStyle;
}

const DraggableShape = memo(function DraggableShape({ item, style }: DraggableShapeProps) {
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
          style === "engineering" ? "bg-gray-50" : item.colorfulBg
        )}
      >
        {item.renderIcon(style)}
      </div>
      <span className="text-[10px] text-gray-600 text-center leading-tight">
        {item.label}
      </span>
    </div>
  );
});

// SVG Preview component for symbols
interface SymbolSvgPreviewProps {
  path: string;
  className?: string;
}

const SymbolSvgPreview = memo(function SymbolSvgPreview({ path, className }: SymbolSvgPreviewProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load SVG");
        return res.text();
      })
      .then((text) => {
        const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
        if (svgMatch) {
          setSvgContent(svgMatch[0]);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, [path]);

  if (!svgContent) {
    return <div className={cn("bg-gray-100 animate-pulse rounded", className)} />;
  }

  return (
    <div
      className={cn("toolbar-svg-preview flex items-center justify-center", className)}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
});

// Symbol picker grid item (inside the dropdown)
interface SymbolPickerItemProps {
  symbol: DexpiSymbol;
  symbolIndex: number;
  categoryName: string;
  nodeType: string;
  onSelect: (symbolIndex: number, dexpiSubclass: string) => void;
}

const SymbolPickerItem = memo(function SymbolPickerItem({
  symbol,
  symbolIndex,
  categoryName,
  nodeType,
  onSelect,
}: SymbolPickerItemProps) {
  const symbolPath = getSymbolPathFromSymbol(symbol);

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/label", symbol.description);
    event.dataTransfer.setData("application/reactflow/dexpiCategory", categoryName);
    event.dataTransfer.setData("application/reactflow/symbolIndex", symbolIndex.toString());
    event.dataTransfer.setData("application/reactflow/dexpiSubclass", symbol.dexpi_subclass);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(symbolIndex, symbol.dexpi_subclass)}
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded cursor-pointer",
        "border border-transparent hover:border-blue-300 hover:bg-blue-50",
        "transition-all duration-150"
      )}
      title={symbol.description}
    >
      <SymbolSvgPreview path={symbolPath} className="w-10 h-10" />
      <span className="text-[8px] text-gray-600 text-center leading-tight w-full line-clamp-2">
        {symbol.description}
      </span>
    </div>
  );
});

// DEXPI category draggable item with SVG preview and variant count badge
interface DraggableDexpiCategoryProps {
  item: DexpiCategoryItem;
}

const DraggableDexpiCategory = memo(function DraggableDexpiCategory({ item }: DraggableDexpiCategoryProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { addNode, zoomToNode } = useDiagramStore();

  // Get all symbols for this category
  const symbols = useMemo(() => getCategorySymbols(item.categoryName), [item.categoryName]);

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return symbols;
    const query = searchQuery.toLowerCase();
    return symbols.filter(
      (symbol) =>
        symbol.description.toLowerCase().includes(query) ||
        symbol.dexpi_subclass.toLowerCase().includes(query)
    );
  }, [symbols, searchQuery]);

  // Fetch SVG content for preview
  useEffect(() => {
    if (!item.defaultSymbolPath) return;

    fetch(item.defaultSymbolPath)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load SVG");
        return res.text();
      })
      .then((text) => {
        const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
        if (svgMatch) {
          setSvgContent(svgMatch[0]);
        }
      })
      .catch(() => {
        // Silently fail - will show placeholder
      });
  }, [item.defaultSymbolPath]);

  const onDragStart = (event: React.DragEvent) => {
    setIsDragging(true);
    event.dataTransfer.setData("application/reactflow/type", item.nodeType);
    event.dataTransfer.setData("application/reactflow/label", item.label);
    event.dataTransfer.setData("application/reactflow/dexpiCategory", item.categoryName);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  // Handle selecting a symbol from the dropdown
  const handleSelectSymbol = useCallback(
    (symbolIndex: number, dexpiSubclass: string) => {
      const nodeId = `${item.nodeType}_${Date.now()}`;
      const symbol = symbols[symbolIndex];

      const newNode = {
        id: nodeId,
        type: item.nodeType,
        position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
        data: {
          label: "",
          dexpiCategory: item.categoryName,
          symbolIndex,
          dexpiSubclass,
        },
      };

      addNode(newNode);
      setIsOpen(false);
      setSearchQuery("");

      // Zoom to the newly added node
      setTimeout(() => {
        zoomToNode(nodeId);
      }, 100);
    },
    [item.nodeType, item.categoryName, symbols, addNode, zoomToNode]
  );

  // Handle click - only open popover if not dragging
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(true);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={handleClick}
          className={cn(
            "relative flex flex-col items-center gap-1 p-1.5 rounded cursor-pointer",
            "hover:bg-gray-50",
            "transition-all duration-150",
            isOpen && "bg-blue-50 ring-1 ring-blue-200"
          )}
          title={`Click to browse ${item.symbolCount} variants, or drag to add default`}
        >
          {/* Variant count badge */}
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center z-10">
            {item.symbolCount}
          </div>

          {/* SVG Preview - no border, clean white background */}
          <div className="w-12 h-12 flex items-center justify-center p-1">
            {svgContent ? (
              <div
                className="toolbar-svg-preview w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="w-8 h-8 bg-gray-100 animate-pulse rounded" />
            )}
          </div>

          {/* Label */}
          <span className="text-[9px] text-gray-600 text-center leading-tight w-full line-clamp-2">
            {item.label}
          </span>
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-[320px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header with search */}
        <div className="p-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{item.label}</h3>
          <Input
            placeholder="Search variants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <p className="text-[10px] text-gray-400 mt-1.5">
            {filteredSymbols.length} of {symbols.length} variants
          </p>
        </div>

        {/* Symbol grid */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredSymbols.length > 0 ? (
            <div className="grid grid-cols-4 gap-1">
              {filteredSymbols.map((symbol, idx) => {
                // Find original index for the filtered symbol
                const originalIndex = symbols.findIndex((s) => s === symbol);
                return (
                  <SymbolPickerItem
                    key={`${symbol.filename}-${originalIndex}`}
                    symbol={symbol}
                    symbolIndex={originalIndex}
                    categoryName={item.categoryName}
                    nodeType={item.nodeType}
                    onSelect={handleSelectSymbol}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              No variants match &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[9px] text-gray-400 text-center">
            Click to add or drag to canvas
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// Generate DEXPI category items for PFD mode
function getDexpiCategoryItems(): DexpiCategoryItem[] {
  return getOrderedCategories().map((categoryName) => ({
    categoryName,
    nodeType: categoryToNodeType(categoryName),
    label: getCategoryDisplayName(categoryName),
    symbolCount: getSymbolCount(categoryName),
    defaultSymbolPath: getSymbolPath(categoryName, 0),
  }));
}

export function ShapeToolbar() {
  const { mode, style } = useDiagramStore();
  const shapes = shapesByMode[mode];
  const modeConfig = MODES[mode];
  const dexpiCategories = getDexpiCategoryItems();

  // For PFD mode, use DEXPI categories
  const isPfdMode = mode === "pfd";

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-[180px]">
      <div className="px-2 py-2 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700">
          {isPfdMode ? "Equipment" : "Shapes"}
        </h3>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {modeConfig.name}
          {isPfdMode && (
            <span className="text-blue-500 ml-1">
              · {dexpiCategories.reduce((sum, c) => sum + c.symbolCount, 0)}
            </span>
          )}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {isPfdMode ? (
          <div className="grid grid-cols-2 gap-0.5">
            {dexpiCategories.map((item) => (
              <DraggableDexpiCategory key={item.categoryName} item={item} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5">
            {shapes.map((item) => (
              <DraggableShape key={item.type} item={item} style={style} />
            ))}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[9px] text-gray-400 text-center">
          Drag to canvas
        </p>
      </div>
    </div>
  );
}
