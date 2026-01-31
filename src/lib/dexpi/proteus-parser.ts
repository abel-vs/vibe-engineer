/**
 * DEXPI 1.x (Proteus Schema) Parser
 * Parses DEXPI 1.3/1.4 PlantModel XML format and converts to our internal model
 */

import type {
  DexpiDocument,
  DexpiFlowType,
  DexpiProcessStepType,
  ExternalPort,
  Parameter,
  Port,
  ProcessConnection,
  ProcessModel,
  ProcessStep,
} from "./types";

// ============================================================================
// DEXPI 1.x Equipment Class Mappings
// Maps ComponentClass values to our internal ProcessStep types
// ============================================================================

const EQUIPMENT_TO_PROCESS_TYPE: Record<string, DexpiProcessStepType> = {
  // Pumps
  CentrifugalPump: "Process/Process.TransportingLiquids",
  PositiveDisplacementPump: "Process/Process.TransportingLiquids",
  Pump: "Process/Process.TransportingLiquids",

  // Compressors
  Compressor: "Process/Process.Compressing",
  CentrifugalCompressor: "Process/Process.Compressing",
  PositiveDisplacementCompressor: "Process/Process.Compressing",

  // Vessels and Tanks
  Vessel: "Process/Process.Storing",
  PressureVessel: "Process/Process.Storing",
  Tank: "Process/Process.Storing",
  StorageTank: "Process/Process.Storing",
  Drum: "Process/Process.Storing",

  // Reactors
  Reactor: "Process/Process.Reacting",
  ShellandTubeReactor: "Process/Process.Reacting",
  FixedBedReactor: "Process/Process.Reacting",
  FluidizedBedReactor: "Process/Process.Reacting",

  // Heat Exchangers
  HeatExchanger: "Process/Process.HeatingCooling",
  ShellandTubeHeatExchanger: "Process/Process.HeatingCooling",
  PlateHeatExchanger: "Process/Process.HeatingCooling",
  AirCooler: "Process/Process.HeatingCooling",
  Cooler: "Process/Process.HeatingCooling",
  Heater: "Process/Process.HeatingCooling",

  // Columns and Separators
  Column: "Process/Process.Separating",
  DistillationColumn: "Process/Process.Separating",
  AbsorptionColumn: "Process/Process.Separating",
  PackedColumn: "Process/Process.Separating",
  Separator: "Process/Process.Separating",
  GasLiquidSeparator: "Process/Process.Separating",
  Filter: "Process/Process.Separating",

  // Mixers
  Mixer: "Process/Process.MixingMaterial",
  StaticMixer: "Process/Process.MixingMaterial",

  // Valves (flow control)
  Valve: "Process/Process.Throttling",
  ControlValve: "Process/Process.Throttling",
  CheckValve: "Process/Process.Throttling",

  // Generic
  Equipment: "Process/Process.GenericProcessStep",
};

// ============================================================================
// Version Detection
// ============================================================================

export interface DexpiVersionInfo {
  version: "1.x" | "2.0" | "unknown";
  detectedVersion?: string;
  format: "proteus" | "dexpi-xml" | "unknown";
  rootElement: string;
}

/**
 * Detect DEXPI version from XML string
 */
export function detectDexpiVersion(xmlString: string): DexpiVersionInfo {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return { version: "unknown", format: "unknown", rootElement: "error" };
  }

  const root = doc.documentElement;
  const rootName = root.localName;

  // Check for DEXPI 2.0 format
  if (rootName === "DEXPI-Document") {
    const version = root.getAttribute("version") || "2.0";
    return {
      version: "2.0",
      detectedVersion: version,
      format: "dexpi-xml",
      rootElement: rootName,
    };
  }

  // Check for DEXPI 1.x (Proteus) format
  if (rootName === "PlantModel") {
    // Try to get version from PlantInformation
    const plantInfo = root.querySelector("PlantInformation");
    let detectedVersion: string | undefined;

    if (plantInfo) {
      const appVersion = plantInfo.getAttribute("ApplicationVersion");
      const schemaVersion = plantInfo.getAttribute("SchemaVersion");
      detectedVersion = appVersion ?? schemaVersion ?? undefined;
    }

    return {
      version: "1.x",
      detectedVersion,
      format: "proteus",
      rootElement: rootName,
    };
  }

  return {
    version: "unknown",
    format: "unknown",
    rootElement: rootName,
  };
}

