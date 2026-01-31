// Draw.io P&ID Symbol Configuration
// Data source: draw.io / diagrams.net P&ID stencil library
// 410 shapes across 15 categories with embedded connection points

// Types
export interface ConnectionPoint {
  name: string; // "N", "S", "E", "W", "NE", "NW", "SE", "SW"
  x: number; // 0-1 normalized (0 = left, 1 = right)
  y: number; // 0-1 normalized (0 = top, 1 = bottom)
  perimeter: boolean;
}

export interface DrawioShape {
  name: string;
  width: number;
  height: number;
  aspect: "fixed" | "variable";
  category: string;
  connection_points: ConnectionPoint[];
  text_elements?: Array<{
    content: string;
    x: number;
    y: number;
    align: string;
    valign: string;
    font_size: number;
  }>;
}

export interface DrawioCategory {
  library_name: string;
  source_file: string;
  shape_count: number;
  shapes: DrawioShape[];
}

export interface DrawioShapesData {
  metadata: {
    source: string;
    extracted_at: string;
    base_url: string;
    total_shapes: number;
    category_count: number;
  };
  categories: Record<string, DrawioCategory>;
}

// Cache for loaded data
let shapesDataCache: DrawioShapesData | null = null;

// Load shapes data (client-side fetch)
export async function loadShapesData(): Promise<DrawioShapesData> {
  if (shapesDataCache) {
    return shapesDataCache;
  }

  const response = await fetch("/drawio-symbols/shapes.json");
  if (!response.ok) {
    throw new Error(`Failed to load shapes data: ${response.status}`);
  }

  shapesDataCache = await response.json();
  return shapesDataCache!;
}

// Synchronous access to cached data (must call loadShapesData first)
export function getShapesData(): DrawioShapesData | null {
  return shapesDataCache;
}

// Get all category names
export function getCategoryNames(data: DrawioShapesData): string[] {
  return Object.keys(data.categories);
}

// Get category data
export function getCategory(
  data: DrawioShapesData,
  categoryName: string
): DrawioCategory | undefined {
  return data.categories[categoryName];
}

// Get all shapes in a category
export function getShapesByCategory(
  data: DrawioShapesData,
  categoryName: string
): DrawioShape[] {
  const category = data.categories[categoryName];
  return category?.shapes ?? [];
}

// Get a specific shape by category and name
export function getShape(
  data: DrawioShapesData,
  categoryName: string,
  shapeName: string
): DrawioShape | undefined {
  const shapes = getShapesByCategory(data, categoryName);
  return shapes.find((s) => s.name === shapeName);
}

// Get a shape by index within category
export function getShapeByIndex(
  data: DrawioShapesData,
  categoryName: string,
  index: number
): DrawioShape | undefined {
  const shapes = getShapesByCategory(data, categoryName);
  return shapes[index];
}

// Get SVG path for a shape
export function getSvgPath(categoryName: string, shapeName: string): string {
  // Convert shape name to filename format: "Centrifugal Pump 1" -> "Centrifugal_Pump_1.svg"
  const filename = shapeName.replace(/\s+/g, "_").replace(/[()]/g, "") + ".svg";
  return `/drawio-symbols/svgs/${categoryName}/${filename}`;
}

// Get connection points for a shape
export function getConnectionPoints(shape: DrawioShape): ConnectionPoint[] {
  return shape.connection_points ?? [];
}

// Convert connection point to React Flow position enum hint
// Returns the closest edge based on coordinates
export function getPositionHint(
  cp: ConnectionPoint
): "top" | "bottom" | "left" | "right" {
  const { x, y } = cp;

  // Determine closest edge
  const distTop = y;
  const distBottom = 1 - y;
  const distLeft = x;
  const distRight = 1 - x;

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) return "top";
  if (minDist === distBottom) return "bottom";
  if (minDist === distLeft) return "left";
  return "right";
}

// Category display names (more user-friendly)
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  instruments: "Instruments",
  pumps: "Pumps",
  valves: "Valves",
  vessels: "Vessels",
  heat_exchangers: "Heat Exchangers",
  compressors: "Compressors",
  filters: "Filters",
  separators: "Separators",
  fittings: "Fittings",
  piping: "Piping",
  flow_sensors: "Flow Sensors",
  agitators: "Agitators",
  crushers_grinding: "Crushers & Grinding",
  engines: "Engines & Motors",
  misc: "Miscellaneous",
};

// Get display name for a category
export function getCategoryDisplayName(categoryName: string): string {
  return CATEGORY_DISPLAY_NAMES[categoryName] ?? categoryName;
}

// Category order for toolbar display
export const CATEGORY_ORDER = [
  "vessels",
  "pumps",
  "compressors",
  "valves",
  "heat_exchangers",
  "separators",
  "filters",
  "instruments",
  "flow_sensors",
  "agitators",
  "engines",
  "crushers_grinding",
  "fittings",
  "piping",
  "misc",
];

// Get ordered categories
export function getOrderedCategories(data: DrawioShapesData): string[] {
  const available = new Set(getCategoryNames(data));
  const ordered = CATEGORY_ORDER.filter((cat) => available.has(cat));
  // Add any categories not in order list at the end
  const remaining = [...available].filter((cat) => !ordered.includes(cat));
  return [...ordered, ...remaining];
}
