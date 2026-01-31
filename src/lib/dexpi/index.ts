/**
 * DEXPI XML Bridge - Public API
 *
 * Provides bidirectional conversion between React Flow JSON and DEXPI XML format
 * for Block Flow Diagrams (BFD) and Process Flow Diagrams (PFD).
 */

// Types
export type {
  DexpiDocument,
  ProcessModel,
  ProcessStep,
  ProcessConnection,
  ExternalPort,
  Port,
  Parameter,
  StreamProperties,
  PhysicalQuantity,
  LayoutInfo,
  DexpiProcessStepType,
  DexpiConnectionType,
  DexpiFlowType,
  PortDirection,
  ProcessModelMetadata,
} from "./types";

export { DEXPI_NAMESPACE, DEXPI_VERSION, APPLICATION_SOURCE } from "./types";

// Mappings
export {
  nodeTypeToDexpi,
  dexpiToNodeType,
  edgeTypeToDexpi,
  dexpiToEdgeType,
  streamTypeToDexpiFlow,
  dexpiFlowToStreamType,
  detectModeFromNodeTypes,
  detectModeFromDexpiTypes,
  isNodeTypeSupported,
  isEdgeTypeSupported,
  BFD_NODE_TYPES,
  PFD_NODE_TYPES,
  componentClassToNodeType,
  getNodeTypeFromComponentClass,
} from "./mapping";

// Export (React Flow -> DEXPI)
export {
  reactFlowToDexpi,
  reactFlowToProcessModel,
  canExportToDexpi,
  getExportWarnings,
} from "./to-dexpi";
export type { ConvertOptions } from "./to-dexpi";

// Import (DEXPI -> React Flow)
export {
  dexpiToReactFlow,
  parseDexpiToModel,
  validateDexpiForImport,
} from "./from-dexpi";
export type { DexpiImportResult } from "./from-dexpi";

// XML Utilities
export { buildDexpiXml, parseDexpiXml, validateDexpiXml } from "./xml-utils";

// Version Detection & Legacy Support
export {
  detectDexpiVersion,
  parseDexpi1x,
  validateDexpi1x,
} from "./proteus-parser";
export type {
  DexpiVersionInfo,
  Dexpi1xValidationResult,
} from "./proteus-parser";
