/**
 * DEXPI 1.x (Proteus Schema) Parser
 * Parses DEXPI 1.3/1.4 PlantModel XML format and converts to our internal model
 */

import type {
  DexpiDocument,
  DexpiFlowType,
  DexpiProcessStepType,
  ExternalPort,
  InlineComponent,
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
  ReciprocatingPump: "Process/Process.TransportingLiquids",

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
  TubularHeatExchanger: "Process/Process.HeatingCooling",
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
  SwingCheckValve: "Process/Process.Throttling",
  GlobeValve: "Process/Process.Throttling",
  BallValve: "Process/Process.Throttling",
  ButterflyValve: "Process/Process.Throttling",
  GateValve: "Process/Process.Throttling",
  SafetyValve: "Process/Process.Throttling",
  SpringLoadedGlobeSafetyValve: "Process/Process.Throttling",

  // Fittings
  PipeReducer: "Process/Process.GenericProcessStep",
  PipeTee: "Process/Process.GenericProcessStep",
  BlindFlange: "Process/Process.GenericProcessStep",
  Flange: "Process/Process.GenericProcessStep",

  // Generic
  Equipment: "Process/Process.GenericProcessStep",
};

// Sub-components to skip (nested equipment that shouldn't be parsed as standalone)
const SKIP_COMPONENT_CLASSES = new Set([
  "Chamber",
  "TubeBundle",
  "Impeller",
  "Displacer",
]);

// ============================================================================
// Inline Component Classes
// These are rendered ON edges/pipes rather than as separate nodes
// ============================================================================

const INLINE_COMPONENT_CLASSES = new Set([
  // Valves - all types
  "Valve",
  "ControlValve",
  "CheckValve",
  "SwingCheckValve",
  "GlobeValve",
  "BallValve",
  "ButterflyValve",
  "GateValve",
  "SafetyValve",
  "SpringLoadedGlobeSafetyValve",
  "NeedleValve",
  "PlugValve",
  "DiaphragmValve",
  "PinchValve",
  "ReliefValve",
  "RotaryValve",
  "ThreeWayValve",
  "FourWayValve",
  "AngleValve",
  "RegulatingValve",
  // Fittings
  "PipeReducer",
  "PipeTee",
  "BlindFlange",
  "Flange",
  "Elbow",
  "Cap",
  "Union",
  "Coupling",
  // Instruments (optional - can be disabled if you want them as nodes)
  // "Instrument",
  // "FlowMeter",
  // "OrificeFlowMeter",
]);

// Map ComponentClass to DEXPI category for symbol lookup
const COMPONENT_CLASS_TO_CATEGORY: Record<string, string> = {
  // Valves
  Valve: "Valves",
  ControlValve: "Valves",
  CheckValve: "Valves",
  SwingCheckValve: "Valves",
  GlobeValve: "Valves",
  BallValve: "Valves",
  ButterflyValve: "Valves",
  GateValve: "Valves",
  SafetyValve: "Valves",
  SpringLoadedGlobeSafetyValve: "Valves",
  NeedleValve: "Valves",
  PlugValve: "Valves",
  DiaphragmValve: "Valves",
  PinchValve: "Valves",
  ReliefValve: "Valves",
  RotaryValve: "Valves",
  ThreeWayValve: "Valves",
  FourWayValve: "Valves",
  AngleValve: "Valves",
  RegulatingValve: "Valves",
  // Fittings
  PipeReducer: "Fittings",
  PipeTee: "Fittings",
  BlindFlange: "Fittings",
  Flange: "Fittings",
  Elbow: "Fittings",
  Cap: "Fittings",
  Union: "Fittings",
  Coupling: "Fittings",
  // Instruments
  Instrument: "Instruments",
  FlowMeter: "Flow_Sensors",
  OrificeFlowMeter: "Flow_Sensors",
};

// Map ComponentClass to symbol index within the category
// These indices match the order in dexpi-mapping.json
const COMPONENT_CLASS_TO_SYMBOL_INDEX: Record<string, number> = {
  // Valves - index matches common DEXPI symbol ordering
  GateValve: 0,
  GlobeValve: 1,
  BallValve: 2,
  ButterflyValve: 3,
  CheckValve: 4,
  SwingCheckValve: 4,
  ControlValve: 5,
  SafetyValve: 6,
  SpringLoadedGlobeSafetyValve: 6,
  NeedleValve: 7,
  PlugValve: 8,
  DiaphragmValve: 9,
  ReliefValve: 6,
  ThreeWayValve: 10,
  // Default for unknown valve types
  Valve: 0,
  // Fittings
  PipeReducer: 0,
  PipeTee: 1,
  Flange: 2,
  BlindFlange: 3,
  Elbow: 4,
};

