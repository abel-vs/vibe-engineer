// DEXPI configuration and helpers for PFD mode
// Based on DEXPI P&ID Specification 1.4 / DEXPI 2.0

import dexpiMappingData from "./dexpi-mapping.json";

// Types
export interface DexpiSymbol {
  filename: string;
  path: string;
  dexpi_subclass: string;
  description: string;
}

export interface DexpiCategory {
  dexpi_class: string;
  dexpi_uri: string | null;
  parent_class: string;
  iso_reference: string;
  description: string;
  subtypes: string[];
  svg_count: number;
  symbols: DexpiSymbol[];
}

export interface DexpiMapping {
  version: string;
  created: string;
  dexpi_specification: string;
  source: string;
  total_symbols: number;
  total_categories: number;
  categories: Record<string, DexpiCategory>;
  dexpi_class_hierarchy: Record<string, { uri: string; children: string[] }>;
  statistics: {
    by_parent_class: Record<string, number>;
    by_category: Record<string, number>;
  };
}

// Cast the imported JSON to our type
export const DEXPI_MAPPING = dexpiMappingData as DexpiMapping;

// Get all category names
export const DEXPI_CATEGORIES = Object.keys(DEXPI_MAPPING.categories);

// Category key type (e.g., "Pumps", "Vessels")
export type DexpiCategoryKey = keyof typeof DEXPI_MAPPING.categories;

// Convert category name to node type (lowercase with underscores)
export function categoryToNodeType(categoryName: string): string {
  return categoryName.toLowerCase().replace(/\s+/g, "_");
}

// Convert node type back to category name
export function nodeTypeToCategory(nodeType: string): string | undefined {
  // Direct match first
  if (DEXPI_MAPPING.categories[nodeType]) {
    return nodeType;
  }

  // Try to find by case-insensitive match
  const lowerNodeType = nodeType.toLowerCase();
  return DEXPI_CATEGORIES.find(
    (cat) =>
      cat.toLowerCase() === lowerNodeType ||
      categoryToNodeType(cat) === lowerNodeType
  );
}

// Get category data by name
export function getCategory(categoryName: string): DexpiCategory | undefined {
  return DEXPI_MAPPING.categories[categoryName];
}

// Get all symbols for a category
export function getCategorySymbols(categoryName: string): DexpiSymbol[] {
  const category = getCategory(categoryName);
  return category?.symbols ?? [];
}

// Get symbol count for a category
export function getSymbolCount(categoryName: string): number {
  const category = getCategory(categoryName);
  return category?.svg_count ?? 0;
}

// Get default symbol (index 0) for a category
export function getDefaultSymbol(
  categoryName: string
): DexpiSymbol | undefined {
  const symbols = getCategorySymbols(categoryName);
  return symbols[0];
}

// Get a specific symbol by category and index
export function getSymbol(
  categoryName: string,
  index: number
): DexpiSymbol | undefined {
  const symbols = getCategorySymbols(categoryName);
  return symbols[index];
}

// Get the public path for an SVG symbol
// The symbols are stored in /public/symbols/{CategoryName}/{filename}
export function getSymbolPath(categoryName: string, index: number = 0): string {
  const symbol = getSymbol(categoryName, index);
  if (!symbol) {
    return "";
  }
  // The path in JSON is "Process_Engineering/CategoryName/filename.svg"
  // We store at /public/symbols/CategoryName/filename.svg
  // So we need to strip "Process_Engineering/" prefix
  const relativePath = symbol.path.replace("Process_Engineering/", "");
  return `/symbols/${relativePath}`;
}

// Get the public path from a DexpiSymbol
export function getSymbolPathFromSymbol(symbol: DexpiSymbol): string {
  const relativePath = symbol.path.replace("Process_Engineering/", "");
  return `/symbols/${relativePath}`;
}

// Get formatted display name for a category
export function getCategoryDisplayName(categoryName: string): string {
  // Convert underscores to spaces and handle special cases
  return categoryName
    .replace(/_/g, " ")
    .replace(/ISO$/, "(ISO)")
    .replace(/DIN$/, "(DIN)");
}

// Get DEXPI class name for a category
export function getDexpiClass(categoryName: string): string {
  const category = getCategory(categoryName);
  return category?.dexpi_class ?? categoryName;
}

// Get parent class for a category (Equipment, PipingComponent, Instrumentation)
export function getParentClass(categoryName: string): string {
  const category = getCategory(categoryName);
  return category?.parent_class ?? "Equipment";
}

// Group categories by parent class
export function getCategoriesByParentClass(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const [name, category] of Object.entries(DEXPI_MAPPING.categories)) {
    const parent = category.parent_class;
    if (!grouped[parent]) {
      grouped[parent] = [];
    }
    grouped[parent].push(name);
  }

  return grouped;
}

