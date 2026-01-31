/**
 * DEXPI Mapping - Bidirectional mappings between React Flow and DEXPI types
 */

import type {
  DexpiConnectionType,
  DexpiFlowType,
  DexpiProcessStepType,
} from "./types";

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

  // P&ID node types (DEXPI category-based)
  pumps: "Process/Process.TransportingLiquids",
  pumps_iso: "Process/Process.TransportingLiquids",
  pumps_din: "Process/Process.TransportingLiquids",
  compressors: "Process/Process.Compressing",
  compressors_iso: "Process/Process.Compressing",
  vessels: "Process/Process.Storing",
  separators: "Process/Process.Separating",
  heat_exchangers: "Process/Process.HeatingCooling",
  mixers: "Process/Process.MixingMaterial",
  agitators: "Process/Process.MixingMaterial",
  filters: "Process/Process.Separating",
  centrifuges: "Process/Process.Separating",
  driers: "Process/Process.HeatingCooling",
  valves: "Process/Process.Throttling",
  instruments: "Process/Process.GenericProcessStep",
  flow_sensors: "Process/Process.GenericProcessStep",
  fittings: "Process/Process.GenericProcessStep",
  piping: "Process/Process.GenericProcessStep",
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
export const BFD_NODE_TYPES = new Set([
  "process_block",
  "input_output",
  "storage",
]);

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
export function detectModeFromNodeTypes(
  nodeTypes: string[]
): "bfd" | "pfd" | "playground" {
  const hasBfdTypes = nodeTypes.some((t) => BFD_NODE_TYPES.has(t));
  const hasPfdTypes = nodeTypes.some((t) => PFD_NODE_TYPES.has(t));

  if (hasPfdTypes) return "pfd";
  if (hasBfdTypes) return "bfd";
  return "playground";
}

/**
 * Detect diagram mode from DEXPI ProcessStep types
 */