/**
 * Check if a ComponentClass is an inline component (should be rendered on edge)
 */
function isInlineComponentClass(componentClass: string): boolean {
  return INLINE_COMPONENT_CLASSES.has(componentClass);
}

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
 * Port mapping info for resolving connections
 */
interface PortMapEntry {
  stepId: string;
  direction: "inlet" | "outlet";
  nodeIndex?: number; // For PipingComponent connection points
  position?: { x: number; y: number }; // Position for coordinate matching
}

/**
 * Nozzle metadata for enhanced rendering
 */
interface NozzleMetadata {
  id: string;
  label: string;
  position?: { x: number; y: number };
  connectionNodeIds: string[]; // PipingNode-X IDs for this nozzle
}

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

  // Parse equipment elements - only top-level, not inside ShapeCatalogue or other Equipment
  const equipmentElements = getTopLevelEquipment(root);
  const processSteps: ProcessStep[] = [];
  const portMap = new Map<string, PortMapEntry>();

  let stepIndex = 0;
  for (const equipEl of equipmentElements) {
    const step = parseEquipmentElement(equipEl, stepIndex++, portMap);
    if (step) {
      processSteps.push(step);
    }
  }

  // Parse piping network systems for connections, external ports, and inline components
  const pipingNetworkSystems = root.querySelectorAll("PipingNetworkSystem");
  const processConnections: ProcessConnection[] = [];
  const externalPorts: ExternalPort[] = [];

  let connectionIndex = 0;
  let extPortIndex = 0;
  let pipingComponentIndex = 0;

  for (const pnsEl of pipingNetworkSystems) {
    // Parse PipingComponents - separating inline components (valves, etc.) from regular components
    const pipingComponentResult = parsePipingComponents(
      pnsEl,
      pipingComponentIndex,
      portMap
    );
    // Only add non-inline components as process steps
    processSteps.push(...pipingComponentResult.steps);
    pipingComponentIndex += pipingComponentResult.steps.length;

    // Parse connections with inline components embedded
    const connections = parsePipingNetworkConnections(
      pnsEl,
      connectionIndex,
      portMap,
      pipingComponentResult.inlineComponents
    );
    processConnections.push(...connections.connections);
    connectionIndex += connections.connections.length;

    // Parse external ports (off-page connectors)
    const extPorts = parseExternalConnectors(pnsEl, extPortIndex, portMap);
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

/**
 * Get only top-level Equipment elements (not inside ShapeCatalogue or nested in other Equipment)
 */
function getTopLevelEquipment(root: Element): Element[] {
  const equipmentElements: Element[] = [];

  // Only get direct children of root that are Equipment
  for (const child of root.children) {
    if (child.localName === "Equipment") {
      const componentClass = child.getAttribute("ComponentClass");

      // Skip equipment without ComponentClass (likely shape templates)
      if (!componentClass) {
        continue;
      }

      // Skip sub-component types that shouldn't be standalone nodes
      if (SKIP_COMPONENT_CLASSES.has(componentClass)) {
        continue;
      }

      equipmentElements.push(child);
    }
  }

  return equipmentElements;
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
function parseEquipmentElement(
  el: Element,
  index: number,
  portMap: Map<string, PortMapEntry>
): ProcessStep | null {
  const id = el.getAttribute("ID") || `equipment_${index}`;
  const componentClass = el.getAttribute("ComponentClass") || "Equipment";

  // Map ComponentClass to our ProcessStep type
  const type =
    EQUIPMENT_TO_PROCESS_TYPE[componentClass] ||
    "Process/Process.GenericProcessStep";

  // Get name from GenericAttributes only - don't fall back to ComponentClass
  // If there's no explicit name, we want the label to be empty
  const name =
    getGenericAttributeValue(el, "TagNameAssignmentClass") || undefined;

  // Get position from Position element
  const positionEl = el.querySelector(":scope > Position > Location");
  const layout = positionEl
    ? {
        x: parseFloat(positionEl.getAttribute("X") || "0"),
        y: parseFloat(positionEl.getAttribute("Y") || "0"),
      }
    : undefined;

  // Parse nozzles as ports AND register all their IDs in portMap
  const nozzles = el.querySelectorAll(":scope > Nozzle");
  const ports: Port[] = [];

  let nozzleIndex = 0;
  for (const nozzleEl of nozzles) {
    const { port, nozzleMetadata } = parseNozzleElementWithMetadata(
      nozzleEl,
      id,
      nozzleIndex++
    );
    if (port) {
      ports.push(port);

      // Register the nozzle ID itself in portMap with position
      portMap.set(port.id, {
        stepId: id,
        direction: port.direction,
        position: nozzleMetadata.position,
      });

      // Register all ConnectionPoints Node IDs (PipingNode-X) in portMap
      // AND add them as additional port entries so from-dexpi.ts can find them
      // Also capture the node's position for coordinate matching
      const nozzleEl = nozzles[nozzleIndex - 1]; // We just incremented, so -1
      const connectionPoints = nozzleEl?.querySelector("ConnectionPoints");
      const nodeEls = connectionPoints?.querySelectorAll("Node") || [];

      for (const nodeId of nozzleMetadata.connectionNodeIds) {
        // Find the position for this specific node
        let nodePosition: { x: number; y: number } | undefined;
        for (const nodeEl of nodeEls) {
          if (nodeEl.getAttribute("ID") === nodeId) {
            const posEl = nodeEl.querySelector("Position > Location");
            if (posEl) {
              nodePosition = {
                x: parseFloat(posEl.getAttribute("X") || "0"),
                y: parseFloat(posEl.getAttribute("Y") || "0"),
              };
            }
            break;
          }
        }

        portMap.set(nodeId, {
          stepId: id,
          direction: port.direction,
          position: nodePosition || nozzleMetadata.position,
        });

        // Add as additional port entry (this is what from-dexpi.ts uses to build its map)
        ports.push({
          id: nodeId,
          name: `${port.name} (${nodeId})`,
          direction: port.direction,
          flowType: "material",
          stepId: id,
        });
      }
    }
  }

  // Also register the equipment ID itself as a fallback
  portMap.set(id, { stepId: id, direction: "inlet" });

  // Parse parameters from GenericAttributes
  const parameters = parseGenericAttributesToParameters(el);

  return {
    id,
    type,
    name,
    ports,
    parameters: parameters.length > 0 ? parameters : undefined,
    layout,
    originalNodeType: componentClass,
  };
}

/**
 * Parse a Nozzle element to Port with enhanced metadata
 * Extracts all ConnectionPoints Node IDs for proper connection resolution
 */
function parseNozzleElementWithMetadata(
  el: Element,
  stepId: string,
  index: number
): { port: Port | null; nozzleMetadata: NozzleMetadata } {
  const id = el.getAttribute("ID") || `${stepId}_nozzle_${index}`;
  const connectionNodeIds: string[] = [];

  // Get nozzle label from GenericAttributes
  const label =
    getGenericAttributeValue(el, "SubTagNameAssignmentClass") ||
    `N${index + 1}`;

  // Get nozzle position
  const positionEl = el.querySelector("Position > Location");
  const position = positionEl
    ? {
        x: parseFloat(positionEl.getAttribute("X") || "0"),
        y: parseFloat(positionEl.getAttribute("Y") || "0"),
      }
    : undefined;

  // Determine direction from connection points or naming convention
  const connectionPoints = el.querySelector("ConnectionPoints");
  let direction: "inlet" | "outlet" = "inlet";

  if (connectionPoints) {
    const flowOut = connectionPoints.getAttribute("FlowOut");
    direction = flowOut === "1" || flowOut === "true" ? "outlet" : "inlet";

    // Extract ALL node IDs from ConnectionPoints
    // These are the actual IDs used in Connection elements (e.g., PipingNode-44)
    const nodes = connectionPoints.querySelectorAll("Node");
    for (const nodeEl of nodes) {
      const nodeId = nodeEl.getAttribute("ID");
      // Include all node types except DefaultNode placeholders
      if (nodeId && !nodeId.includes("-DefaultNode")) {
        connectionNodeIds.push(nodeId);
      }
    }
  } else if (
    id.toLowerCase().includes("out") ||
    id.toLowerCase().includes("discharge")
  ) {
    direction = "outlet";
  }

  // Get flow type from context
  const flowType: DexpiFlowType = "material";

  const port: Port = {
    id,
    name: label,
    direction,
    flowType,
    stepId,
  };

  const nozzleMetadata: NozzleMetadata = {
    id,
    label,
    position,
    connectionNodeIds,
  };

  return { port, nozzleMetadata };
}

/**
 * Parsed inline component data (before connection assignment)
 */
interface ParsedInlineComponent {
  id: string;
  componentClass: string;
  category: string;
  symbolIndex: number;
  label?: string;
  position: { x: number; y: number };
  rotation: number;
  connectionNodeIds: string[];
}

/**
 * Parse PipingComponent elements
 * Separates inline components (valves, etc.) from regular piping components
 * Inline components will be embedded in edges, not created as separate nodes
 */
function parsePipingComponents(
  pnsEl: Element,
  startIndex: number,
  portMap: Map<string, PortMapEntry>
): {
  steps: ProcessStep[];
  inlineComponents: Map<string, ParsedInlineComponent[]>; // Keyed by segment ID
} {
  const steps: ProcessStep[] = [];
  const inlineComponents = new Map<string, ParsedInlineComponent[]>();

  // Find all PipingNetworkSegments
  const segments = pnsEl.querySelectorAll("PipingNetworkSegment");

  let index = startIndex;
  for (const segment of segments) {
    const segmentId = segment.getAttribute("ID") || `segment_${index}`;
    const segmentInlineComponents: ParsedInlineComponent[] = [];

    // Find all PipingComponent elements within this segment
    const pipingComponents = segment.querySelectorAll(
      ":scope > PipingComponent"
    );

    for (const compEl of pipingComponents) {
      const componentClass =
        compEl.getAttribute("ComponentClass") || "PipingComponent";

      // Check if this is an inline component (valve, fitting, etc.)
      if (isInlineComponentClass(componentClass)) {
        // Parse as inline component
        const inlineComp = parseInlineComponentElement(compEl, portMap);
        if (inlineComp) {
          segmentInlineComponents.push(inlineComp);
        }
      } else {
        // Parse as regular process step
        const step = parsePipingComponentElement(compEl, index++, portMap);
        if (step) {
          steps.push(step);
        }
      }
    }

    if (segmentInlineComponents.length > 0) {
      inlineComponents.set(segmentId, segmentInlineComponents);
    }
  }

  return { steps, inlineComponents };
}

/**
 * Parse a PipingComponent element as an inline component
 */
function parseInlineComponentElement(
  el: Element,
  portMap: Map<string, PortMapEntry>
): ParsedInlineComponent | null {
  const id = el.getAttribute("ID") || `inline_${Date.now()}`;
  const componentClass = el.getAttribute("ComponentClass") || "Valve";

  // Get category and symbol index
  const category = COMPONENT_CLASS_TO_CATEGORY[componentClass] || "Valves";
  const symbolIndex = COMPONENT_CLASS_TO_SYMBOL_INDEX[componentClass] ?? 0;

  // Get label from GenericAttributes
  const label =
    getGenericAttributeValue(el, "PipingComponentNameAssignmentClass") ||
    getGenericAttributeValue(el, "TagNameAssignmentClass") ||
    undefined;

  // Get position from Position element
  const positionEl = el.querySelector(":scope > Position > Location");
  const position = positionEl
    ? {
        x: parseFloat(positionEl.getAttribute("X") || "0"),
        y: parseFloat(positionEl.getAttribute("Y") || "0"),
      }
    : { x: 0, y: 0 };

  // Get rotation from Position > Reference element
  // Reference vector indicates the component's orientation
  const referenceEl = el.querySelector(":scope > Position > Reference");
  let rotation = 0;
  if (referenceEl) {
    const refX = parseFloat(referenceEl.getAttribute("X") || "1");
    const refY = parseFloat(referenceEl.getAttribute("Y") || "0");
    // Calculate angle from reference vector
    rotation = Math.atan2(refY, refX) * (180 / Math.PI);
  }

  // Collect connection node IDs for port mapping
  const connectionNodeIds: string[] = [];
  const connectionPoints = el.querySelector("ConnectionPoints");
  if (connectionPoints) {
    const nodes = connectionPoints.querySelectorAll("Node");
    for (const node of nodes) {
      const nodeId = node.getAttribute("ID");
      if (nodeId && !nodeId.includes("-DefaultNode")) {
        connectionNodeIds.push(nodeId);

        // Register in portMap so connections can find this inline component
        // But we'll mark it as inline to handle it specially
        portMap.set(nodeId, {
          stepId: id,
          direction: "inlet",
          position,
        });
      }
    }
  }

  // Also register the component ID itself
  portMap.set(id, {
    stepId: id,
    direction: "inlet",
    position,
  });

  return {
    id,
    componentClass,
    category,
    symbolIndex,
    label,
    position,
    rotation,
    connectionNodeIds,
  };
}

/**
 * Parse a PipingComponent element to ProcessStep
 */
function parsePipingComponentElement(
  el: Element,
  index: number,
  portMap: Map<string, PortMapEntry>
): ProcessStep | null {
  const id = el.getAttribute("ID") || `piping_component_${index}`;
  const componentClass = el.getAttribute("ComponentClass") || "PipingComponent";

  // Map ComponentClass to our ProcessStep type
  const type =
    EQUIPMENT_TO_PROCESS_TYPE[componentClass] ||
    "Process/Process.GenericProcessStep";

  // Get name from GenericAttributes only - don't fall back to ComponentClass
  // If there's no explicit name, we want the label to be empty
  const name =
    getGenericAttributeValue(el, "PipingComponentNameAssignmentClass") ||
    getGenericAttributeValue(el, "TagNameAssignmentClass") ||
    undefined;

  // Parse ConnectionPoints as ports and register in portMap
  const ports: Port[] = [];
  const connectionPoints = el.querySelector("ConnectionPoints");

  if (connectionPoints) {
    const flowIn = connectionPoints.getAttribute("FlowIn");
    const flowOut = connectionPoints.getAttribute("FlowOut");
    const nodes = connectionPoints.querySelectorAll("Node");

    let nodeIndex = 0;
    for (const nodeEl of nodes) {
      const nodeId = nodeEl.getAttribute("ID");
      const nodeType = nodeEl.getAttribute("Type");

      // Skip default nodes (they're just placeholders)
      if (nodeId?.includes("-DefaultNode")) {
        nodeIndex++;
        continue;
      }

      // Determine direction based on FlowIn/FlowOut attributes and node index
      // FlowIn/FlowOut indicate which node indices are inlets/outlets
      let direction: "inlet" | "outlet" = "inlet";

      // Parse flow direction from attributes
      // FlowIn="1" means node at index 1 is an inlet
      // FlowOut="2" means node at index 2 is an outlet
      if (flowOut && parseInt(flowOut) === nodeIndex + 1) {
        direction = "outlet";
      } else if (flowIn && parseInt(flowIn) === nodeIndex + 1) {
        direction = "inlet";
      } else if (nodeType === "process") {
        // Default process nodes are typically connection points
        direction = nodeIndex === 1 ? "inlet" : "outlet";
      }

      // Get node position for coordinate matching
      const nodePosEl = nodeEl.querySelector("Position > Location");
      const nodePosition = nodePosEl
        ? {
            x: parseFloat(nodePosEl.getAttribute("X") || "0"),
            y: parseFloat(nodePosEl.getAttribute("Y") || "0"),
          }
        : undefined;

      const port: Port = {
        id: nodeId || `${id}_port_${nodeIndex}`,
        name: `Port ${nodeIndex + 1}`,
        direction,
        flowType: "material",
        stepId: id,
      };

      ports.push(port);

      // Register in portMap for connection resolution with position
      if (nodeId) {
        portMap.set(nodeId, {
          stepId: id,
          direction,
          nodeIndex,
          position: nodePosition,
        });
      }

      nodeIndex++;
    }

    // Also register the component ID itself for direct references
    // Connections often reference component IDs with node indices
    portMap.set(id, { stepId: id, direction: "inlet", nodeIndex: 0 });
  }

  // Get position from Position element - use :scope to get direct child only
  // (not nested Position elements inside ConnectionPoints > Node)
  const positionEl = el.querySelector(":scope > Position > Location");
  const layout = positionEl
    ? {
        x: parseFloat(positionEl.getAttribute("X") || "0"),
        y: parseFloat(positionEl.getAttribute("Y") || "0"),
      }
    : undefined;

  // Parse parameters from GenericAttributes
  const parameters = parseGenericAttributesToParameters(el);

  return {
    id,
    type,
    name,
    ports,
    parameters: parameters.length > 0 ? parameters : undefined,
    layout,
    originalNodeType: componentClass.toLowerCase(),
  };
}

/**
 * Parse piping network for connections
 * Also extracts FromNode/ToNode indices for precise port resolution
 * and PipingNetworkSystemLabel for edge labels
 *
 * Inline components (valves, fittings) are embedded in connections
 * rather than being connected via separate edges.
 */
function parsePipingNetworkConnections(
  pnsEl: Element,
  startIndex: number,
  portMap: Map<string, PortMapEntry>,
  inlineComponentsBySegment: Map<string, ParsedInlineComponent[]>
): { connections: ProcessConnection[] } {
  const connections: ProcessConnection[] = [];

  // Extract PipingNetworkSystemLabel from the parent system
  // This label describes the piping line (e.g., "MNb 47121 75HB13 80")
  const pipingLabel = extractPipingNetworkSystemLabel(pnsEl);

  // Build a set of inline component IDs to skip when processing connections
  const inlineComponentIds = new Set<string>();
  for (const components of inlineComponentsBySegment.values()) {
    for (const comp of components) {
      inlineComponentIds.add(comp.id);
      // Also add connection node IDs
      for (const nodeId of comp.connectionNodeIds) {
        inlineComponentIds.add(nodeId);
      }
    }
  }

  // Process each segment to create equipment-to-equipment connections with inline components
  const segments = pnsEl.querySelectorAll("PipingNetworkSegment");
  let index = startIndex;

  for (const segment of segments) {
    const segmentId = segment.getAttribute("ID") || "";
    const segmentInlineComponents =
      inlineComponentsBySegment.get(segmentId) || [];

    // Get CenterLine coordinates to determine path and component positions
    const pathCoordinates = extractCenterLineCoordinates(segment);

    // Find equipment endpoints for this segment (nozzles, off-page connectors)
    const endpoints = findSegmentEndpoints(
      segment,
      portMap,
      inlineComponentIds
    );

    if (endpoints.length >= 2) {
      // Create a connection from start to end with inline components embedded
      const fromEndpoint = endpoints[0];
      const toEndpoint = endpoints[endpoints.length - 1];

      // Calculate positions for inline components along the path
      const inlineComps = calculateInlinePositions(
        segmentInlineComponents,
        pathCoordinates,
        fromEndpoint.position,
        toEndpoint.position
      );

      const connId = `conn_${index++}`;
      connections.push({
        id: connId,
        type: "Process/Process.MaterialFlow",
        fromPort: fromEndpoint.portId,
        toPort: toEndpoint.portId,
        flowType: "material",
        label: pipingLabel || undefined,
        inlineComponents: inlineComps.length > 0 ? inlineComps : undefined,
      });
    } else {
      // Fallback: process explicit Connection elements
      const connectionEls = segment.querySelectorAll(":scope > Connection");

      for (const connEl of connectionEls) {
        const fromId = connEl.getAttribute("FromID");
        const toId = connEl.getAttribute("ToID");

        // Skip incomplete connections or connections to inline components
        if (!fromId || !toId) continue;
        if (inlineComponentIds.has(fromId) || inlineComponentIds.has(toId))
          continue;

        const fromNode = connEl.getAttribute("FromNode");
        const toNode = connEl.getAttribute("ToNode");

        const resolvedFromPort = resolvePortWithIndex(
          fromId,
          fromNode,
          portMap
        );
        const resolvedToPort = resolvePortWithIndex(toId, toNode, portMap);

        const connId = `conn_${index++}`;
        connections.push({
          id: connId,
          type: "Process/Process.MaterialFlow",
          fromPort: resolvedFromPort,
          toPort: resolvedToPort,
          flowType: "material",
          label: pipingLabel || undefined,
          inlineComponents:
            segmentInlineComponents.length > 0
              ? segmentInlineComponents.map((comp) => ({
                  id: comp.id,
                  componentClass: comp.componentClass,
                  category: comp.category,
                  symbolIndex: comp.symbolIndex,
                  label: comp.label,
                  position: 0.5, // Default to middle if we can't calculate
                  originalPosition: comp.position,
                  rotation: comp.rotation,
                }))
              : undefined,
        });
      }
    }
  }

  return { connections };
}

/**
 * Extract CenterLine coordinates from a segment
 */
function extractCenterLineCoordinates(segment: Element): Coordinate[] {
  const coordinates: Coordinate[] = [];
  const centerLines = segment.querySelectorAll(":scope > CenterLine");

  for (const cl of centerLines) {
    const coords = cl.querySelectorAll("Coordinate");
    for (const coord of coords) {
      const x = parseFloat(coord.getAttribute("X") || "0");
      const y = parseFloat(coord.getAttribute("Y") || "0");
      // Avoid duplicate consecutive coordinates
      const last = coordinates[coordinates.length - 1];
      if (!last || !coordinatesMatch({ x, y }, last)) {
        coordinates.push({ x, y });
      }
    }
  }

  return coordinates;
}

/**
 * Find equipment endpoints for a segment (not inline components)
 */
function findSegmentEndpoints(
  segment: Element,
  portMap: Map<string, PortMapEntry>,
  inlineComponentIds: Set<string>
): Array<{ portId: string; position: Coordinate }> {
  const endpoints: Array<{ portId: string; position: Coordinate }> = [];

  // Look for Connection elements to find endpoints
  const connectionEls = segment.querySelectorAll(":scope > Connection");
  const endpointIds = new Set<string>();

  for (const connEl of connectionEls) {
    const fromId = connEl.getAttribute("FromID");
    const toId = connEl.getAttribute("ToID");

    if (fromId && !inlineComponentIds.has(fromId)) {
      endpointIds.add(fromId);
    }
    if (toId && !inlineComponentIds.has(toId)) {
      endpointIds.add(toId);
    }
  }

  // Also check for PipeOffPageConnector (external ports)
  const offPageConnectors = segment.querySelectorAll(
    ":scope > PipeOffPageConnector"
  );
  for (const opc of offPageConnectors) {
    const id = opc.getAttribute("ID");
    if (id) {
      const posEl = opc.querySelector("Position > Location");
      const position = posEl
        ? {
            x: parseFloat(posEl.getAttribute("X") || "0"),
            y: parseFloat(posEl.getAttribute("Y") || "0"),
          }
        : { x: 0, y: 0 };
      endpoints.push({ portId: id, position });
    }
  }

  // Get positions for other endpoints
  for (const portId of endpointIds) {
    const entry = portMap.get(portId);
    if (entry?.position) {
      endpoints.push({ portId, position: entry.position });
    }
  }

  return endpoints;
}

/**
 * Calculate positions for inline components along the path
 * Returns InlineComponent objects with position as 0-1 fraction along path
 */
function calculateInlinePositions(
  components: ParsedInlineComponent[],
  pathCoordinates: Coordinate[],
  startPos: Coordinate,
  endPos: Coordinate
): InlineComponent[] {
  if (components.length === 0) return [];
  if (pathCoordinates.length < 2) {
    // No path info - distribute evenly
    return components.map((comp, i) => ({
      id: comp.id,
      componentClass: comp.componentClass,
      category: comp.category,
      symbolIndex: comp.symbolIndex,
      label: comp.label,
      position: (i + 1) / (components.length + 1),
      originalPosition: comp.position,
      rotation: comp.rotation,
    }));
  }

  // Calculate total path length
  let totalLength = 0;
  for (let i = 1; i < pathCoordinates.length; i++) {
    totalLength += Math.hypot(
      pathCoordinates[i].x - pathCoordinates[i - 1].x,
      pathCoordinates[i].y - pathCoordinates[i - 1].y
    );
  }

  if (totalLength === 0) totalLength = 1; // Avoid division by zero

  // For each component, find its position along the path
  return components
    .map((comp) => {
      // Find the closest point on the path
      let minDist = Infinity;
      let distanceAlongPath = 0;
      let cumulativeLength = 0;

      for (let i = 1; i < pathCoordinates.length; i++) {
        const segStart = pathCoordinates[i - 1];
        const segEnd = pathCoordinates[i];
        const segLength = Math.hypot(
          segEnd.x - segStart.x,
          segEnd.y - segStart.y
        );

        // Project component position onto this segment
        const t = projectPointOntoSegment(comp.position, segStart, segEnd);
        const projectedPoint = {
          x: segStart.x + t * (segEnd.x - segStart.x),
          y: segStart.y + t * (segEnd.y - segStart.y),
        };

        const dist = Math.hypot(
          comp.position.x - projectedPoint.x,
          comp.position.y - projectedPoint.y
        );

        if (dist < minDist) {
          minDist = dist;
          distanceAlongPath = cumulativeLength + t * segLength;
        }

        cumulativeLength += segLength;
      }

      // Calculate normalized position (0-1)
      const normalizedPosition = Math.max(
        0.05,
        Math.min(0.95, distanceAlongPath / totalLength)
      );

      return {
        id: comp.id,
        componentClass: comp.componentClass,
        category: comp.category,
        symbolIndex: comp.symbolIndex,
        label: comp.label,
        position: normalizedPosition,
        originalPosition: comp.position,
        rotation: comp.rotation,
      };
    })
    .sort((a, b) => a.position - b.position); // Sort by position along path
}

/**
 * Project a point onto a line segment, returning t value (0-1)
 */
function projectPointOntoSegment(
  point: Coordinate,
  segStart: Coordinate,
  segEnd: Coordinate
): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) return 0;

  const t =
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
  return Math.max(0, Math.min(1, t));
}

