/**
 * React Flow to DEXPI XML Converter
 * Converts React Flow nodes and edges to DEXPI XML format
 */

import type { Node, Edge } from "@xyflow/react";
import type { DiagramMode } from "@/lib/modes";
import type {
  ProcessModel,
  ProcessStep,
  ProcessConnection,
  ExternalPort,
  Port,
  StreamProperties,
  DexpiFlowType,
} from "./types";
import { APPLICATION_SOURCE } from "./types";
import {
  nodeTypeToDexpi,
  edgeTypeToDexpi,
  streamTypeToDexpiFlow,
  isNodeTypeSupported,
} from "./mapping";
import { buildDexpiXml } from "./xml-utils";

// ============================================================================
// Types for React Flow data
// ============================================================================

interface NodeData {
  label?: string;
  description?: string;
  properties?: Record<string, string>;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
}

interface EdgeData {
  label?: string;
  streamType?: string;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
}

// ============================================================================
// Main Export Function
// ============================================================================

export interface ConvertOptions {
  name?: string;
  description?: string;
}

/**
 * Convert React Flow state to DEXPI XML string
 */
export function reactFlowToDexpi(
  nodes: Node[],
  edges: Edge[],
  mode: DiagramMode,
  options?: ConvertOptions
): string {
  // Build ProcessModel
  const processModel = buildProcessModel(nodes, edges, mode, options);

  // Serialize to XML
  return buildDexpiXml(processModel);
}

/**
 * Convert React Flow state to ProcessModel (intermediate format)
 */
export function reactFlowToProcessModel(
  nodes: Node[],
  edges: Edge[],
  mode: DiagramMode,
  options?: ConvertOptions
): ProcessModel {
  return buildProcessModel(nodes, edges, mode, options);
}

// ============================================================================
// Build ProcessModel
// ============================================================================

function buildProcessModel(
  nodes: Node[],
  edges: Edge[],
  mode: DiagramMode,
  options?: ConvertOptions
): ProcessModel {
  const timestamp = new Date().toISOString();
  const diagramType = mode === "pfd" ? "PFD" : "BFD";

  // Separate input/output nodes from process steps
  const { processStepNodes, externalPortNodes } = categorizeNodes(nodes, mode);

  // Build port map for edge connections
  const portMap = buildPortMap(nodes, edges);

  // Convert nodes to ProcessSteps
  const processSteps = processStepNodes.map((node) =>
    convertNodeToProcessStep(node, portMap.get(node.id) || [])
  );

  // Convert input/output nodes to ExternalPorts
  const externalPorts = externalPortNodes.map((node) => convertNodeToExternalPort(node));

  // Convert edges to ProcessConnections
  const processConnections = edges.map((edge) =>
    convertEdgeToProcessConnection(edge, portMap)
  );

  return {
    id: `pm_${Date.now()}`,
    name: options?.name || `${diagramType} Diagram`,
    description: options?.description,
    diagramType,
    processSteps,
    processConnections,
    externalPorts,
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      applicationSource: APPLICATION_SOURCE,
    },
  };
}

// ============================================================================
// Node Processing
// ============================================================================

/**
 * Categorize nodes into process steps and external ports
 */
function categorizeNodes(
  nodes: Node[],
  mode: DiagramMode
): {
  processStepNodes: Node[];
  externalPortNodes: Node[];
} {
  const processStepNodes: Node[] = [];
  const externalPortNodes: Node[] = [];

  for (const node of nodes) {
    const nodeType = node.type || "default";

    // In BFD mode, input_output nodes become external ports
    if (nodeType === "input_output") {
      externalPortNodes.push(node);
    } else {
      processStepNodes.push(node);
    }
  }

  return { processStepNodes, externalPortNodes };
}

/**
 * Build a map of node IDs to their ports based on edge connections
 */
function buildPortMap(nodes: Node[], edges: Edge[]): Map<string, Port[]> {
  const portMap = new Map<string, Port[]>();

  // Initialize port arrays for all nodes
  for (const node of nodes) {
    portMap.set(node.id, []);
  }

  // Create ports based on edge connections
  for (const edge of edges) {
    const { source, target, sourceHandle, targetHandle, data } = edge;
    const edgeData = data as EdgeData | undefined;
    const flowType = getFlowTypeFromEdge(edge);

    // Create source port (outlet)
    const sourcePortId = `${source}_out_${sourceHandle || "default"}`;
    const sourcePorts = portMap.get(source) || [];
    if (!sourcePorts.find((p) => p.id === sourcePortId)) {
      sourcePorts.push({
        id: sourcePortId,
        name: sourceHandle || "Output",
        direction: "outlet",
        flowType,
        stepId: source,
      });
      portMap.set(source, sourcePorts);
    }

    // Create target port (inlet)
    const targetPortId = `${target}_in_${targetHandle || "default"}`;
    const targetPorts = portMap.get(target) || [];
    if (!targetPorts.find((p) => p.id === targetPortId)) {
      targetPorts.push({
        id: targetPortId,
        name: targetHandle || "Input",
        direction: "inlet",
        flowType,
        stepId: target,
      });
      portMap.set(target, targetPorts);
    }
  }

  return portMap;
}

/**
 * Convert a React Flow node to a DEXPI ProcessStep
 */
