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
import {
    INLINE_CATEGORIES,
    INLINE_CATEGORY_INFO,
    getInlineNodeType,
    getInlineSymbolsByCategory,
    type InlineCategory,
} from "@/lib/inline-components";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Utility to process SVG content for proper scaling in preview
function processSvgForPreview(svgText: string): string {
  let width = 42;
  let height = 42;

  const styleMatch = svgText.match(/style="[^"]*width:\s*(\d+(?:\.\d+)?)/);
  const styleHeightMatch = svgText.match(/style="[^"]*height:\s*(\d+(?:\.\d+)?)/);
  if (styleMatch) width = parseFloat(styleMatch[1]);
  if (styleHeightMatch) height = parseFloat(styleHeightMatch[1]);

  const widthAttrMatch = svgText.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/);
  const heightAttrMatch = svgText.match(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)"/);
  if (widthAttrMatch) width = parseFloat(widthAttrMatch[1]);
  if (heightAttrMatch) height = parseFloat(heightAttrMatch[1]);

  const hasViewBox = /viewBox\s*=/.test(svgText);

  let processed = svgText;

  if (!hasViewBox) {
    processed = processed.replace(/<svg/, `<svg viewBox="0 0 ${width} ${height}"`);
  }

  processed = processed.replace(/style="([^"]*)"/g, (_, styleContent) => {
    const cleanedStyle = styleContent
      .replace(/width:\s*[\d.]+px;?\s*/gi, "")
      .replace(/height:\s*[\d.]+px;?\s*/gi, "")
      .replace(/left:\s*[\d.]+px;?\s*/gi, "")
      .replace(/top:\s*[\d.]+px;?\s*/gi, "")
      .replace(/position:\s*\w+;?\s*/gi, "")
      .trim();
    return cleanedStyle ? `style="${cleanedStyle}"` : "";
  });

  processed = processed.replace(/<svg([^>]*)\swidth="[\d.]+"/i, "<svg$1");
  processed = processed.replace(/<svg([^>]*)\sheight="[\d.]+"/i, "<svg$1");

  return processed;
}

// Component to render SVG preview for a symbol
function SymbolPreview({ path }: { path: string }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    fetch(path)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text) {
          const svgMatch = text.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
          if (svgMatch) setSvgContent(processSvgForPreview(svgMatch[0]));
        }
      })
      .catch(() => setSvgContent(null));
  }, [path]);

  if (!svgContent) {
    return <div className="w-6 h-6 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <div
      className="w-6 h-6 flex items-center justify-center symbol-preview-svg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export interface InlineComponentSelection {
  category: InlineCategory;
  nodeType: string;
  symbolIndex: number;
  dexpiSubclass: string;
  description: string;
}

interface InlineComponentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: InlineComponentSelection) => void;
  position?: { x: number; y: number };
}

export function InlineComponentSelector({
  open,
  onOpenChange,
  onSelect,
  position,
}: InlineComponentSelectorProps) {
  const symbolsByCategory = getInlineSymbolsByCategory();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (
    category: InlineCategory,
    symbolIndex: number,
    dexpiSubclass: string,
    description: string
  ) => {
    onSelect({
      category,
      nodeType: getInlineNodeType(category),
      symbolIndex,
      dexpiSubclass,
      description,
    });
    onOpenChange(false);
  };

  // Handle click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    // Handle escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || !position) return null;

  // Position: centered horizontally, below the indicator dot (with 20px offset for the dot)
  const INDICATOR_OFFSET = 20; // Space below the indicator dot

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-[320px] bg-white rounded-lg border border-gray-200 shadow-lg"
      style={{
        left: position.x,
        top: position.y + INDICATOR_OFFSET,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Add Inline Component</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Command>
        <CommandInput placeholder="Search components..." />
        <CommandList className="max-h-[300px]">
          <CommandEmpty>No component found.</CommandEmpty>
          {INLINE_CATEGORIES.map((category) => (
            <CommandGroup
              key={category}
              heading={
                <div className="flex flex-col">
                  <span>{INLINE_CATEGORY_INFO[category].displayName}</span>
                  <span className="text-[10px] font-normal text-gray-400">
                    {INLINE_CATEGORY_INFO[category].description}
                  </span>
                </div>
              }
            >
              {symbolsByCategory[category]?.map(({ symbol, index, path }) => (
                <CommandItem
                  key={`${category}-${index}`}
                  value={`${category} ${symbol.description} ${symbol.dexpi_subclass}`}
                  onSelect={() =>
                    handleSelect(
                      category,
                      index,
                      symbol.dexpi_subclass,
                      symbol.description
                    )
                  }
                  className="py-1.5"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                      <SymbolPreview path={path} />
                    </div>
                    <span className="text-sm truncate flex-1">
                      {symbol.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  );
}