// PFD equipment categories (no valves, no instruments per engineering standards)
// PFD shows actual equipment with operating conditions but NOT instrumentation
export const PFD_EQUIPMENT_CATEGORIES = [
  "Vessels",
  "Separators",
  "Pumps",
  "Pumps_ISO",
  "Pumps_DIN",
  "Compressors",
  "Compressors_ISO",
  "Heat_Exchangers",
  "Mixers",
  "Agitators",
  "Filters",
  "Centrifuges",
  "Driers",
  "Crushers_Grinding",
  "Feeders",
  "Shaping_Machines",
  "Engines",
  "Apparatus_Elements",
  "Misc",
];

// P&ID adds valves, instruments, fittings, piping details to PFD equipment
export const PID_ONLY_CATEGORIES = [
  "Valves",
  "Instruments",
  "Flow_Sensors",
  "Fittings",
  "Piping",
];

// Get node types for PFD mode (equipment only, no valves/instruments)
export function getPfdNodeTypes(): string[] {
  return PFD_EQUIPMENT_CATEGORIES.map(categoryToNodeType);
}

// Get all node types for P&ID mode (full DEXPI equipment including valves and instruments)
export function getPidNodeTypes(): string[] {
  return DEXPI_CATEGORIES.map(categoryToNodeType);
}

// Check if a node type is a DEXPI type
export function isDexpiNodeType(nodeType: string): boolean {
  return nodeTypeToCategory(nodeType) !== undefined;
}

// Configuration for toolbar display - order and grouping
export const TOOLBAR_CATEGORY_ORDER = [
  // Equipment - Vessels & Tanks
  "Vessels",
  "Separators",
  // Equipment - Rotating
  "Pumps",
  "Pumps_ISO",
  "Pumps_DIN",
  "Compressors",
  "Compressors_ISO",
  "Agitators",
  "Centrifuges",
  // Equipment - Heat Transfer
  "Heat_Exchangers",
  "Driers",
  // Equipment - Size Reduction & Mixing
  "Crushers_Grinding",
  "Mixers",
  "Feeders",
  "Filters",
  "Shaping_Machines",
  // Equipment - Other
  "Engines",
  "Apparatus_Elements",
  "Misc",
  // Piping
  "Valves",
  "Fittings",
  "Piping",
  // Instrumentation
  "Instruments",
  "Flow_Sensors",
];

// Get ordered categories for toolbar
export function getOrderedCategories(): string[] {
  // Return categories in toolbar order, filtering out any that don't exist
  const ordered = TOOLBAR_CATEGORY_ORDER.filter(
    (cat) => DEXPI_MAPPING.categories[cat] !== undefined
  );

  // Add any categories not in the order list at the end
  const remaining = DEXPI_CATEGORIES.filter((cat) => !ordered.includes(cat));

  return [...ordered, ...remaining];
}

// ============================================
// SIMPLIFIED PFD MODE - One symbol per category
// ============================================
// PFD mode uses generic equipment symbols (one per type)
// Specific details are added via labels/properties

export interface SimplifiedPfdEquipment {
  nodeType: string;
  label: string;
  description: string;
  category: string;
  symbolIndex: number; // Index of the representative symbol in the category
}

// Define simplified PFD equipment with one representative DEXPI symbol per category
export const SIMPLIFIED_PFD_EQUIPMENT: SimplifiedPfdEquipment[] = [
  {
    nodeType: "pfd_vessel",
    label: "Vessel",
    description: "Tanks, reactors, columns, drums",
    category: "Vessels",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_pump",
    label: "Pump",
    description: "All pump types",
    category: "Pumps_ISO",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_compressor",
    label: "Compressor",
    description: "Compressors and blowers",
    category: "Compressors_ISO",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_exchanger",
    label: "Heat Exchanger",
    description: "Heat exchangers, coolers, condensers",
    category: "Heat_Exchangers",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_separator",
    label: "Separator",
    description: "Separators, cyclones, scrubbers",
    category: "Separators",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_mixer",
    label: "Mixer",
    description: "Mixers and blenders",
    category: "Mixers",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_filter",
    label: "Filter",
    description: "Filters and strainers",
    category: "Filters",
    symbolIndex: 0,
  },
  {
    nodeType: "pfd_agitator",
    label: "Agitator",
    description: "Agitators and stirrers",
    category: "Agitators",
    symbolIndex: 0,
  },
];

// Get simplified PFD node types
export function getSimplifiedPfdNodeTypes(): string[] {
  return SIMPLIFIED_PFD_EQUIPMENT.map((eq) => eq.nodeType);
}

// Get the DEXPI symbol path for a simplified PFD node type
export function getSimplifiedPfdSymbolPath(nodeType: string): string {
  const equipment = SIMPLIFIED_PFD_EQUIPMENT.find(
    (eq) => eq.nodeType === nodeType
  );
  if (!equipment) return "";
  return getSymbolPath(equipment.category, equipment.symbolIndex);
}

// Get equipment info for a simplified PFD node type
export function getSimplifiedPfdEquipment(
  nodeType: string
): SimplifiedPfdEquipment | undefined {
  return SIMPLIFIED_PFD_EQUIPMENT.find((eq) => eq.nodeType === nodeType);
}
