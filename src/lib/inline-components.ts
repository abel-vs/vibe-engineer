// Inline component configuration for P&ID edge insertion
// These are components typically placed on pipes/streams between equipment

import {
  DEXPI_MAPPING,
  getCategorySymbols,
  getSymbolPath,
  type DexpiSymbol,
} from "./dexpi-config";

// Categories that can be placed inline on edges (pipes/streams)
export const INLINE_CATEGORIES = [
  "Valves", // Gate, Globe, Ball, Check, Control, Safety valves
  "Instruments", // Controllers, transmitters, indicators
  "Flow_Sensors", // Flow meters, orifice plates
  "Fittings", // Flanges, reducers (optional but useful)
] as const;

export type InlineCategory = (typeof INLINE_CATEGORIES)[number];

// Category display names and icons for the selector UI
export const INLINE_CATEGORY_INFO: Record<
  InlineCategory,
  { displayName: string; description: string }
> = {
  Valves: {
    displayName: "Valves",
    description: "Control flow: gate, globe, ball, check, control valves",
  },
  Instruments: {
    displayName: "Instruments",
    description: "Controllers, transmitters, indicators, alarms",
  },
  Flow_Sensors: {
    displayName: "Flow Sensors",
    description: "Flow meters, orifice plates, venturi tubes",
  },
  Fittings: {
    displayName: "Fittings",
    description: "Flanges, reducers, tees, elbows",
  },
};

// Get all symbols for inline categories
export function getInlineSymbols(): Array<{
  category: InlineCategory;
  symbol: DexpiSymbol;
  index: number;
  path: string;
}> {
  const symbols: Array<{
    category: InlineCategory;
    symbol: DexpiSymbol;
    index: number;
    path: string;
  }> = [];

  for (const category of INLINE_CATEGORIES) {
    const categorySymbols = getCategorySymbols(category);
    categorySymbols.forEach((symbol, index) => {
      symbols.push({
        category,
        symbol,
        index,
        path: getSymbolPath(category, index),
      });
    });
  }

  return symbols;
}

// Get symbols grouped by category
export function getInlineSymbolsByCategory(): Record<
  InlineCategory,
  Array<{ symbol: DexpiSymbol; index: number; path: string }>
> {
  const grouped = {} as Record<
    InlineCategory,
    Array<{ symbol: DexpiSymbol; index: number; path: string }>
  >;

  for (const category of INLINE_CATEGORIES) {
    const categorySymbols = getCategorySymbols(category);
    grouped[category] = categorySymbols.map((symbol, index) => ({
      symbol,
      index,
      path: getSymbolPath(category, index),
    }));
  }

  return grouped;
}

// Check if a category is valid for inline placement
export function isInlineCategory(category: string): category is InlineCategory {
  return INLINE_CATEGORIES.includes(category as InlineCategory);
}

// Get the node type for an inline category (lowercase)
export function getInlineNodeType(category: InlineCategory): string {
  return category.toLowerCase();
}

// Check if a node type is an inline component
// Edges with inline components as TARGETS should NOT have arrows
// Edges with inline components as SOURCES but equipment as TARGETS should show arrows
export function isInlineNodeType(nodeType: string): boolean {
  // Node types are lowercase versions of categories (e.g., "valves", "instruments")
  const normalizedType = nodeType.toLowerCase();
  return INLINE_CATEGORIES.some((cat) => cat.toLowerCase() === normalizedType);
}

// Get symbol count for inline categories
export function getInlineSymbolCount(): number {
  return INLINE_CATEGORIES.reduce((total, category) => {
    const cat = DEXPI_MAPPING.categories[category];
    return total + (cat?.svg_count ?? 0);
  }, 0);
}

// Default handle mapping for inline components
// DEXPI uses compass directions (N/S/E/W), React Flow uses position names
export const INLINE_HANDLE_MAPPING = {
  // For horizontal flow (most common in P&IDs)
  horizontal: {
    inlet: "left", // W in DEXPI
    outlet: "right", // E in DEXPI
  },
  // For vertical flow (less common)
  vertical: {
    inlet: "top", // N in DEXPI
    outlet: "bottom", // S in DEXPI
  },
} as const;