// ============================================================================
// DEXPI 1.x Parser
// ============================================================================

/**
 * Parse DEXPI 1.x (Proteus Schema) XML to our internal model
 */
export function parseDexpi1x(xmlString: string): DexpiDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`XML Parse Error: ${parseError.textContent}`);
  }

  const root = doc.documentElement;

  if (root.localName !== "PlantModel") {
    throw new Error(
      `Expected root element 'PlantModel', found '${root.localName}'`
    );
  }

  // Get version info
  const versionInfo = extractVersionInfo(root);

  // Parse equipment elements
  const equipmentElements = root.querySelectorAll("Equipment");
  const processSteps: ProcessStep[] = [];
  const portMap = new Map<
    string,
    { stepId: string; direction: "inlet" | "outlet" }
  >();

  let stepIndex = 0;
  for (const equipEl of equipmentElements) {
    const step = parseEquipmentElement(equipEl, stepIndex++);
    if (step) {
      processSteps.push(step);
      // Map nozzles to ports
      for (const port of step.ports) {
        portMap.set(port.id, { stepId: step.id, direction: port.direction });
      }
    }
  }

  // Parse piping network systems for connections and external ports
  const pipingNetworkSystems = root.querySelectorAll("PipingNetworkSystem");
  const processConnections: ProcessConnection[] = [];
  const externalPorts: ExternalPort[] = [];

  let connectionIndex = 0;
  let extPortIndex = 0;

  for (const pnsEl of pipingNetworkSystems) {
    // Parse connections
    const connections = parsePipingNetworkConnections(pnsEl, connectionIndex);
    processConnections.push(...connections.connections);
    connectionIndex += connections.connections.length;

    // Parse external ports (off-page connectors)
    const extPorts = parseExternalConnectors(pnsEl, extPortIndex);
    externalPorts.push(...extPorts.ports);
    extPortIndex += extPorts.ports.length;
  }

  // Determine diagram type from content and discipline metadata
  const diagramType = detectDiagramType(
    equipmentElements,
    versionInfo.discipline
  );

  // Build ProcessModel
  const processModel: ProcessModel = {
    id: `pm_imported_${Date.now()}`,
    name: versionInfo.name || "Imported DEXPI Diagram",
    description: versionInfo.description,
    diagramType,
    processSteps,
    processConnections,
    externalPorts,
    metadata: {
      applicationSource: versionInfo.originatingSystem,
      createdAt: versionInfo.date,
    },
  };

  return {
    version: versionInfo.version || "1.x",
    processModel,
  };
}

// ============================================================================
// Element Parsers
// ============================================================================

interface VersionInfo {
  version?: string;
  name?: string;
  description?: string;
  originatingSystem?: string;
  date?: string;
  discipline?: string;
}

/**
 * Extract version and metadata from PlantModel
 */
function extractVersionInfo(root: Element): VersionInfo {
  const plantInfo = root.querySelector("PlantInformation");

  if (!plantInfo) {
    return {};
  }

  return {
    version:
      plantInfo.getAttribute("ApplicationVersion") ||
      plantInfo.getAttribute("SchemaVersion") ||
      undefined,
    originatingSystem: plantInfo.getAttribute("OriginatingSystem") ?? undefined,
    date: plantInfo.getAttribute("Date") ?? undefined,
    discipline: plantInfo.getAttribute("Discipline") ?? undefined,
  };
}

/**
 * Parse an Equipment element to ProcessStep
 */
function parseEquipmentElement(el: Element, index: number): ProcessStep | null {
  const id = el.getAttribute("ID") || `equipment_${index}`;
  const componentClass = el.getAttribute("ComponentClass") || "Equipment";

  // Map ComponentClass to our ProcessStep type
  const type =
    EQUIPMENT_TO_PROCESS_TYPE[componentClass] ||
    "Process/Process.GenericProcessStep";

  // Get name from GenericAttributes
  const name =
    getGenericAttributeValue(el, "TagNameAssignmentClass") || componentClass;

  // Parse nozzles as ports
  const nozzles = el.querySelectorAll("Nozzle");
  const ports: Port[] = [];

  let nozzleIndex = 0;
  for (const nozzleEl of nozzles) {
    const port = parseNozzleElement(nozzleEl, id, nozzleIndex++);
    if (port) {
      ports.push(port);
    }
  }

  // Parse parameters from GenericAttributes
  const parameters = parseGenericAttributesToParameters(el);

  return {
    id,
    type,
    name,
    ports,
    parameters: parameters.length > 0 ? parameters : undefined,
    originalNodeType: componentClass.toLowerCase(),
  };
}