function convertNodeToProcessStep(node: Node, ports: Port[]): ProcessStep {
  const nodeType = node.type || "default";
  const data = node.data as NodeData;

  // Get DEXPI type, fallback to generic if not supported
  const dexpiType = isNodeTypeSupported(nodeType)
    ? nodeTypeToDexpi[nodeType]
    : nodeTypeToDexpi["process_block"];

  return {
    id: node.id,
    type: dexpiType,
    name: data?.label || nodeType,
    description: data?.description,
    ports,
    layout: {
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width,
      height: node.measured?.height,
    },
    originalNodeType: nodeType,
    parameters: buildParametersFromNodeData(data),
  };
}

/**
 * Convert a React Flow input/output node to a DEXPI ExternalPort
 */
function convertNodeToExternalPort(node: Node): ExternalPort {
  const data = node.data as NodeData;

  // Determine direction based on connections or position
  // Default to "inlet" for feed nodes, "outlet" for product nodes
  // This is a heuristic - you might want to store this explicitly
  const direction: "inlet" | "outlet" = node.position.x < 200 ? "inlet" : "outlet";

  return {
    id: node.id,
    name: data?.label || "External",
    direction,
    flowType: "material",
    layout: {
      x: node.position.x,
      y: node.position.y,
    },
  };
}

/**
 * Build parameters from node data properties
 */
function buildParametersFromNodeData(data: NodeData | undefined): ProcessStep["parameters"] {
  if (!data?.properties) return undefined;

  const parameters: ProcessStep["parameters"] = [];

  for (const [key, value] of Object.entries(data.properties)) {
    if (value) {
      parameters.push({
        name: key,
        value,
      });
    }
  }

  return parameters.length > 0 ? parameters : undefined;
}

// ============================================================================
// Edge Processing
// ============================================================================

/**
 * Convert a React Flow edge to a DEXPI ProcessConnection
 */
function convertEdgeToProcessConnection(
  edge: Edge,
  portMap: Map<string, Port[]>
): ProcessConnection {
  const { id, source, target, sourceHandle, targetHandle, type, data } = edge;
  const edgeData = data as EdgeData | undefined;

  // Get port IDs
  const fromPortId = `${source}_out_${sourceHandle || "default"}`;
  const toPortId = `${target}_in_${targetHandle || "default"}`;

  // Get DEXPI connection type
  const edgeType = type || "default";
  const dexpiConnectionType = edgeTypeToDexpi[edgeType] || edgeTypeToDexpi["default"];

  // Get flow type
  const flowType = getFlowTypeFromEdge(edge);

  // Build stream properties from edge data
  const properties = buildStreamProperties(edgeData);

  return {
    id,
    type: dexpiConnectionType,
    fromPort: fromPortId,
    toPort: toPortId,
    flowType,
    label: edgeData?.label,
    properties,
    originalEdgeType: edgeType,
  };
}

/**
 * Get DEXPI flow type from edge
 */
function getFlowTypeFromEdge(edge: Edge): DexpiFlowType {
  const data = edge.data as EdgeData | undefined;
  const streamType = data?.streamType || "material";

  return streamTypeToDexpiFlow[streamType] || "material";
}

/**
 * Build StreamProperties from edge data
 */
function buildStreamProperties(data: EdgeData | undefined): StreamProperties | undefined {
  if (!data) return undefined;

  const properties: StreamProperties = {};
  let hasProperties = false;

  if (data.flowRate) {
    const parsed = parseQuantityString(data.flowRate);
    if (parsed) {
      properties.flowRate = parsed;
      hasProperties = true;
    }
  }

  if (data.temperature) {
    const parsed = parseQuantityString(data.temperature);
    if (parsed) {
      properties.temperature = parsed;
      hasProperties = true;
    }
  }

  if (data.pressure) {
    const parsed = parseQuantityString(data.pressure);
    if (parsed) {
      properties.pressure = parsed;
      hasProperties = true;
    }
  }

  return hasProperties ? properties : undefined;
}

/**
 * Parse a quantity string like "100 kg/h" into value and unit
 */
function parseQuantityString(str: string): { value: number; unit: string } | undefined {
  if (!str) return undefined;

  // Try to match number followed by optional unit
  const match = str.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return undefined;

  const value = parseFloat(match[1]);
  if (isNaN(value)) return undefined;

  return {
    value,
    unit: match[2].trim() || "",
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if the diagram can be exported to DEXPI
 */
export function canExportToDexpi(mode: DiagramMode): boolean {
  return mode === "bfd" || mode === "pfd";
}

/**
 * Get warnings for nodes that may not convert perfectly
 */
export function getExportWarnings(nodes: Node[], mode: DiagramMode): string[] {
  const warnings: string[] = [];

  for (const node of nodes) {
    const nodeType = node.type || "default";
    if (!isNodeTypeSupported(nodeType)) {
      warnings.push(
        `Node "${(node.data as NodeData)?.label || node.id}" has unsupported type "${nodeType}" - will be exported as generic process step`
      );
    }
  }

  if (mode === "playground") {
    warnings.push(
      "Playground mode is not a standard DEXPI diagram type - export may not be fully compliant"
    );
  }

  return warnings;
}
