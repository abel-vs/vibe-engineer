/**
 * DEXPI XML to React Flow Converter
 * Parses DEXPI XML and converts to React Flow nodes and edges
 */

import type { DiagramMode } from "@/lib/modes";
import type { Edge, Node } from "@xyflow/react";
import {
  detectModeFromDexpiTypes,
  dexpiFlowToStreamType,
  dexpiToEdgeType,
  dexpiToNodeType,
  getDexpiNodeTypeFromComponentClass,
  getFallbackEdgeType,
  getFallbackNodeType,
  getNodeTypeFromComponentClass,
  getSymbolIndexFromComponentClass,
} from "./mapping";
import type {
  DexpiDocument,
  DexpiProcessStepType,
  ExternalPort,
  ProcessConnection,
  ProcessModel,
  ProcessStep,
} from "./types";
import { parseDexpiXml, validateDexpiXml } from "./xml-utils";

// ============================================================================
// Types
// ============================================================================

export interface DexpiImportResult {
  nodes: Node[];
  edges: Edge[];
  mode: DiagramMode;
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: string;
    applicationSource?: string;
  };
  warnings: string[];
}

// ============================================================================
// Position Transformation Constants
// ============================================================================

// DEXPI uses mm coordinates - scale up for better React Flow canvas usage
const POSITION_SCALE_FACTOR = 4;

// DEXPI Y-axis increases upward, React Flow Y increases downward
// We invert by negating and adding offset to keep all values positive
const INVERT_Y_AXIS = true;

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Convert DEXPI XML string to React Flow state
 */
export function dexpiToReactFlow(xmlString: string): DexpiImportResult {
  // Validate XML first
  const validation = validateDexpiXml(xmlString);
  if (!validation.valid) {
    throw new Error(`Invalid DEXPI XML: ${validation.errors.join(", ")}`);
  }

  const warnings: string[] = [...validation.warnings];

  // Parse XML to ProcessModel
  const dexpiDoc = parseDexpiXml(xmlString);
  const { processModel } = dexpiDoc;

  console.log("[DEXPI Import] ProcessModel:", {
    name: processModel.name,
    processSteps: processModel.processSteps.length,
    externalPorts: processModel.externalPorts.length,
    processConnections: processModel.processConnections.length,
  });

  // Log detailed info about ports
  console.log("[DEXPI Import] ProcessStep ports:");
  for (const step of processModel.processSteps) {
    console.log(
      `  - ${step.id}: ${step.ports.length} ports`,
      step.ports.map((p) => p.id)
    );
  }

  console.log("[DEXPI Import] ProcessConnections:");
  for (const conn of processModel.processConnections) {
    console.log(`  - ${conn.id}: ${conn.fromPort} -> ${conn.toPort}`);
  }

  // Detect mode from diagram type or process step types
  const mode = detectMode(processModel);

  // Calculate Y offset for inverting coordinates
  // Find the maximum Y value to use as offset
  const yOffset = calculateYOffset(processModel);

  // Convert ProcessSteps to nodes
  const stepNodes = processModel.processSteps.map((step) =>
    convertProcessStepToNode(step, mode, warnings, yOffset)
  );

  // Convert ExternalPorts to nodes
  const externalNodes = processModel.externalPorts.map((port) =>
    convertExternalPortToNode(port, warnings, yOffset)
  );

  const nodes = [...stepNodes, ...externalNodes];

  // Build port to node mapping for edge conversion
  const portToNodeMap = buildPortToNodeMap(processModel);

  console.log("[DEXPI Import] Port to Node map:");
  portToNodeMap.forEach((value, key) => {
    console.log(`  - ${key} -> node: ${value.nodeId}, handle: ${value.handle}`);
  });

  // Convert ProcessConnections to edges
  const edges = processModel.processConnections.map((conn) =>
    convertProcessConnectionToEdge(conn, portToNodeMap, warnings)
  );

  console.log("[DEXPI Import] Created edges:", edges.length, edges);

  // Auto-layout nodes that don't have position
  layoutNodesWithoutPosition(nodes);

  return {
    nodes,
    edges,
    mode,
    metadata: {
      name: processModel.name,
      description: processModel.description,
      createdAt: processModel.metadata?.createdAt,
      applicationSource: processModel.metadata?.applicationSource,
    },
    warnings,
  };
}

