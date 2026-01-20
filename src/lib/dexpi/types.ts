/**
 * DEXPI XML 2.0 Type Definitions
 * Based on DEXPI Process Specification for Block Flow Diagrams (BFD) and Process Flow Diagrams (PFD)
 */

// ============================================================================
// DEXPI Process Step Types (matching DEXPI 2.0 specification)
// ============================================================================

export type DexpiProcessStepType =
  // Generic
  | "Process/Process.GenericProcessStep"
  // BFD Types
  | "Process/Process.ExternalPort"
  | "Process/Process.Storing"
  // PFD Types - Reactions
  | "Process/Process.Reacting"
  // PFD Types - Separation
  | "Process/Process.Separating"
  | "Process/Process.Splitting"
  // PFD Types - Transport
  | "Process/Process.TransportingLiquids"
  | "Process/Process.TransportingGases"
  | "Process/Process.Compressing"
  // PFD Types - Heat Transfer
  | "Process/Process.HeatingCooling"
  // PFD Types - Mixing
  | "Process/Process.MixingMaterial"
  // PFD Types - Flow Control
  | "Process/Process.Throttling";

// ============================================================================
// DEXPI Flow Types
// ============================================================================

export type DexpiFlowType = "material" | "energy" | "utility" | "information";

export type DexpiConnectionType =
  | "Process/Process.MaterialFlow"
  | "Process/Process.EnergyFlow"
  | "Process/Process.UtilityFlow"
  | "Process/Process.InformationFlow";

// ============================================================================
// Port Direction
// ============================================================================

export type PortDirection = "inlet" | "outlet";

// ============================================================================
// Core DEXPI Interfaces
// ============================================================================

/**
 * Root DEXPI Document
 */
export interface DexpiDocument {
  version: string;
  processModel: ProcessModel;
}

/**
 * Process Model - container for the entire diagram
 */
export interface ProcessModel {
  id: string;
  name: string;
  description?: string;
  diagramType: "BFD" | "PFD";
  processSteps: ProcessStep[];
  processConnections: ProcessConnection[];
  externalPorts: ExternalPort[];
  metadata?: ProcessModelMetadata;
}

/**
 * Metadata for round-trip fidelity
 */
export interface ProcessModelMetadata {
  createdAt?: string;
  updatedAt?: string;
  applicationSource?: string;
  customAttributes?: Record<string, string>;
}

/**
 * Process Step - represents a unit operation or block
 */
export interface ProcessStep {
  id: string;
  type: DexpiProcessStepType;
  name: string;
  description?: string;
  ports: Port[];
  parameters?: Parameter[];
  // Layout extension for React Flow position preservation
  layout?: LayoutInfo;
  // Store original React Flow node type for round-trip
  originalNodeType?: string;
}

/**
 * Port - input/output connection point on a ProcessStep
 */
export interface Port {
  id: string;
  name: string;
  direction: PortDirection;
  flowType: DexpiFlowType;
  // Reference to the step this port belongs to
  stepId?: string;
}

/**
 * External Port - system boundary (feed/product)
 */
export interface ExternalPort {
  id: string;
  name: string;
  direction: PortDirection;
  flowType: DexpiFlowType;
  layout?: LayoutInfo;
}

/**
 * Process Connection - stream connecting two ports
 */
export interface ProcessConnection {
  id: string;
  type: DexpiConnectionType;
  fromPort: string;
  toPort: string;
  flowType: DexpiFlowType;
  label?: string;
  properties?: StreamProperties;
  // Store original React Flow edge type for round-trip
  originalEdgeType?: string;
}

/**
 * Stream Properties - physical properties of a stream
 */
export interface StreamProperties {
  flowRate?: PhysicalQuantity;
  temperature?: PhysicalQuantity;
  pressure?: PhysicalQuantity;
  composition?: string;
  customProperties?: Record<string, string>;
}

/**
 * Physical Quantity with unit
 */
export interface PhysicalQuantity {
  value: number;
  unit: string;
}

/**
 * Parameter - process parameters on a step
 */
export interface Parameter {
  name: string;
  value: string | number;
  unit?: string;
}

/**
 * Layout Information - extension for preserving visual layout
 */
export interface LayoutInfo {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// ============================================================================
// DEXPI XML Namespace Constants
// ============================================================================

export const DEXPI_NAMESPACE = "https://dexpi.org/schema/2.0";
export const DEXPI_VERSION = "2.0";
export const DEXPI_SCHEMA_LOCATION = "https://dexpi.org/schema/2.0 DEXPI_XML_Schema.xsd";

// Application identifier for metadata
export const APPLICATION_SOURCE = "voice-diagram-app";
