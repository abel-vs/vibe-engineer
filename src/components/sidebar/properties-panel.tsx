"use client";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
    getCategoryDisplayName,
    getCategorySymbols,
    getSymbolPath,
    isDexpiNodeType,
    nodeTypeToCategory,
} from "@/lib/dexpi-config";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

// Format node type for display (e.g., "process_block" -> "Process Block")
function formatNodeType(nodeType: string): string {
  return nodeType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Utility to process SVG content for proper scaling
function processSvgForPreview(svgText: string): string {
  // Extract width and height from inline style or attributes
  let width = 42;
  let height = 42;

  // Try to extract from style attribute
  const styleMatch = svgText.match(/style="[^"]*width:\s*(\d+(?:\.\d+)?)/);
  const styleHeightMatch = svgText.match(/style="[^"]*height:\s*(\d+(?:\.\d+)?)/);
  if (styleMatch) width = parseFloat(styleMatch[1]);
  if (styleHeightMatch) height = parseFloat(styleHeightMatch[1]);

  // Try to extract from width/height attributes if not in style
  const widthAttrMatch = svgText.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/);
  const heightAttrMatch = svgText.match(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)"/);
  if (widthAttrMatch) width = parseFloat(widthAttrMatch[1]);
  if (heightAttrMatch) height = parseFloat(heightAttrMatch[1]);

  // Check if viewBox exists
  const hasViewBox = /viewBox\s*=/.test(svgText);

  let processed = svgText;

  // Add viewBox if missing
  if (!hasViewBox) {
    processed = processed.replace(/<svg/, `<svg viewBox="0 0 ${width} ${height}"`);
  }

  // Remove inline width/height from style attribute to let CSS take over
  processed = processed.replace(
    /style="([^"]*)"/,
    (match, styleContent) => {
      const cleanedStyle = styleContent
        .replace(/width:\s*[\d.]+px;?\s*/gi, "")
        .replace(/height:\s*[\d.]+px;?\s*/gi, "")
        .replace(/left:\s*[\d.]+px;?\s*/gi, "")
        .replace(/top:\s*[\d.]+px;?\s*/gi, "")
        .replace(/position:\s*\w+;?\s*/gi, "")
        .trim();
      return cleanedStyle ? `style="${cleanedStyle}"` : "";
    }
  );

  // Remove width/height attributes from svg tag
  processed = processed.replace(/<svg([^>]*)\swidth="[\d.]+"/i, "<svg$1");
  processed = processed.replace(/<svg([^>]*)\sheight="[\d.]+"/i, "<svg$1");

  return processed;
}

// DEXPI Symbol Variant Selector Component
interface DexpiSymbolSelectorProps {
  selectedNode: {
    id: string;
    type?: string;
    data?: Record<string, unknown>;
  };
  updateNode: (nodeId: string, updates: { data: Record<string, unknown> }) => void;
}