/**
 * Calculate Y offset for coordinate inversion
 * Finds the maximum Y value across all elements
 */
function calculateYOffset(model: ProcessModel): number {
  if (!INVERT_Y_AXIS) return 0;

  let maxY = 0;

  for (const step of model.processSteps) {
    if (step.layout) {
      maxY = Math.max(maxY, step.layout.y);
    }
  }

  for (const port of model.externalPorts) {
    if (port.layout) {
      maxY = Math.max(maxY, port.layout.y);
    }
  }

  // Add some padding to the max Y
  return (maxY + 50) * POSITION_SCALE_FACTOR;
}

/**
 * Transform DEXPI coordinates to React Flow coordinates
 * - Scales by POSITION_SCALE_FACTOR
 * - Inverts Y axis if INVERT_Y_AXIS is true
 */
function transformPosition(
  x: number,
  y: number,
  yOffset: number
): { x: number; y: number } {
  const scaledX = x * POSITION_SCALE_FACTOR;
  const scaledY = INVERT_Y_AXIS
    ? yOffset - y * POSITION_SCALE_FACTOR
    : y * POSITION_SCALE_FACTOR;

  return { x: scaledX, y: scaledY };
}

/**
 * Parse DEXPI XML and return the ProcessModel (for inspection)
 */
export function parseDexpiToModel(xmlString: string): DexpiDocument {
  const validation = validateDexpiXml(xmlString);
  if (!validation.valid) {
    throw new Error(`Invalid DEXPI XML: ${validation.errors.join(", ")}`);
  }
  return parseDexpiXml(xmlString);
}

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Detect diagram mode from ProcessModel
 */
function detectMode(model: ProcessModel): DiagramMode {
  // First check explicit diagram type
  if (model.diagramType === "P&ID") return "pid";
  if (model.diagramType === "PFD") return "pfd";
  if (model.diagramType === "BFD") return "bfd";

  // Fall back to detecting from process step types
  const stepTypes = model.processSteps.map((s) => s.type);
  return detectModeFromDexpiTypes(stepTypes);
}

// ============================================================================
// Node Conversion
// ============================================================================

/**
 * Convert a ProcessStep to a React Flow node
 */
