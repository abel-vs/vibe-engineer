/**
 * STYLING CONFIGURATION
 *
 * This module defines styling rules for different diagram modes and visual styles.
 * The application has two orthogonal styling dimensions:
 *
 * 1. DIAGRAM MODE (workspace type) - Controls available equipment and conventions:
 *    - Playground, BFD, PFD, P&ID
 *
 * 2. DIAGRAM STYLE (visual appearance) - Controls colors and rendering:
 *    - Colorful, Engineering
 *
 * ============================================================================
 * WORKSPACE-SPECIFIC STYLING RULES
 * ============================================================================
 *
 * PLAYGROUND MODE
 * ---------------
 * Purpose: Free-form diagramming with basic shapes
 * Nodes:
 *   - Colorful nodes with shadows and rounded corners
 *   - Basic shapes: rectangle, circle, diamond, triangle, text
 * Edges:
 *   - Curved bezier paths
 *   - Boxed labels with colored borders and shadows
 *   - Stream type differentiation by color (material=blue, energy=red, etc.)
 * Labels:
 *   - Boxed with white background and gray border
 *   - Optional - not required for connections
 *
 * BFD (Block Flow Diagram) MODE
 * -----------------------------
 * Purpose: High-level process overview with blocks representing unit operations
 * Nodes:
 *   - process_block: Equipment/process units (Reactor, Dryer, Filter, etc.)
 *   - input_output: Text labels for system boundaries
 *   - storage: Tanks and vessels for holding materials
 * Edges:
 *   - Material, energy, utility, and signal streams
 *   - Boxed labels showing flow rates (e.g., "150,000 kg/hr")
 *   - Stream differentiation by color/dash pattern
 * Labels:
 *   - Flow rates and temperatures as EDGE labels
 *   - Short descriptive names on nodes
 * Layout:
 *   - Main process flow runs LEFT to RIGHT
 *   - Inputs enter from left/top, outputs exit right/bottom
 *
 * PFD (Process Flow Diagram) MODE
 * -------------------------------
 * Purpose: Generic equipment with operating conditions
 * Nodes:
 *   - DEXPI standard symbols (one generic per category)
 *   - Equipment types: vessel, pump, compressor, exchanger, separator, mixer, filter
 *   - Equipment tag numbers (e.g., V-101, P-201, E-301)
 * Edges:
 *   - Material, energy, and utility streams
 *   - Boxed labels with stream numbers and operating conditions
 *   - Stream numbers required (S-1, S-2, etc.)
 * Labels:
 *   - Boxed labels with white background
 *   - Include temperature, pressure, flow rates on streams
 * Restrictions:
 *   - NO individual valves (P&ID detail)
 *   - NO instruments or control loops (P&ID detail)
 *
 * P&ID (Piping & Instrumentation Diagram) MODE
 * --------------------------------------------
 * Purpose: Complete diagram with all pipes, valves, instruments, control loops
 * Nodes:
 *   - Full DEXPI symbol library (ISO 10628-2:2012)
 *   - All equipment categories: Vessels, Pumps, Compressors, Heat Exchangers,
 *     Valves, Filters, Separators, Instruments, Flow Sensors, Fittings, Piping
 *   - Inline components: valves, instruments on pipe lines
 *   - Equipment tag numbers and instrument tags (FT, PT, LT, TT, FIC, PIC, etc.)
 * Edges:
 *   - Material, energy, utility, and signal streams
 *   - Straight 90-degree pipe routing (engineering style)
 *   - Pipe line numbers with size and material class (e.g., 4"-CS-101)
 * Labels:
 *   - FLOATING TEXT close to pipe lines (NO boxes) - per P&ID convention
 *   - Line numbers displayed inline with pipes
 *   - Smaller font size (10px) positioned above edge path
 * Control:
 *   - Control loops showing transmitter → controller → valve relationships
 *   - Signal edges for instrumentation connections
 *
 * ============================================================================
 * VISUAL STYLE CONFIGURATIONS
 * ============================================================================
 *
 * COLORFUL STYLE
 * --------------
 * - Vibrant colors with distinctive shapes
 * - Nodes: White background, gray border, blue selection, rounded corners, shadows
 * - Edges: Blue stroke, curved bezier paths
 * - Canvas: Light gray background with dot grid
 * - Stream types differentiated by color (blue, red, purple, cyan)
 *
 * ENGINEERING STYLE
 * -----------------
 * - Professional black/white technical drawing style
 * - Nodes: White background, black border, no shadows, square corners
 * - Edges: Black stroke, straight 90-degree routing
 * - Canvas: White background with line grid
 * - Stream types differentiated by dash pattern (solid, dashed, dotted)
 * - Properties shown on nodes
 * - Simplified shapes for technical clarity
 */

import type { DiagramMode } from "./modes";

export type DiagramStyle = "colorful" | "engineering";