// Component to render SVG preview for a symbol
function SymbolPreview({ path, size = "sm" }: { path: string; size?: "sm" | "md" | "lg" }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  
  useEffect(() => {
    if (!path) return;
    fetch(path)
      .then((res) => res.ok ? res.text() : null)
      .then((text) => {
        if (text) {
          const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
          if (svgMatch) setSvgContent(processSvgForPreview(svgMatch[0]));
        }
      })
      .catch(() => setSvgContent(null));
  }, [path]);

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  if (!svgContent) {
    return <div className={`${sizeClasses[size]} bg-gray-100 rounded animate-pulse`} />;
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center symbol-preview-svg`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

function DexpiSymbolSelector({ selectedNode, updateNode }: DexpiSymbolSelectorProps) {
  const nodeType = selectedNode.type || "";
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  
  const categoryName = (selectedNode.data?.dexpiCategory as string) || nodeTypeToCategory(nodeType) || "";
  const currentIndex = (selectedNode.data?.symbolIndex as number) ?? 0;
  const symbols = getCategorySymbols(categoryName);

  // Load preview SVG for current selection
  useEffect(() => {
    const path = getSymbolPath(categoryName, currentIndex);
    if (path) {
      fetch(path)
        .then((res) => res.ok ? res.text() : null)
        .then((text) => {
          if (text) {
            const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
            if (svgMatch) setPreviewSvg(processSvgForPreview(svgMatch[0]));
          }
        })
        .catch(() => setPreviewSvg(null));
    }
  }, [categoryName, currentIndex]);

  // Check if this is a DEXPI node
  if (!isDexpiNodeType(nodeType)) {
    return null;
  }

  if (symbols.length === 0) {
    return null;
  }

  const handleSymbolChange = (index: number) => {
    const symbol = symbols[index];
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        symbolIndex: index,
        dexpiSubclass: symbol?.dexpi_subclass,
        // Don't auto-update label - keep user's label or empty
      },
    });
    setOpen(false);
  };

  return (
    <div>
      <Label htmlFor="symbol-variant" className="text-xs">
        Symbol Variant
        <span className="ml-1 text-gray-400">({symbols.length} available)</span>
      </Label>
      
      {/* Current symbol preview */}
      {previewSvg && (
        <div className="mt-2 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center justify-center">
          <div
            className="w-14 h-14 flex items-center justify-center symbol-preview-svg"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="mt-1 w-full justify-between font-normal"
          >
            {symbols[currentIndex]?.description || "Select variant..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search symbols..." />
            <CommandList>
              <CommandEmpty>No symbol found.</CommandEmpty>
              <CommandGroup>
                {symbols.map((symbol, index) => (
                  <CommandItem
                    key={index}
                    value={symbol.description}
                    onSelect={() => handleSymbolChange(index)}
                    className="py-2"
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* SVG preview in dropdown */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                        <SymbolPreview path={getSymbolPath(categoryName, index)} size="sm" />
                      </div>
                      <span className="text-sm truncate flex-1">{symbol.description}</span>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          currentIndex === index ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <p className="text-[10px] text-gray-400 mt-1">
        Category: {getCategoryDisplayName(categoryName)}
      </p>
    </div>
  );
}

export function PropertiesPanel() {
  const {
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    updateNode,
    updateEdge,
    removeNode,
    removeEdge,
    style,
    mode,
  } = useDiagramStore();

  // Get available node types for current mode
  const availableNodeTypes = MODES[mode].availableNodeTypes;

  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeDescription, setNodeDescription] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [newPropKey, setNewPropKey] = useState("");
  const [newPropValue, setNewPropValue] = useState("");

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : null;

  const selectedEdge = selectedEdgeIds.length === 1
    ? edges.find((e) => e.id === selectedEdgeIds[0])
    : null;

  // Sync local state with selected element
  useEffect(() => {
    if (selectedNode) {
      setNodeLabel((selectedNode.data?.label as string) || "");
      setNodeDescription((selectedNode.data?.description as string) || "");
      // Reset new property inputs when selection changes
      setNewPropKey("");
      setNewPropValue("");
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel((selectedEdge.label as string) || "");
    }
  }, [selectedEdge]);

  const handleNodeLabelChange = (value: string) => {
    setNodeLabel(value);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, label: value },
      });
    }
  };

  const handleNodeDescriptionChange = (value: string) => {
    setNodeDescription(value);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, description: value },
      });
    }
  };

  const handleEdgeLabelChange = (value: string) => {
    setEdgeLabel(value);
    if (selectedEdge) {
      updateEdge(selectedEdge.id, { label: value });
    }
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      removeNode(selectedNode.id);
    }
  };

  const handleNodeTypeChange = (newType: string) => {
    if (selectedNode) {
      updateNode(selectedNode.id, { type: newType });
    }
  };

  const handleDeleteEdge = () => {
    if (selectedEdge) {
      removeEdge(selectedEdge.id);
    }
  };

  const handleEdgeTypeChange = (newType: string) => {
    if (selectedEdge) {
      updateEdge(selectedEdge.id, { type: newType });
    }
  };

  // Get available edge types for current mode
  const availableEdgeTypes = MODES[mode].availableEdgeTypes;

  // Get current properties
  const nodeProperties = (selectedNode?.data?.properties as Record<string, string>) || {};

  const handleAddProperty = () => {
    if (!selectedNode || !newPropKey.trim()) return;
    const currentProps = (selectedNode.data?.properties as Record<string, string>) || {};
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        properties: { ...currentProps, [newPropKey.trim()]: newPropValue },
      },
    });
    setNewPropKey("");
    setNewPropValue("");
  };

  const handleUpdateProperty = (key: string, value: string) => {
    if (!selectedNode) return;
    const currentProps = (selectedNode.data?.properties as Record<string, string>) || {};
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        properties: { ...currentProps, [key]: value },
      },
    });
  };

  const handleRemoveProperty = (key: string) => {
    if (!selectedNode) return;
    const currentProps = (selectedNode.data?.properties as Record<string, string>) || {};
    const { [key]: _, ...rest } = currentProps;
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        properties: rest,
      },
    });
  };

  // No selection
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Select a node or edge to edit its properties</p>
      </div>
    );
  }

  // Multiple selection
  if (selectedNodeIds.length > 1 || selectedEdgeIds.length > 1) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">
          {selectedNodeIds.length} nodes, {selectedEdgeIds.length} edges selected
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-4 w-full"
          onClick={() => {
            selectedNodeIds.forEach((id) => removeNode(id));
            selectedEdgeIds.forEach((id) => removeEdge(id));
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {selectedNode && (
        <>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3">Node Properties</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="node-label" className="text-xs">Label</Label>
                <Input
                  id="node-label"
                  value={nodeLabel}
                  onChange={(e) => handleNodeLabelChange(e.target.value)}
                  placeholder="Enter label"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="node-description" className="text-xs">Description</Label>
                <Input
                  id="node-description"
                  value={nodeDescription}
                  onChange={(e) => handleNodeDescriptionChange(e.target.value)}
                  placeholder="Enter description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="node-type" className="text-xs">Type</Label>
                <Select
                  value={selectedNode.type || ""}
                  onValueChange={handleNodeTypeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNodeTypes.map((nodeType) => (
                      <SelectItem key={nodeType} value={nodeType}>
                        {formatNodeType(nodeType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DEXPI Symbol Variant Selector */}
              <DexpiSymbolSelector
                selectedNode={selectedNode}
                updateNode={updateNode}
              />

              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Position: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </p>
              </div>
            </div>
          </div>

          {/* Custom Properties Section */}
          <Separator />
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3">
              Custom Properties
              {style === "engineering" && (
                <span className="ml-1 text-xs font-normal text-gray-500">
                  (shown on node)
                </span>
              )}
            </h3>

            {/* Existing properties */}
            {Object.keys(nodeProperties).length > 0 ? (
              <div className="space-y-2 mb-3">
                {Object.entries(nodeProperties).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1">
                    <Input
                      value={key}
                      disabled
                      className="w-20 text-xs h-8"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handleUpdateProperty(key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 text-xs h-8"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveProperty(key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">No custom properties</p>
            )}

            {/* Add new property */}
            <div className="flex items-center gap-1">
              <Input
                value={newPropKey}
                onChange={(e) => setNewPropKey(e.target.value)}
                placeholder="Key"
                className="w-20 text-xs h-8"
              />
              <Input
                value={newPropValue}
                onChange={(e) => setNewPropValue(e.target.value)}
                placeholder="Value"
                className="flex-1 text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProperty();
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleAddProperty}
                disabled={!newPropKey.trim()}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDeleteNode}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Node
          </Button>
        </>
      )}

      {selectedEdge && (
        <>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 mb-3">Edge Properties</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edge-label" className="text-xs">Stream Label</Label>
                <Input
                  id="edge-label"
                  value={edgeLabel}
                  onChange={(e) => handleEdgeLabelChange(e.target.value)}
                  placeholder="e.g., 500 kg/hr, 25°C"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edge-type" className="text-xs">Type</Label>
                <Select
                  value={selectedEdge.type || ""}
                  onValueChange={handleEdgeTypeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEdgeTypes.map((edgeType) => (
                      <SelectItem key={edgeType} value={edgeType}>
                        {formatNodeType(edgeType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  From: <span className="font-medium">{selectedEdge.source}</span>
                </p>
                <p className="text-xs text-gray-500">
                  To: <span className="font-medium">{selectedEdge.target}</span>
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDeleteEdge}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Edge
          </Button>
        </>
      )}
    </div>
  );
}