/**
 * Parse a Nozzle element to Port
 */
function parseNozzleElement(
  el: Element,
  stepId: string,
  index: number
): Port | null {
  const id = el.getAttribute("ID") || `${stepId}_nozzle_${index}`;

  // Determine direction from connection points or naming convention
  const connectionPoints = el.querySelector("ConnectionPoints");
  let direction: "inlet" | "outlet" = "inlet";

  if (connectionPoints) {
    const flowOut = connectionPoints.getAttribute("FlowOut");
    direction = flowOut === "1" || flowOut === "true" ? "outlet" : "inlet";
  } else if (
    id.toLowerCase().includes("out") ||
    id.toLowerCase().includes("discharge")
  ) {
    direction = "outlet";
  }

  // Get flow type from context
  const flowType: DexpiFlowType = "material";

  return {
    id,
    name: `Nozzle ${index + 1}`,
    direction,
    flowType,
    stepId,
  };
}

/**
 * Parse piping network for connections
 */
function parsePipingNetworkConnections(
  pnsEl: Element,
  startIndex: number
): { connections: ProcessConnection[] } {
  const connections: ProcessConnection[] = [];

  // Find all Connection elements
  const connectionEls = pnsEl.querySelectorAll("Connection");

  let index = startIndex;
  for (const connEl of connectionEls) {
    const fromId = connEl.getAttribute("FromID");
    const toId = connEl.getAttribute("ToID");

    if (fromId && toId) {
      const id = `conn_${index++}`;

      connections.push({
        id,
        type: "Process/Process.MaterialFlow",
        fromPort: fromId,
        toPort: toId,
        flowType: "material",
      });
    }
  }

  return { connections };
}

/**
 * Parse external connectors (off-page connectors) as ExternalPorts
 */
function parseExternalConnectors(
  pnsEl: Element,
  startIndex: number
): { ports: ExternalPort[] } {
  const ports: ExternalPort[] = [];

  // Find FlowInPipeOffPageConnector and FlowOutPipeOffPageConnector
  const flowInConnectors = pnsEl.querySelectorAll(
    "PipeOffPageConnector[ComponentClass*='FlowIn']"
  );
  const flowOutConnectors = pnsEl.querySelectorAll(
    "PipeOffPageConnector[ComponentClass*='FlowOut']"
  );

  let index = startIndex;

  // Parse flow-in connectors (inlets to the system)
  for (const connEl of flowInConnectors) {
    const id = connEl.getAttribute("ID") || `ext_in_${index}`;
    const name =
      getGenericAttributeValue(connEl, "PipeConnectorNumberAssignmentClass") ||
      `External Input ${index + 1}`;

    ports.push({
      id,
      name,
      direction: "inlet",
      flowType: "material",
    });
    index++;
  }

  // Parse flow-out connectors (outlets from the system)
  for (const connEl of flowOutConnectors) {
    const id = connEl.getAttribute("ID") || `ext_out_${index}`;
    const name =
      getGenericAttributeValue(connEl, "PipeConnectorNumberAssignmentClass") ||
      `External Output ${index + 1}`;

    ports.push({
      id,
      name,
      direction: "outlet",
      flowType: "material",
    });
    index++;
  }

  return { ports };
}

/**
 * Detect diagram type from content and metadata
 * @param equipmentElements - Equipment elements from the document
 * @param discipline - Discipline attribute from PlantInformation (e.g., "PID", "PFD")
 */
