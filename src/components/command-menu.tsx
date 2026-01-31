"use client";

import { Button } from "@/components/ui/button";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/settings-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import {
    categoryToNodeType,
    getCategoryDisplayName,
    getCategorySymbols,
    getOrderedCategories,
    getSymbolPath,
    nodeTypeToCategory,
} from "@/lib/dexpi-config";
import { MODES } from "@/lib/modes";
import { deleteDiagram, listDiagrams, type SavedDiagram } from "@/lib/storage";
import { ArrowLeft, Book, BookOpen, BookX, FileText, Keyboard, MessageSquare, MessageSquareOff, Plus, Trash2, Volume2, VolumeX, Waves } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type View = "main" | "dictionary" | "addNode";

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

// Simple SVG preview component for command menu
function SymbolPreview({ path }: { path: string }) {
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

  if (!svgContent) {
    return <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <div
      className="w-5 h-5 flex items-center justify-center symbol-preview-svg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const { ttsEnabled, dictionaryEnabled, dictionary, showFlow, showChatInput, updateSetting } = useSettings();
  const [dictionaryText, setDictionaryText] = useState("");
  const [savedDesigns, setSavedDesigns] = useState<SavedDiagram[]>([]);
  const { mode, loadDiagram, addNode, zoomToNode } = useDiagramStore();

  // Load saved designs when menu opens
  useEffect(() => {
    if (open) {
      listDiagrams().then(setSavedDesigns);
    }
  }, [open]);

  // Handle dialog open/close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setView("main");
    }
  }, []);

  // Navigate to dictionary view
  const goToDictionary = useCallback(() => {
    setView("dictionary");
    setDictionaryText(dictionary.join("\n"));
  }, [dictionary]);

  // Navigate to add node view
  const goToAddNode = useCallback(() => {
    setView("addNode");
  }, []);

  // Handle adding a node to the canvas
  const handleAddNode = useCallback((nodeType: string, symbolIndex?: number, dexpiSubclass?: string) => {
    // Generate unique ID
    const nodeId = `${nodeType}_${Date.now()}`;
    
    // Get category name for DEXPI nodes
    const categoryName = nodeTypeToCategory(nodeType);
    
    // Add node at center of viewport (approximate)
    const newNode = {
      id: nodeId,
      type: nodeType,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { 
        label: "",
        ...(categoryName && {
          dexpiCategory: categoryName,
          symbolIndex: symbolIndex ?? 0,
          dexpiSubclass: dexpiSubclass,
        }),
      },
    };
    
    addNode(newNode);
    setOpen(false);
    setView("main");
    
    // Zoom to the newly added node after a short delay (to allow rendering)
    setTimeout(() => {
      zoomToNode(nodeId);
    }, 100);
  }, [addNode, zoomToNode]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K for main menu
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Cmd+I for add node
      if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setView("addNode");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const toggleTTS = () => {
    updateSetting("ttsEnabled", !ttsEnabled);
  };

  const toggleDictionary = () => {
    updateSetting("dictionaryEnabled", !dictionaryEnabled);
  };

  const toggleShowFlow = () => {
    updateSetting("showFlow", !showFlow);
  };

  const toggleShowChatInput = () => {
    updateSetting("showChatInput", !showChatInput);
  };

  const handleDictionaryChange = useCallback((value: string) => {
    setDictionaryText(value);
    
    // Parse lines into dictionary array, filtering empty lines
    const words = value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    updateSetting("dictionary", words);
  }, [updateSetting]);

  const handleBackToMain = () => {
    setView("main");
  };

  const handleLoadDesign = useCallback(
    (design: SavedDiagram) => {
      loadDiagram(design.nodes, design.edges, design.mode, "engineering");
      setOpen(false);
    },
    [loadDiagram]
  );

  const handleDeleteDesign = useCallback(
    async (e: React.MouseEvent, designId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.confirm("Are you sure you want to delete this design?")) {
        await deleteDiagram(designId);
        setSavedDesigns((prev) => prev.filter((d) => d.id !== designId));
      }
    },
    []
  );

  // Dictionary editing view
  if (view === "dictionary") {
    return (
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <div className="flex flex-col h-[400px]">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMain}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium">Custom Dictionary</span>
          </div>

          {/* Content */}
          <div className="flex-1 p-3 space-y-3 overflow-auto">
            <p className="text-sm text-muted-foreground">
              Add domain-specific words (one per line) to help correct speech recognition errors.
            </p>
            
            <Textarea
              placeholder={"e.g.\nCerebras\nReactFlow\nPFD\nBFD"}
              value={dictionaryText}
              onChange={(e) => handleDictionaryChange(e.target.value)}
              onKeyDown={(e) => {
                // Stop propagation to prevent cmdk and voice controller from capturing these keys
                e.stopPropagation();
              }}
              className="min-h-[220px] font-mono text-sm resize-none"
              autoFocus
            />

            <p className="text-xs text-muted-foreground">
              {dictionary.length} {dictionary.length === 1 ? "word" : "words"} in dictionary
            </p>
          </div>
        </div>
      </CommandDialog>
    );
  }

  // Add Node - select equipment type view
  if (view === "addNode") {
    const availableNodeTypes = MODES[mode].availableNodeTypes;
    // Only P&ID mode shows detailed DEXPI categories
    const isPidMode = mode === "pid";
    
    // Get ordered categories for P&ID mode only
    const orderedCategories = isPidMode 
      ? getOrderedCategories().filter((cat) => availableNodeTypes.includes(categoryToNodeType(cat)))
      : [];
    
    // Format node type for display
    const formatNodeType = (nodeType: string): string => {
      // Handle pfd_ prefix specially
      if (nodeType.startsWith("pfd_")) {
        const name = nodeType.slice(4); // Remove "pfd_" prefix
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return nodeType
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    // Custom filter for exact substring matching (case-insensitive)
    const substringFilter = (value: string, search: string): number => {
      if (!search) return 1;
      const normalizedValue = value.toLowerCase();
      const normalizedSearch = search.toLowerCase();
      return normalizedValue.includes(normalizedSearch) ? 1 : 0;
    };

    return (
      <CommandDialog open={open} onOpenChange={handleOpenChange} filter={substringFilter}>
        <CommandInput placeholder="Search equipment to add..." />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>No equipment found.</CommandEmpty>
          {isPidMode ? (
            // P&ID mode: show each category with its symbol variants
            orderedCategories.map((category) => {
              const nodeType = categoryToNodeType(category);
              const symbols = getCategorySymbols(category);
              
              if (symbols.length === 0) return null;
              
              return (
                <CommandGroup key={category} heading={getCategoryDisplayName(category)}>
                  {symbols.map((symbol, index) => (
                    <CommandItem
                      key={`${nodeType}-${index}`}
                      value={`${category} ${symbol.description} ${symbol.dexpi_subclass}`}
                      onSelect={() => handleAddNode(nodeType, index, symbol.dexpi_subclass)}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        <SymbolPreview path={getSymbolPath(category, index)} />
                      </div>
                      <span className="truncate">{symbol.description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          ) : (
            // Other modes (Playground, BFD, PFD): flat list of shapes
            <CommandGroup heading={mode === "pfd" ? "Equipment" : "Shapes"}>
              {availableNodeTypes.map((nodeType) => (
                <CommandItem
                  key={nodeType}
                  value={nodeType}
                  onSelect={() => handleAddNode(nodeType)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{formatNodeType(nodeType)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMain}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </CommandDialog>
    );
  }

  // Main command menu view
  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={goToAddNode}>
            <Plus className="h-4 w-4" />
            <span>Add Node</span>
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={toggleTTS}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {ttsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span>Voice Responses (TTS)</span>
            </div>
            <Switch
              checked={ttsEnabled}
              onCheckedChange={toggleTTS}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
          <CommandItem
            onSelect={toggleDictionary}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {dictionaryEnabled ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <BookX className="h-4 w-4" />
              )}
              <span>Dictionary Correction</span>
            </div>
            <Switch
              checked={dictionaryEnabled}
              onCheckedChange={toggleDictionary}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
          <CommandItem onSelect={goToDictionary}>
            <Book className="h-4 w-4" />
            <span>Custom Dictionary</span>
            <CommandShortcut>{dictionary.length} words</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={toggleShowFlow}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Waves className="h-4 w-4" />
              <span>Show Flow</span>
            </div>
            <Switch
              checked={showFlow}
              onCheckedChange={toggleShowFlow}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
          <CommandItem
            onSelect={toggleShowChatInput}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {showChatInput ? (
                <MessageSquare className="h-4 w-4" />
              ) : (
                <MessageSquareOff className="h-4 w-4" />
              )}
              <span>Voice Input Bar</span>
            </div>
            <Switch
              checked={showChatInput}
              onCheckedChange={toggleShowChatInput}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </CommandItem>
        </CommandGroup>
        {savedDesigns.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Saved Designs">
              {/* Group designs by mode */}
              {(() => {
                // Define mode order and display info
                const modeOrder: Array<{ id: string; label: string; badgeClass: string }> = [
                  { id: "playground", label: "Playground", badgeClass: "bg-gray-100 text-gray-700" },
                  { id: "bfd", label: "BFD", badgeClass: "bg-blue-100 text-blue-700" },
                  { id: "pfd", label: "PFD", badgeClass: "bg-green-100 text-green-700" },
                  { id: "pid", label: "P&ID", badgeClass: "bg-orange-100 text-orange-700" },
                ];
                
                // Group designs by mode
                const designsByMode = savedDesigns.reduce((acc, design) => {
                  const modeKey = design.mode || "playground";
                  if (!acc[modeKey]) acc[modeKey] = [];
                  acc[modeKey].push(design);
                  return acc;
                }, {} as Record<string, SavedDiagram[]>);
                
                return modeOrder
                  .filter((m) => designsByMode[m.id]?.length > 0)
                  .map((modeInfo) => (
                    <div key={modeInfo.id} className="mb-1">
                      {/* Mode header with badge */}
                      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${modeInfo.badgeClass}`}>
                          {modeInfo.label}
                        </span>
                        <span className="text-muted-foreground/60">
                          {designsByMode[modeInfo.id].length} {designsByMode[modeInfo.id].length === 1 ? "design" : "designs"}
                        </span>
                      </div>
                      {/* Designs in this mode */}
                      {designsByMode[modeInfo.id].map((design) => (
                        <CommandItem
                          key={design.id}
                          onSelect={() => handleLoadDesign(design)}
                          className="flex items-center justify-between group ml-2"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{design.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {design.nodes.length} nodes
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteDesign(e, design.id)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CommandItem>
                      ))}
                    </div>
                  ));
              })()}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem disabled>
            <Keyboard className="h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
