/**
 * DEXPI Mapping - Bidirectional mappings between React Flow and DEXPI types
 */

import type { DexpiProcessStepType, DexpiConnectionType, DexpiFlowType } from "./types";

// ============================================================================
// Node Type Mappings (React Flow <-> DEXPI)
// ============================================================================

/**
 * Map React Flow node types to DEXPI ProcessStep types
 */
export const nodeTypeToDexpi: Record<string, DexpiProcessStepType> = {
  // BFD node types
  process_block: "Process/Process.GenericProcessStep",
  input_output: "Process/Process.ExternalPort",
  storage: "Process/Process.Storing",

  // PFD node types
  reactor: "Process/Process.Reacting",
  tank: "Process/Process.Storing",
  vessel: "Process/Process.Storing",
  pump: "Process/Process.TransportingLiquids",
  compressor: "Process/Process.Compressing",
  heat_exchanger: "Process/Process.HeatingCooling",
  column: "Process/Process.Separating",
  valve: "Process/Process.Throttling",
  mixer: "Process/Process.MixingMaterial",
  splitter: "Process/Process.Splitting",
};

/**
 * Map DEXPI ProcessStep types back to React Flow node types
 * Note: Some DEXPI types map to multiple React Flow types, so we include context hints
 */
export const dexpiToNodeType: Record<DexpiProcessStepType, string> = {
  "Process/Process.GenericProcessStep": "process_block",
  "Process/Process.ExternalPort": "input_output",
  "Process/Process.Storing": "storage", // Could be tank, vessel, or storage depending on mode
  "Process/Process.Reacting": "reactor",
  "Process/Process.Separating": "column",
  "Process/Process.Splitting": "splitter",
  "Process/Process.TransportingLiquids": "pump",
  "Process/Process.TransportingGases": "compressor",
  "Process/Process.Compressing": "compressor",
  "Process/Process.HeatingCooling": "heat_exchanger",
  "Process/Process.MixingMaterial": "mixer",
  "Process/Process.Throttling": "valve",
};

/**
 * More specific reverse mapping for PFD mode
 * Used when we need to distinguish between similar DEXPI types
 */
export const dexpiToNodeTypePfd: Record<string, string> = {
  "Process/Process.Storing:tank": "tank",
  "Process/Process.Storing:vessel": "vessel",
  "Process/Process.Storing:storage": "storage",
};

// ============================================================================
// Edge Type Mappings (React Flow <-> DEXPI)
// ============================================================================

/**
 * Map React Flow edge types to DEXPI Connection types
 */
export const edgeTypeToDexpi: Record<string, DexpiConnectionType> = {
  // Stream types
  material_stream: "Process/Process.MaterialFlow",
  energy_stream: "Process/Process.EnergyFlow",
  utility_stream: "Process/Process.UtilityFlow",
  signal: "Process/Process.InformationFlow",

  // Generic types (default to material)
  stream: "Process/Process.MaterialFlow",
  default: "Process/Process.MaterialFlow",
  arrow: "Process/Process.MaterialFlow",
  dashed: "Process/Process.EnergyFlow",
};

/**
 * Map DEXPI Connection types back to React Flow edge types
 */
export const dexpiToEdgeType: Record<DexpiConnectionType, string> = {
  "Process/Process.MaterialFlow": "material_stream",
  "Process/Process.EnergyFlow": "energy_stream",
  "Process/Process.UtilityFlow": "utility_stream",
  "Process/Process.InformationFlow": "signal",
};

// ============================================================================
// Flow Type Mappings
// ============================================================================

/**
 * Map stream type strings to DEXPI flow types
 */
export const streamTypeToDexpiFlow: Record<string, DexpiFlowType> = {
  material: "material",
  energy: "energy",
  utility: "utility",
  signal: "information",
};

/**
 * Map DEXPI flow types back to stream type strings
 */
export const dexpiFlowToStreamType: Record<DexpiFlowType, string> = {
  material: "material",
  energy: "energy",
  utility: "utility",
  information: "signal",
};

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * BFD-specific node types
 */
export const BFD_NODE_TYPES = new Set(["process_block", "input_output", "storage"]);

/**
 * PFD-specific node types
 */
export const PFD_NODE_TYPES = new Set([
  "reactor",
  "tank",
  "vessel",
  "pump",
  "compressor",
  "heat_exchanger",
  "column",
  "valve",
  "mixer",
  "splitter",
]);

/**
 * DEXPI types that indicate BFD mode
 */
export const BFD_DEXPI_TYPES = new Set([
  "Process/Process.GenericProcessStep",
  "Process/Process.ExternalPort",
]);

/**
 * Detect diagram mode from node types
 */
export function detectModeFromNodeTypes(nodeTypes: string[]): "bfd" | "pfd" | "playground" {
  const hasBfdTypes = nodeTypes.some((t) => BFD_NODE_TYPES.has(t));
  const hasPfdTypes = nodeTypes.some((t) => PFD_NODE_TYPES.has(t));

  if (hasPfdTypes) return "pfd";
  if (hasBfdTypes) return "bfd";
  return "playground";
}

/**
 * Detect diagram mode from DEXPI ProcessStep types
 */
export function detectModeFromDexpiTypes(dexpiTypes: DexpiProcessStepType[]): "bfd" | "pfd" {
  const hasBfdTypes = dexpiTypes.some((t) => BFD_DEXPI_TYPES.has(t));
  const hasPfdTypes = dexpiTypes.some((t) => !BFD_DEXPI_TYPES.has(t));

  // If we have PFD-specific types, it's PFD
  if (hasPfdTypes && !hasBfdTypes) return "pfd";
  // If we only have BFD types or mixed, default to BFD
  return "bfd";
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a node type is supported for DEXPI export
 */
export function isNodeTypeSupported(nodeType: string): boolean {
  return nodeType in nodeTypeToDexpi;
}

/**
 * Check if an edge type is supported for DEXPI export
 */
export function isEdgeTypeSupported(edgeType: string): boolean {
  return edgeType in edgeTypeToDexpi;
}

/**
 * Get fallback node type for unknown DEXPI types
 */
export function getFallbackNodeType(mode: "bfd" | "pfd"): string {
  return mode === "pfd" ? "vessel" : "process_block";
}

/**
 * Get fallback edge type for unknown DEXPI connection types
 */
export function getFallbackEdgeType(): string {
  return "material_stream";
}