function convertProcessStepToNode(
  step: ProcessStep,
  mode: DiagramMode,
  warnings: string[],
  yOffset: number
): Node {
  // Get React Flow node type
  let nodeType: string;
  let dexpiCategory: string | undefined;

  // For P&ID mode, use DEXPI node types that render SVG symbols
  if (mode === "pid" && step.originalNodeType) {
    const dexpiInfo = getDexpiNodeTypeFromComponentClass(step.originalNodeType);
    if (dexpiInfo) {
      nodeType = dexpiInfo.nodeType;
      dexpiCategory = dexpiInfo.category;
    } else {
      // Fall back to simple node type mapping
      nodeType = getNodeTypeFromComponentClass(step.originalNodeType, "pfd");
      warnings.push(
        `No DEXPI category mapping for ComponentClass "${step.originalNodeType}" - using simple node type "${nodeType}"`
      );
    }
  } else if (step.originalNodeType) {
    // For non-P&ID modes, use the original node type mapping
    // Try to map from ComponentClass name (DEXPI 1.x) or use directly (DEXPI 2.0 round-trip)
    const mappedType = getNodeTypeFromComponentClass(
      step.originalNodeType,
      mode === "pfd" ? "pfd" : "bfd"
    );
    // If mapping found a different type than the fallback, use it
    // Otherwise, check if originalNodeType is already a valid React Flow type
    if (mappedType !== getFallbackNodeType(mode === "pfd" ? "pfd" : "bfd")) {
      nodeType = mappedType;
    } else {
      // originalNodeType might already be a React Flow type (round-trip from 2.0)
      nodeType = step.originalNodeType;
    }
  } else {
    // Map from DEXPI type
    nodeType = mapDexpiTypeToNodeType(step.type, mode);

    // Add warning if we couldn't find a perfect match
    if (!dexpiToNodeType[step.type]) {
      warnings.push(
        `Unknown DEXPI type "${step.type}" for step "${step.name}" - using fallback type "${nodeType}"`
      );
    }
  }

  // Build node data - only set label if there's an actual name
  const data: Record<string, unknown> = {};

  if (step.name) {
    data.label = step.name;
  }

  if (step.description) {
    data.description = step.description;
  }

  // Add DEXPI category for P&ID mode SVG rendering
  if (dexpiCategory) {
    data.dexpiCategory = dexpiCategory;
    // Get the specific symbol index for this ComponentClass (e.g., GlobeValve -> index 2)
    data.symbolIndex = step.originalNodeType
      ? getSymbolIndexFromComponentClass(step.originalNodeType)
      : 0;
  }

  // Convert parameters to properties
  if (step.parameters && step.parameters.length > 0) {
    const properties: Record<string, string> = {};
    for (const param of step.parameters) {
      properties[param.name] =
        String(param.value) + (param.unit ? ` ${param.unit}` : "");
    }
    data.properties = properties;
  }

  // Extract nozzle metadata for equipment nodes (for P&ID display)
  // Only include primary nozzle ports (those starting with "Nozzle-"), not PipingNode-X duplicates
  const nozzlePorts = step.ports.filter((p) => p.id.startsWith("Nozzle-"));
  if (nozzlePorts.length > 0) {
    data.nozzles = nozzlePorts.map((p) => ({
      id: p.id,
      label: p.name,
      direction: p.direction,
    }));
  }

  // Get position from layout and transform to React Flow coordinates
  const position = step.layout
    ? transformPosition(step.layout.x, step.layout.y, yOffset)
    : { x: 0, y: 0 }; // Will be auto-laid out later

  return {
    id: step.id,
    type: nodeType,
    position,
    data,
  };
}

/**
 * Convert an ExternalPort to a React Flow node (input_output type)
 */
function convertExternalPortToNode(
  port: ExternalPort,
  _warnings: string[],
  yOffset: number
): Node {
  // Transform position to React Flow coordinates
  const position = port.layout
    ? transformPosition(port.layout.x, port.layout.y, yOffset)
    : { x: 0, y: 0 };

  return {
    id: port.id,
    type: "input_output",
    position,
    data: {
      label: port.name,
    },
  };
}

/**
 * Map DEXPI ProcessStep type to React Flow node type
 */
function mapDexpiTypeToNodeType(
  dexpiType: DexpiProcessStepType,
  mode: DiagramMode
): string {
  // Check direct mapping first
  if (dexpiToNodeType[dexpiType]) {
    const nodeType = dexpiToNodeType[dexpiType];

    // For "storage" types in PFD mode, we might want to use "tank" or "vessel"
    if (nodeType === "storage" && mode === "pfd") {
      return "tank"; // Default to tank in PFD mode
    }

    return nodeType;
  }

  // Return fallback
  return getFallbackNodeType(mode);
}

// ============================================================================
// Edge Conversion
// ============================================================================

/**
 * Build a map from port IDs to node IDs and handle info
 */
