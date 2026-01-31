/**
 * DEXPI XML Bridge - Public API
 *
 * Provides bidirectional conversion between React Flow JSON and DEXPI XML format
 * for Block Flow Diagrams (BFD) and Process Flow Diagrams (PFD).
 */

// Types
export type {
  DexpiConnectionType,
  DexpiDocument,
  DexpiFlowType,
  DexpiProcessStepType,
  ExternalPort,
  InlineComponent,
  LayoutInfo,
  Parameter,
  PhysicalQuantity,
  Port,
  PortDirection,
  ProcessConnection,
  ProcessModel,
  ProcessModelMetadata,
  ProcessStep,
  StreamProperties,
} from "./types";

export { APPLICATION_SOURCE, DEXPI_NAMESPACE, DEXPI_VERSION } from "./types";

// Mappings
export {
  BFD_NODE_TYPES,
  PFD_NODE_TYPES,
  componentClassToNodeType,
  detectModeFromDexpiTypes,
  detectModeFromNodeTypes,
  dexpiFlowToStreamType,
  dexpiToEdgeType,
  dexpiToNodeType,
  edgeTypeToDexpi,
  getNodeTypeFromComponentClass,
  isEdgeTypeSupported,
  isNodeTypeSupported,
  nodeTypeToDexpi,
  streamTypeToDexpiFlow,
} from "./mapping";

// Export (React Flow -> DEXPI)
export {
  canExportToDexpi,
  getExportWarnings,
  reactFlowToDexpi,
  reactFlowToProcessModel,
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
  Dexpi1xValidationResult,
  DexpiVersionInfo,
} from "./proteus-parser";