/**
 * Position coordinate with small tolerance for matching
 */
interface Coordinate {
  x: number;
  y: number;
}

/**
 * Check if two coordinates are approximately equal (within tolerance)
 */
function coordinatesMatch(
  a: Coordinate,
  b: Coordinate,
  tolerance = 0.5
): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

/**
 * Extract label text from PipingNetworkSystemLabel
 */
function extractPipingNetworkSystemLabel(pnsEl: Element): string | null {
  // Look for label in the PipingNetworkSystem
  const labelEl = pnsEl.querySelector(
    ":scope > Label[ComponentClass*='PipingNetworkSystemLabel'] > Text"
  );

  if (labelEl) {
    return labelEl.getAttribute("String") || null;
  }

  // Also check for PipingNetworkSegmentLabel within segments
  const segmentLabelEl = pnsEl.querySelector(
    "PipingNetworkSegment > Label[ComponentClass*='PipingNetworkSegmentLabel'] > Text"
  );

  if (segmentLabelEl) {
    return segmentLabelEl.getAttribute("String") || null;
  }

  return null;
}

/**
 * Resolve a port ID, optionally using a node index
 * If the ID is in portMap, use it directly
 * If not, and we have a node index, try to find the specific port
 */
function resolvePortWithIndex(
  componentId: string,
  nodeIndex: string | null,
  portMap: Map<string, PortMapEntry>
): string {
  // First, check if the componentId itself is already in the portMap
  if (portMap.has(componentId)) {
    return componentId;
  }

  // If we have a node index, the component might have multiple ports
  // Try to find the specific port by looking for entries that match the component
  // This handles cases where connections reference component IDs with node indices
  if (nodeIndex) {
    // Look for port IDs that might match this component + node index pattern
    // Common patterns: ComponentId_port_N, PipingNode-N, etc.
    for (const [portId, entry] of portMap.entries()) {
      if (
        entry.stepId === componentId &&
        entry.nodeIndex === parseInt(nodeIndex) - 1
      ) {
        return portId;
      }
    }
  }

  // Return the original ID - it will be resolved in from-dexpi.ts
  return componentId;
}