function buildPortToNodeMap(
  model: ProcessModel
): Map<string, { nodeId: string; handle: string }> {
  const map = new Map<string, { nodeId: string; handle: string }>();

  // Process ProcessStep ports
  for (const step of model.processSteps) {
    // Map each port to its parent node
    for (const port of step.ports) {
      map.set(port.id, {
        nodeId: step.id,
        handle: extractHandleFromPortId(port.id, step.id),
      });
    }

    // Also register the step ID itself as a valid port reference
    // This is needed for PipingComponents (valves, tees, etc.) that are referenced
    // directly by their ID in connections rather than by their port IDs
    map.set(step.id, {
      nodeId: step.id,
      handle: "default",
    });
  }

  // Process ExternalPorts - they act as both node and port
  for (const extPort of model.externalPorts) {
    // For external ports, the node ID is the port ID
    map.set(extPort.id, {
      nodeId: extPort.id,
      handle: extPort.direction === "inlet" ? "default" : "default",
    });

    // Also map any port-style IDs that might reference this node
    map.set(`${extPort.id}_out_default`, {
      nodeId: extPort.id,
      handle: "default",
    });
    map.set(`${extPort.id}_in_default`, {
      nodeId: extPort.id,
      handle: "default",
    });
  }

  return map;
}

/**
 * Extract handle name from port ID
 * Port IDs are typically formatted as: nodeId_in/out_handleName
 */
function extractHandleFromPortId(portId: string, nodeId: string): string {
  // Remove the nodeId prefix
  const withoutNodeId = portId.replace(`${nodeId}_`, "");

  // Remove direction prefix (in_ or out_)
  const handle = withoutNodeId.replace(/^(in|out)_/, "");

  return handle || "default";
}

/**
 * Convert a ProcessConnection to a React Flow edge
 */
function convertProcessConnectionToEdge(
  conn: ProcessConnection,
  portMap: Map<string, { nodeId: string; handle: string }>,
  warnings: string[]
): Edge {
  // Look up source and target from port map
  const sourceInfo = portMap.get(conn.fromPort);
  const targetInfo = portMap.get(conn.toPort);

  if (!sourceInfo) {
    warnings.push(
      `Could not find source port "${conn.fromPort}" for connection "${conn.id}" - using port ID as node ID`
    );
  }
  if (!targetInfo) {
    warnings.push(
      `Could not find target port "${conn.toPort}" for connection "${conn.id}" - using port ID as node ID`
    );
  }

  // Get edge type
  let edgeType: string;
  if (conn.originalEdgeType) {
    edgeType = conn.originalEdgeType;
  } else {
    edgeType = dexpiToEdgeType[conn.type] || getFallbackEdgeType();
  }

  // Build edge data
  const data: Record<string, unknown> = {};

  if (conn.label) {
    data.label = conn.label;
  }

  // Map flow type to stream type
  data.streamType = dexpiFlowToStreamType[conn.flowType] || "material";

  // Convert stream properties
  if (conn.properties) {
    if (conn.properties.flowRate) {
      data.flowRate =
        `${conn.properties.flowRate.value} ${conn.properties.flowRate.unit}`.trim();
    }
    if (conn.properties.temperature) {
      data.temperature =
        `${conn.properties.temperature.value} ${conn.properties.temperature.unit}`.trim();
    }
    if (conn.properties.pressure) {
      data.pressure =
        `${conn.properties.pressure.value} ${conn.properties.pressure.unit}`.trim();
    }
  }

  // Convert inline components (valves, instruments) for rendering on edge
  if (conn.inlineComponents && conn.inlineComponents.length > 0) {
    data.inlineComponents = conn.inlineComponents.map((comp) => ({
      id: comp.id,
      componentClass: comp.componentClass,
      category: comp.category,
      symbolIndex: comp.symbolIndex,
      label: comp.label,
      position: comp.position,
      rotation: comp.rotation,
    }));
  }

  // Don't set handle IDs - BFD nodes only have default handles without specific IDs
  // React Flow will automatically connect to the available handles
  return {
    id: conn.id,
    source: sourceInfo?.nodeId || extractNodeIdFromPortId(conn.fromPort),
    target: targetInfo?.nodeId || extractNodeIdFromPortId(conn.toPort),
    type: edgeType,
    data,
  };
}