function detectDiagramType(
  equipmentElements: NodeListOf<Element>,
  discipline?: string
): "BFD" | "PFD" | "P&ID" {
  // First check explicit discipline from PlantInformation
  // DEXPI uses "PID" for P&ID diagrams
  if (discipline === "PID") {
    return "P&ID";
  }
  if (discipline === "PFD") {
    return "PFD";
  }
  if (discipline === "BFD") {
    return "BFD";
  }

  // Fall back to detecting from content
  // If we have detailed equipment with nozzles, it's more likely a P&ID
  // If we have simpler block-like equipment, it's more likely a BFD

  let hasDetailedEquipment = false;
  let hasNozzles = false;

  for (const eq of equipmentElements) {
    const nozzles = eq.querySelectorAll("Nozzle");
    if (nozzles.length > 0) {
      hasNozzles = true;
    }

    const componentClass = eq.getAttribute("ComponentClass");
    if (
      componentClass &&
      (componentClass.includes("Pump") ||
        componentClass.includes("HeatExchanger") ||
        componentClass.includes("Column") ||
        componentClass.includes("Reactor"))
    ) {
      hasDetailedEquipment = true;
    }
  }

  // DEXPI 1.x files with detailed equipment and nozzles are typically P&ID
  if (hasDetailedEquipment || hasNozzles) {
    return "P&ID";
  }

  return "BFD";
}

// ============================================================================
// Attribute Helpers
// ============================================================================

/**
 * Get value from GenericAttributes by attribute name
 */
function getGenericAttributeValue(
  el: Element,
  attributeName: string
): string | undefined {
  const attrs = el.querySelectorAll("GenericAttributes GenericAttribute");

  for (const attr of attrs) {
    const name = attr.getAttribute("Name");
    if (name === attributeName) {
      return attr.getAttribute("Value") || undefined;
    }
  }

  return undefined;
}

/**
 * Parse GenericAttributes to Parameters array
 */
function parseGenericAttributesToParameters(el: Element): Parameter[] {
  const parameters: Parameter[] = [];
  const attrs = el.querySelectorAll(
    ":scope > GenericAttributes > GenericAttribute"
  );

  for (const attr of attrs) {
    const name = attr.getAttribute("Name");
    const value = attr.getAttribute("Value");

    if (name && value) {
      // Skip tag name attributes as they're used for the name
      if (name.includes("TagName")) continue;

      // Try to parse numeric values
      const numValue = parseFloat(value);

      parameters.push({
        name: formatAttributeName(name),
        value: isNaN(numValue) ? value : numValue,
      });
    }
  }

  return parameters;
}

/**
 * Format attribute name from RDL-style to readable format
 */
function formatAttributeName(name: string): string {
  // Remove common suffixes
  let formatted = name
    .replace(/AssignmentClass$/, "")
    .replace(/NumericalValueRepresentation$/, "")
    .replace(/Specialization$/, "");

  // Add spaces before capital letters
  formatted = formatted.replace(/([A-Z])/g, " $1").trim();

  return formatted;
}

// ============================================================================
// Validation for DEXPI 1.x
// ============================================================================

export interface Dexpi1xValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate DEXPI 1.x XML structure
 */
export function validateDexpi1x(xmlString: string): Dexpi1xValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      errors.push(`XML Parse Error: ${parseError.textContent}`);
      return { valid: false, errors, warnings };
    }

    const root = doc.documentElement;

    // Check root element
    if (root.localName !== "PlantModel") {
      errors.push(
        `Expected root element 'PlantModel', found '${root.localName}'`
      );
      return { valid: false, errors, warnings };
    }

    // Check for PlantInformation
    const plantInfo = root.querySelector("PlantInformation");
    if (!plantInfo) {
      warnings.push("PlantInformation element is missing");
    } else {
      // Check schema version
      const schemaVersion = plantInfo.getAttribute("SchemaVersion");
      if (!schemaVersion) {
        warnings.push("SchemaVersion attribute is missing");
      }
    }

    // Check for equipment or piping elements
    const equipment = root.querySelectorAll("Equipment");
    const piping = root.querySelectorAll("PipingNetworkSystem");

    if (equipment.length === 0 && piping.length === 0) {
      warnings.push("No Equipment or PipingNetworkSystem elements found");
    }

    // Validate equipment elements
    for (const eq of equipment) {
      const id = eq.getAttribute("ID");
      if (!id) {
        errors.push("Equipment element is missing ID attribute");
      }

      const componentClass = eq.getAttribute("ComponentClass");
      if (!componentClass) {
        warnings.push(
          `Equipment '${id || "unknown"}' is missing ComponentClass attribute`
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  } catch (e) {
    errors.push(
      `Validation error: ${e instanceof Error ? e.message : String(e)}`
    );
    return { valid: false, errors, warnings };
  }
}