/**
 * Parse external connectors (off-page connectors) as ExternalPorts
 */
function parseExternalConnectors(
  pnsEl: Element,
  startIndex: number,
  portMap: Map<string, PortMapEntry>
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

    // Get position from Position element
    const positionEl = connEl.querySelector("Position > Location");
    const layout = positionEl
      ? {
          x: parseFloat(positionEl.getAttribute("X") || "0"),
          y: parseFloat(positionEl.getAttribute("Y") || "0"),
        }
      : undefined;

    ports.push({
      id,
      name,
      direction: "inlet",
      flowType: "material",
      layout,
    });

    // Register in portMap for connection resolution
    portMap.set(id, { stepId: id, direction: "inlet" });

    index++;
  }

  // Parse flow-out connectors (outlets from the system)
  for (const connEl of flowOutConnectors) {
    const id = connEl.getAttribute("ID") || `ext_out_${index}`;
    const name =
      getGenericAttributeValue(connEl, "PipeConnectorNumberAssignmentClass") ||
      `External Output ${index + 1}`;

    // Get position from Position element
    const positionEl = connEl.querySelector("Position > Location");
    const layout = positionEl
      ? {
          x: parseFloat(positionEl.getAttribute("X") || "0"),
          y: parseFloat(positionEl.getAttribute("Y") || "0"),
        }
      : undefined;

    ports.push({
      id,
      name,
      direction: "outlet",
      flowType: "material",
      layout,
    });

    // Register in portMap for connection resolution
    portMap.set(id, { stepId: id, direction: "outlet" });

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
  equipmentElements: Element[],
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
    // Only check top-level Equipment (not ShapeCatalogue or nested sub-components)
    const topLevelEquipment = getTopLevelEquipment(root);
    const piping = root.querySelectorAll("PipingNetworkSystem");

    if (topLevelEquipment.length === 0 && piping.length === 0) {
      warnings.push("No Equipment or PipingNetworkSystem elements found");
    }

    // Validate top-level equipment elements
    for (const eq of topLevelEquipment) {
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