export function detectModeFromDexpiTypes(
  dexpiTypes: DexpiProcessStepType[]
): "bfd" | "pfd" {
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
export function getFallbackNodeType(
  mode: "bfd" | "pfd" | "pid" | "playground"
): string {
  if (mode === "pid") return "vessels"; // DEXPI node type for P&ID mode
  if (mode === "pfd") return "vessel";
  if (mode === "bfd") return "process_block";
  return "process_block"; // playground fallback
}

/**
 * Get fallback edge type for unknown DEXPI connection types
 */
export function getFallbackEdgeType(): string {
  return "material_stream";
}

// ============================================================================
// DEXPI 1.x (Proteus Schema) ComponentClass Mappings
// ============================================================================

/**
 * Map DEXPI 1.x ComponentClass values to DEXPI Category names
 * These categories match the DEXPI_CATEGORIES in dexpi-config.ts
 * Used for P&ID mode to render proper SVG symbols
 */
export const componentClassToDexpiCategory: Record<string, string> = {
  // Pumps -> Pumps_ISO (uses ISO standard symbols)
  CentrifugalPump: "Pumps_ISO",
  PositiveDisplacementPump: "Pumps_ISO",
  Pump: "Pumps_ISO",
  ReciprocatingPump: "Pumps_ISO",
  DiaphragmPump: "Pumps_ISO",
  GearPump: "Pumps_ISO",
  ScrewPump: "Pumps_ISO",

  // Compressors -> Compressors_ISO
  Compressor: "Compressors_ISO",
  CentrifugalCompressor: "Compressors_ISO",
  PositiveDisplacementCompressor: "Compressors_ISO",
  ReciprocatingCompressor: "Compressors_ISO",
  ScrewCompressor: "Compressors_ISO",
  Blower: "Compressors_ISO",
  Fan: "Compressors_ISO",

  // Vessels and Tanks -> Vessels
  Vessel: "Vessels",
  PressureVessel: "Vessels",
  Tank: "Vessels",
  StorageTank: "Vessels",
  Drum: "Vessels",
  Accumulator: "Vessels",
  Receiver: "Vessels",

  // Heat Exchangers -> Heat_Exchangers
  HeatExchanger: "Heat_Exchangers",
  ShellandTubeHeatExchanger: "Heat_Exchangers",
  TubularHeatExchanger: "Heat_Exchangers",
  PlateHeatExchanger: "Heat_Exchangers",
  AirCooler: "Heat_Exchangers",
  Cooler: "Heat_Exchangers",
  Heater: "Heat_Exchangers",
  Condenser: "Heat_Exchangers",
  Reboiler: "Heat_Exchangers",
  Evaporator: "Heat_Exchangers",

  // Columns and Separators -> Separators
  Column: "Separators",
  DistillationColumn: "Separators",
  AbsorptionColumn: "Separators",
  PackedColumn: "Separators",
  Separator: "Separators",
  GasLiquidSeparator: "Separators",
  Cyclone: "Separators",
  Scrubber: "Separators",

  // Filters -> Filters
  Filter: "Filters",
  Strainer: "Filters",

  // Mixers -> Mixers
  Mixer: "Mixers",
  StaticMixer: "Mixers",

  // Agitators -> Agitators
  Agitator: "Agitators",
  Stirrer: "Agitators",

  // Valves -> Valves
  Valve: "Valves",
  ControlValve: "Valves",
  CheckValve: "Valves",
  SwingCheckValve: "Valves",
  GateValve: "Valves",
  GlobeValve: "Valves",
  BallValve: "Valves",
  ButterflyValve: "Valves",
  SafetyValve: "Valves",
  SpringLoadedGlobeSafetyValve: "Valves",
  PressureReliefValve: "Valves",

  // Fittings -> Fittings
  PipeReducer: "Fittings",
  PipeTee: "Fittings",
  BlindFlange: "Fittings",
  Flange: "Fittings",

  // Reactors -> Vessels (use vessel symbol for reactors)
  Reactor: "Vessels",
  ShellandTubeReactor: "Vessels",
  FixedBedReactor: "Vessels",
  FluidizedBedReactor: "Vessels",
  ContinuousStirredTankReactor: "Vessels",
  PlugFlowReactor: "Vessels",
};

/**
 * Get DEXPI category name from ComponentClass
 * Returns undefined if no mapping found
 */
export function getDexpiCategoryFromComponentClass(
  componentClass: string
): string | undefined {
  // Try exact match first
  const exactMatch = componentClassToDexpiCategory[componentClass];
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lowerClass = componentClass.toLowerCase();
  for (const [key, value] of Object.entries(componentClassToDexpiCategory)) {
    if (key.toLowerCase() === lowerClass) {
      return value;
    }
  }

  return undefined;
}

/**
 * Get DEXPI node type from ComponentClass (for P&ID mode)
 * Returns the node type string (e.g., "pumps_iso") and category name
 */
export function getDexpiNodeTypeFromComponentClass(
  componentClass: string
): { nodeType: string; category: string } | undefined {
  const category = getDexpiCategoryFromComponentClass(componentClass);
  if (!category) return undefined;

  // Convert category to node type (lowercase with underscores)
  const nodeType = category.toLowerCase().replace(/\s+/g, "_");
  return { nodeType, category };
}

/**
 * Map DEXPI 1.x ComponentClass values to React Flow node types
 * These are the equipment classes used in DEXPI 1.3/1.4 (Proteus Schema)
 */
export const componentClassToNodeType: Record<string, string> = {
  // Pumps
  CentrifugalPump: "pump",
  PositiveDisplacementPump: "pump",
  Pump: "pump",
  ReciprocatingPump: "pump",

  // Compressors
  Compressor: "compressor",
  CentrifugalCompressor: "compressor",
  PositiveDisplacementCompressor: "compressor",

  // Vessels and Tanks
  Vessel: "vessel",
  PressureVessel: "vessel",
  Tank: "tank",
  StorageTank: "tank",
  Drum: "vessel",

  // Reactors
  Reactor: "reactor",
  ShellandTubeReactor: "reactor",
  FixedBedReactor: "reactor",
  FluidizedBedReactor: "reactor",

  // Heat Exchangers
  HeatExchanger: "heat_exchanger",
  ShellandTubeHeatExchanger: "heat_exchanger",
  TubularHeatExchanger: "heat_exchanger",
  PlateHeatExchanger: "heat_exchanger",
  AirCooler: "heat_exchanger",
  Cooler: "heat_exchanger",
  Heater: "heat_exchanger",

  // Columns and Separators
  Column: "column",
  DistillationColumn: "column",
  AbsorptionColumn: "column",
  PackedColumn: "column",
  Separator: "column",
  GasLiquidSeparator: "column",
  Filter: "column",

  // Mixers
  Mixer: "mixer",
  StaticMixer: "mixer",

  // Valves
  Valve: "valve",
  ControlValve: "valve",
  CheckValve: "valve",
  SwingCheckValve: "valve",
  GlobeValve: "valve",
  BallValve: "valve",
  ButterflyValve: "valve",
  GateValve: "valve",
  SafetyValve: "valve",
  SpringLoadedGlobeSafetyValve: "valve",

  // Fittings (map to process_block for now)
  PipeReducer: "process_block",
  PipeTee: "process_block",
  BlindFlange: "process_block",
  Flange: "process_block",

  // Generic fallbacks
  Equipment: "process_block",
};

/**
 * Get React Flow node type from DEXPI 1.x ComponentClass
 */
export function getNodeTypeFromComponentClass(
  componentClass: string,
  mode: "bfd" | "pfd" = "pfd"
): string {
  const mappedType = componentClassToNodeType[componentClass];
  if (mappedType) return mappedType;

  // Try case-insensitive match
  const lowerClass = componentClass.toLowerCase();
  for (const [key, value] of Object.entries(componentClassToNodeType)) {
    if (key.toLowerCase() === lowerClass) {
      return value;
    }
  }

  return getFallbackNodeType(mode);
}

// ============================================================================
// DEXPI Symbol Index Mappings
// Maps ComponentClass to specific symbol index within a category
// ============================================================================

/**
 * Map ComponentClass values to specific symbol indices within DEXPI categories
 * These indices correspond to specific SVG symbols in dexpi-mapping.json
 */
export const componentClassToSymbolIndex: Record<string, number> = {
  // Valves - indices from dexpi-mapping.json Valves category
  Valve: 0, // Generic valve
  GateValve: 1,
  GlobeValve: 2,
  BallValve: 3,
  ButterflyValve: 4,
  CheckValve: 5,
  SwingCheckValve: 5, // Also a check valve
  PlugValve: 6,
  NeedleValve: 7,
  DiaphragmValve: 8,
  PinchValve: 9,
  SafetyValve: 10,
  SpringLoadedGlobeSafetyValve: 10, // Safety valve
  PressureReliefValve: 10, // Safety valve
  ControlValve: 11,
  ThreeWayValve: 12,
};

/**
 * Get the symbol index for a ComponentClass within its category
 * Returns 0 (default/generic symbol) if no specific mapping exists
 */
export function getSymbolIndexFromComponentClass(
  componentClass: string
): number {
  // Try exact match first
  if (componentClass in componentClassToSymbolIndex) {
    return componentClassToSymbolIndex[componentClass];
  }

  // Try case-insensitive match
  const lowerClass = componentClass.toLowerCase();
  for (const [key, value] of Object.entries(componentClassToSymbolIndex)) {
    if (key.toLowerCase() === lowerClass) {
      return value;
    }
  }

  // Default to first symbol (generic) in the category
  return 0;
}