// ============================================================================
// EDGE LABEL STYLING BY DIAGRAM MODE
// ============================================================================
// Different diagram types have different conventions for stream/pipe labels:
// - P&ID: Floating text labels close to pipe lines (no boxes)
// - PFD: Boxed labels with stream numbers and operating conditions
// - BFD: Boxed labels with flow rates
// - Playground: Colorful boxed labels

export interface EdgeLabelStyleConfig {
  /** Whether to show a box/border around the label */
  showBox: boolean;
  /** Background color for the label */
  background: string;
  /** Border style (CSS border shorthand, or "none") */
  border: string;
  /**
   * Perpendicular offset from edge path in pixels.
   * Applied perpendicular to the edge direction:
   * - For horizontal edges: positive = above the edge
   * - For vertical edges: positive = left of the edge
   * Labels are also rotated to follow vertical edge direction.
   */
  labelOffset: number;
  /** Tailwind font size class */
  fontSize: string;
  /** Additional description for documentation */
  description: string;
}

/**
 * Edge label styling configuration per diagram mode.
 * These settings control how stream/pipe labels are rendered.
 *
 * For P&ID mode, labels are positioned directly on the edge path and rotated
 * to follow the pipe direction (90 degrees for vertical pipes).
 */
export const EDGE_LABEL_BY_MODE: Record<DiagramMode, EdgeLabelStyleConfig> = {
  pid: {
    showBox: false,
    background: "transparent",
    border: "none",
    labelOffset: 8, // Small offset perpendicular to edge
    fontSize: "text-[10px]",
    description:
      "Floating text close to pipe lines - per P&ID engineering convention",
  },
  pfd: {
    showBox: true,
    background: "#ffffff",
    border: "1px solid",
    labelOffset: 0,
    fontSize: "text-xs",
    description: "Boxed labels with stream numbers and operating conditions",
  },
  bfd: {
    showBox: true,
    background: "#ffffff",
    border: "1px solid",
    labelOffset: 0,
    fontSize: "text-xs",
    description: "Boxed labels showing flow rates and stream identification",
  },
  playground: {
    showBox: true,
    background: "#ffffff",
    border: "1px solid",
    labelOffset: 0,
    fontSize: "text-xs",
    description: "Colorful boxed labels with shadows",
  },
};

/**
 * Get edge label style configuration for a specific mode.
 */
export function getEdgeLabelConfig(mode: DiagramMode): EdgeLabelStyleConfig {
  return EDGE_LABEL_BY_MODE[mode];
}

// ============================================================================
// DIAGRAM STYLE CONFIGURATION
// ============================================================================

export interface StyleConfig {
  id: DiagramStyle;
  name: string;
  description: string;
  node: {
    background: string;
    border: string;
    borderSelected: string;
    text: string;
    textSecondary: string;
    shadow: string;
    borderRadius: string;
    handleBg: string;
    width?: number;
    height?: number;
  };
  edge: {
    stroke: string;
    strokeWidth: number;
    labelBg: string;
    labelBorder: string;
  };
  canvas: {
    background: string;
    gridColor: string;
    backgroundVariant: "dots" | "lines" | "cross";
    gridGap: number;
  };
  showPropertiesOnNode: boolean;
  simplifyShapes: boolean;
}

export const STYLES: Record<DiagramStyle, StyleConfig> = {
  colorful: {
    id: "colorful",
    name: "Colorful",
    description: "Vibrant colors with distinctive shapes",
    node: {
      background: "#ffffff",
      border: "#9ca3af",
      borderSelected: "#3b82f6",
      text: "#1f2937",
      textSecondary: "#6b7280",
      shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      borderRadius: "0.5rem",
      handleBg: "#3b82f6",
    },
    edge: {
      stroke: "#3b82f6",
      strokeWidth: 2,
      labelBg: "#ffffff",
      labelBorder: "#d1d5db",
    },
    canvas: {
      background: "#f9fafb",
      gridColor: "#d1d5db",
      backgroundVariant: "dots",
      gridGap: 20,
    },
    showPropertiesOnNode: false,
    simplifyShapes: false,
  },
  engineering: {
    id: "engineering",
    name: "Engineering",
    description: "Professional black/white technical drawing style",
    node: {
      background: "#ffffff",
      border: "#000000",
      borderSelected: "#3b82f6",
      text: "#000000",
      textSecondary: "#4b5563",
      shadow: "none",
      borderRadius: "0",
      handleBg: "#000000",
      // width/height are auto-snapped to grid in engineering-node.tsx
    },
    edge: {
      stroke: "#000000",
      strokeWidth: 2,
      labelBg: "#ffffff",
      labelBorder: "#000000",
    },
    canvas: {
      background: "#ffffff",
      gridColor: "#e5e7eb",
      backgroundVariant: "lines",
      gridGap: 30,
    },
    showPropertiesOnNode: true,
    simplifyShapes: true,
  },
};

export function getStyleConfig(style: DiagramStyle): StyleConfig {
  return STYLES[style];
}