/**
 * Extract node ID from port ID as fallback
 * Port IDs like "unit_reactor_in_1" -> "unit_reactor"
 * External port IDs like "feed_raw_material" stay as is
 */
function extractNodeIdFromPortId(portId: string): string {
  // Check if it matches the pattern: nodeId_in/out_something
  const match = portId.match(/^(.+?)_(in|out)_\d+$/);
  if (match) {
    return match[1];
  }
  // Otherwise, return as is (likely an external port ID)
  return portId;
}

// ============================================================================
// Layout
// ============================================================================

/**
 * Auto-layout nodes that don't have position information
 */
function layoutNodesWithoutPosition(nodes: Node[]): void {
  const nodesNeedingLayout = nodes.filter(
    (n) => n.position.x === 0 && n.position.y === 0
  );

  if (nodesNeedingLayout.length === 0) return;
  if (nodesNeedingLayout.length === nodes.length) {
    // All nodes need layout - use simple grid
    layoutGrid(nodesNeedingLayout);
  } else {
    // Some nodes have positions - place others relative to positioned nodes
    layoutRelativeToExisting(nodesNeedingLayout, nodes);
  }
}

/**
 * Layout nodes in a simple grid
 */
function layoutGrid(nodes: Node[]): void {
  const SPACING_X = 250;
  const SPACING_Y = 150;
  const COLS = 4;
  const START_X = 100;
  const START_Y = 100;

  nodes.forEach((node, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    node.position = {
      x: START_X + col * SPACING_X,
      y: START_Y + row * SPACING_Y,
    };
  });
}

/**
 * Layout nodes relative to existing positioned nodes
 */
function layoutRelativeToExisting(
  nodesNeedingLayout: Node[],
  allNodes: Node[]
): void {
  const positionedNodes = allNodes.filter(
    (n) => n.position.x !== 0 || n.position.y !== 0
  );

  // Find bounding box of positioned nodes
  let maxX = 0;
  let maxY = 0;
  for (const node of positionedNodes) {
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
  }

  // Place unpositioned nodes below and to the right
  const SPACING = 150;
  nodesNeedingLayout.forEach((node, index) => {
    node.position = {
      x: maxX + SPACING,
      y: 100 + index * SPACING,
    };
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate DEXPI XML before import
 */
export function validateDexpiForImport(xmlString: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  // Basic XML validation
  const xmlValidation = validateDexpiXml(xmlString);
  if (!xmlValidation.valid) {
    return {
      valid: false,
      errors: xmlValidation.errors,
      warnings: xmlValidation.warnings,
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [...xmlValidation.warnings];

  // Try to parse
  try {
    const doc = parseDexpiXml(xmlString);
    const { processModel } = doc;

    // Check for required elements
    if (!processModel.id) {
      errors.push("ProcessModel is missing ID");
    }

    if (
      processModel.processSteps.length === 0 &&
      processModel.externalPorts.length === 0
    ) {
      warnings.push("ProcessModel has no process steps or external ports");
    }

    // Check for process connections referencing non-existent ports
    const allPortIds = new Set<string>();
    for (const step of processModel.processSteps) {
      // Add each port ID
      for (const port of step.ports) {
        allPortIds.add(port.id);
      }
      // Also add step ID itself as a valid reference (for PipingComponents)
      allPortIds.add(step.id);
    }
    for (const extPort of processModel.externalPorts) {
      allPortIds.add(extPort.id);
      allPortIds.add(`${extPort.id}_out_default`);
      allPortIds.add(`${extPort.id}_in_default`);
    }

    for (const conn of processModel.processConnections) {
      if (!allPortIds.has(conn.fromPort)) {
        warnings.push(
          `Connection "${conn.id}" references unknown source port "${conn.fromPort}"`
        );
      }
      if (!allPortIds.has(conn.toPort)) {
        warnings.push(
          `Connection "${conn.id}" references unknown target port "${conn.toPort}"`
        );
      }
    }
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
