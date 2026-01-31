/**
 * XML Serialization and Parsing Utilities for DEXPI
 * Supports both DEXPI 2.0 (DEXPI-XML) and DEXPI 1.x (Proteus Schema) formats
 * Uses browser-native DOMParser and XMLSerializer
 */

import type {
  DexpiDocument,
  ProcessModel,
  ProcessStep,
  ProcessConnection,
  ExternalPort,
  Port,
  Parameter,
  StreamProperties,
  LayoutInfo,
  DexpiProcessStepType,
  DexpiConnectionType,
  DexpiFlowType,
} from "./types";
import { DEXPI_NAMESPACE, DEXPI_VERSION, DEXPI_SCHEMA_LOCATION } from "./types";
import {
  detectDexpiVersion,
  parseDexpi1x,
  validateDexpi1x,
} from "./proteus-parser";

// ============================================================================
// XML Document Building
// ============================================================================

/**
 * Create a new XML Document with DEXPI namespace
 */
export function createDexpiDocument(): Document {
  const doc = document.implementation.createDocument(
    DEXPI_NAMESPACE,
    "DEXPI-Document",
    null
  );

  // Add XML declaration attributes to root
  const root = doc.documentElement;
  root.setAttribute("xmlns", DEXPI_NAMESPACE);
  root.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  root.setAttribute("xsi:schemaLocation", DEXPI_SCHEMA_LOCATION);
  root.setAttribute("version", DEXPI_VERSION);

  return doc;
}

/**
 * Create an element in the DEXPI namespace
 */
export function createElement(doc: Document, tagName: string): Element {
  return doc.createElementNS(DEXPI_NAMESPACE, tagName);
}

/**
 * Add a Data element with a value
 */
export function addDataElement(
  doc: Document,
  parent: Element,
  property: string,
  value: string | number | boolean
): Element {
  const dataEl = createElement(doc, "Data");
  dataEl.setAttribute("property", property);

  const valueEl = createElement(doc, getValueElementName(typeof value));
  valueEl.textContent = String(value);
  dataEl.appendChild(valueEl);

  parent.appendChild(dataEl);
  return dataEl;
}

/**
 * Get the appropriate value element name based on type
 */
function getValueElementName(type: string): string {
  switch (type) {
    case "number":
      return "Double";
    case "boolean":
      return "Boolean";
    default:
      return "String";
  }
}

/**
 * Add a Components element containing child objects
 */
export function addComponentsElement(
  doc: Document,
  parent: Element,
  property: string
): Element {
  const componentsEl = createElement(doc, "Components");
  componentsEl.setAttribute("property", property);
  parent.appendChild(componentsEl);
  return componentsEl;
}

// ============================================================================
// Build DEXPI XML from ProcessModel
// ============================================================================

/**
 * Build complete DEXPI XML document from ProcessModel
 */
export function buildDexpiXml(model: ProcessModel): string {
  const doc = createDexpiDocument();
  const root = doc.documentElement;

  // Add ProcessModel as root Object
  const processModelEl = buildProcessModelElement(doc, model);
  root.appendChild(processModelEl);

  // Serialize to string
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(doc);

  // Add XML declaration
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + formatXml(xmlString);
}

/**
 * Build ProcessModel element
 */
function buildProcessModelElement(doc: Document, model: ProcessModel): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("id", model.id);
  el.setAttribute("type", "Process/ProcessModel");

  // Add basic data
  addDataElement(doc, el, "Name", model.name);
  if (model.description) {
    addDataElement(doc, el, "Description", model.description);
  }
  addDataElement(doc, el, "DiagramType", model.diagramType);

  // Add metadata
  if (model.metadata) {
    const metadataEl = addComponentsElement(doc, el, "Metadata");
    const metaObj = createElement(doc, "Object");
    metaObj.setAttribute("type", "Core/Metadata");

    if (model.metadata.createdAt) {
      addDataElement(doc, metaObj, "CreatedAt", model.metadata.createdAt);
    }
    if (model.metadata.updatedAt) {
      addDataElement(doc, metaObj, "UpdatedAt", model.metadata.updatedAt);
    }
    if (model.metadata.applicationSource) {
      addDataElement(
        doc,
        metaObj,
        "ApplicationSource",
        model.metadata.applicationSource
      );
    }
    metadataEl.appendChild(metaObj);
  }

  // Add ProcessSteps
  if (model.processSteps.length > 0) {
    const stepsEl = addComponentsElement(doc, el, "ProcessSteps");
    for (const step of model.processSteps) {
      stepsEl.appendChild(buildProcessStepElement(doc, step));
    }
  }

  // Add ExternalPorts
  if (model.externalPorts.length > 0) {
    const portsEl = addComponentsElement(doc, el, "ExternalPorts");
    for (const port of model.externalPorts) {
      portsEl.appendChild(buildExternalPortElement(doc, port));
    }
  }

  // Add ProcessConnections
  if (model.processConnections.length > 0) {
    const connsEl = addComponentsElement(doc, el, "ProcessConnections");
    for (const conn of model.processConnections) {
      connsEl.appendChild(buildProcessConnectionElement(doc, conn));
    }
  }

  return el;
}

/**
 * Build ProcessStep element
 */
function buildProcessStepElement(doc: Document, step: ProcessStep): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("id", step.id);
  el.setAttribute("type", step.type);

  addDataElement(doc, el, "Name", step.name);
  if (step.description) {
    addDataElement(doc, el, "Description", step.description);
  }

  // Store original node type for round-trip
  if (step.originalNodeType) {
    addDataElement(doc, el, "OriginalNodeType", step.originalNodeType);
  }

  // Add layout info
  if (step.layout) {
    const layoutEl = addComponentsElement(doc, el, "Layout");
    const layoutObj = createElement(doc, "Object");
    layoutObj.setAttribute("type", "Extension/Layout");
    addDataElement(doc, layoutObj, "X", step.layout.x);
    addDataElement(doc, layoutObj, "Y", step.layout.y);
    if (step.layout.width)
      addDataElement(doc, layoutObj, "Width", step.layout.width);
    if (step.layout.height)
      addDataElement(doc, layoutObj, "Height", step.layout.height);
    layoutEl.appendChild(layoutObj);
  }

  // Add ports
  if (step.ports.length > 0) {
    const portsEl = addComponentsElement(doc, el, "Ports");
    for (const port of step.ports) {
      portsEl.appendChild(buildPortElement(doc, port));
    }
  }

  // Add parameters
  if (step.parameters && step.parameters.length > 0) {
    const paramsEl = addComponentsElement(doc, el, "Parameters");
    for (const param of step.parameters) {
      paramsEl.appendChild(buildParameterElement(doc, param));
    }
  }

  return el;
}

/**
 * Build Port element
 */
function buildPortElement(doc: Document, port: Port): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("id", port.id);
  el.setAttribute("type", `Process/${capitalize(port.flowType)}Port`);

  addDataElement(doc, el, "Name", port.name);
  addDataElement(doc, el, "Direction", port.direction);
  addDataElement(doc, el, "FlowType", port.flowType);

  return el;
}

/**
 * Build ExternalPort element
 */
function buildExternalPortElement(doc: Document, port: ExternalPort): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("id", port.id);
  el.setAttribute("type", "Process/ExternalPort");

  addDataElement(doc, el, "Name", port.name);
  addDataElement(doc, el, "Direction", port.direction);
  addDataElement(doc, el, "FlowType", port.flowType);

  // Add layout info
  if (port.layout) {
    const layoutEl = addComponentsElement(doc, el, "Layout");
    const layoutObj = createElement(doc, "Object");
    layoutObj.setAttribute("type", "Extension/Layout");
    addDataElement(doc, layoutObj, "X", port.layout.x);
    addDataElement(doc, layoutObj, "Y", port.layout.y);
    layoutEl.appendChild(layoutObj);
  }

  return el;
}

/**
 * Build ProcessConnection element
 */
function buildProcessConnectionElement(
  doc: Document,
  conn: ProcessConnection
): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("id", conn.id);
  el.setAttribute("type", conn.type);

  addDataElement(doc, el, "FromPort", conn.fromPort);
  addDataElement(doc, el, "ToPort", conn.toPort);
  addDataElement(doc, el, "FlowType", conn.flowType);

  if (conn.label) {
    addDataElement(doc, el, "Label", conn.label);
  }

  // Store original edge type for round-trip
  if (conn.originalEdgeType) {
    addDataElement(doc, el, "OriginalEdgeType", conn.originalEdgeType);
  }

  // Add stream properties
  if (conn.properties) {
    const propsEl = addComponentsElement(doc, el, "StreamProperties");
    const propsObj = createElement(doc, "Object");
    propsObj.setAttribute("type", "Process/StreamProperties");

    if (conn.properties.flowRate) {
      addPhysicalQuantity(doc, propsObj, "FlowRate", conn.properties.flowRate);
    }
    if (conn.properties.temperature) {
      addPhysicalQuantity(
        doc,
        propsObj,
        "Temperature",
        conn.properties.temperature
      );
    }
    if (conn.properties.pressure) {
      addPhysicalQuantity(doc, propsObj, "Pressure", conn.properties.pressure);
    }
    if (conn.properties.composition) {
      addDataElement(doc, propsObj, "Composition", conn.properties.composition);
    }

    propsEl.appendChild(propsObj);
  }

  return el;
}

/**
 * Build Parameter element
 */
function buildParameterElement(doc: Document, param: Parameter): Element {
  const el = createElement(doc, "Object");
  el.setAttribute("type", "Process/Parameter");

  addDataElement(doc, el, "Name", param.name);
  addDataElement(doc, el, "Value", param.value);
  if (param.unit) {
    addDataElement(doc, el, "Unit", param.unit);
  }

  return el;
}

/**
 * Add PhysicalQuantity element
 */
function addPhysicalQuantity(
  doc: Document,
  parent: Element,
  property: string,
  quantity: { value: number; unit: string }
): void {
  const dataEl = createElement(doc, "Data");
  dataEl.setAttribute("property", property);

  const quantityEl = createElement(doc, "Object");
  quantityEl.setAttribute("type", "Core/PhysicalQuantity");
  addDataElement(doc, quantityEl, "Value", quantity.value);
  addDataElement(doc, quantityEl, "Unit", quantity.unit);

  dataEl.appendChild(quantityEl);
  parent.appendChild(dataEl);
}

// ============================================================================
// Parse DEXPI XML to ProcessModel (supports both 1.x and 2.0)
// ============================================================================

/**
 * Parse DEXPI XML string to ProcessModel
 * Automatically detects version (1.x Proteus or 2.0 DEXPI-XML) and uses appropriate parser
 */
export function parseDexpiXml(xmlString: string): DexpiDocument {
  // Detect version first
  const versionInfo = detectDexpiVersion(xmlString);

  console.log("[DEXPI Parser] Detected version:", versionInfo);

  // Use appropriate parser based on version
  if (versionInfo.format === "proteus" || versionInfo.version === "1.x") {
    console.log("[DEXPI Parser] Using DEXPI 1.x (Proteus) parser");
    return parseDexpi1x(xmlString);
  }

  // Default to DEXPI 2.0 parser
  console.log("[DEXPI Parser] Using DEXPI 2.0 parser");
  return parseDexpi2x(xmlString);
}

/**
 * Parse DEXPI 2.0 (DEXPI-XML) format
 */
function parseDexpi2x(xmlString: string): DexpiDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`XML Parse Error: ${parseError.textContent}`);
  }

  const root = doc.documentElement;
  const version = root.getAttribute("version") || DEXPI_VERSION;

  // Find the ProcessModel object
  const processModelEl = root.querySelector(
    'Object[type="Process/ProcessModel"]'
  );
  if (!processModelEl) {
    throw new Error("No ProcessModel found in DEXPI document");
  }

  const processModel = parseProcessModel(processModelEl);

  return {
    version,
    processModel,
  };
}

/**
 * Parse ProcessModel element
 */
function parseProcessModel(el: Element): ProcessModel {
  const id = el.getAttribute("id") || generateId("pm");
  const name = getDataValue(el, "Name") || "Untitled";
  const description = getDataValue(el, "Description");
  const diagramType =
    (getDataValue(el, "DiagramType") as "BFD" | "PFD") || "BFD";

  // Parse metadata (case-insensitive)
  const metadataContainer = getComponentsElement(el, "Metadata");
  const metadataObjects = metadataContainer
    ? getChildObjects(metadataContainer)
    : [];
  const metadataEl = metadataObjects[0];
  const metadata = metadataEl
    ? {
        createdAt: getDataValue(metadataEl, "CreatedAt"),
        updatedAt: getDataValue(metadataEl, "UpdatedAt"),
        applicationSource: getDataValue(metadataEl, "ApplicationSource"),
      }
    : undefined;

  // Parse ProcessSteps (case-insensitive)
  const stepsContainer = getComponentsElement(el, "ProcessSteps");
  const stepElements = stepsContainer ? getChildObjects(stepsContainer) : [];
  const processSteps: ProcessStep[] = stepElements.map(parseProcessStep);

  // Parse ExternalPorts (case-insensitive)
  const externalPortsContainer = getComponentsElement(el, "ExternalPorts");
  const externalPortElements = externalPortsContainer
    ? getChildObjects(externalPortsContainer)
    : [];
  const externalPorts: ExternalPort[] =
    externalPortElements.map(parseExternalPort);

  // Parse ProcessConnections (case-insensitive)
  const connsContainer = getComponentsElement(el, "ProcessConnections");
  const connElements = connsContainer ? getChildObjects(connsContainer) : [];
  const processConnections: ProcessConnection[] = connElements.map(
    parseProcessConnection
  );

  return {
    id,
    name,
    description,
    diagramType,
    processSteps,
    processConnections,
    externalPorts,
    metadata,
  };
}

/**
 * Parse ProcessStep element
 */
function parseProcessStep(el: Element): ProcessStep {
  const id = el.getAttribute("id") || generateId("ps");
  const type =
    (el.getAttribute("type") as DexpiProcessStepType) ||
    "Process/Process.GenericProcessStep";
  const name = getDataValue(el, "Name") || "Unnamed Step";
  const description = getDataValue(el, "Description");
  const originalNodeType = getDataValue(el, "OriginalNodeType");

  // Parse layout - try nested Layout object first, then dot notation
  const layoutContainer = getComponentsElement(el, "Layout");
  const layoutObjects = layoutContainer ? getChildObjects(layoutContainer) : [];
  const layoutEl = layoutObjects[0];
  const layout = layoutEl
    ? parseLayout(layoutEl)
    : parseLayoutFromDotNotation(el);

  // Parse ports (case-insensitive)
  const portsContainer = getComponentsElement(el, "Ports");
  const portElements = portsContainer ? getChildObjects(portsContainer) : [];
  const ports: Port[] = portElements.map((portEl) => parsePort(portEl, id));

  // Parse parameters (case-insensitive)
  const paramsContainer = getComponentsElement(el, "Parameters");
  const paramElements = paramsContainer ? getChildObjects(paramsContainer) : [];
  const parameters: Parameter[] = paramElements.map(parseParameter);

  return {
    id,
    type,
    name,
    description,
    ports,
    parameters: parameters.length > 0 ? parameters : undefined,
    layout,
    originalNodeType,
  };
}

/**
 * Parse Port element
 */
function parsePort(el: Element, stepId: string): Port {
  const id = el.getAttribute("id") || generateId("port");
  const name = getDataValue(el, "Name") || "Port";
  const direction =
    (getDataValue(el, "Direction") as "inlet" | "outlet") || "inlet";
  const flowType =
    (getDataValue(el, "FlowType") as DexpiFlowType) || "material";

  return {
    id,
    name,
    direction,
    flowType,
    stepId,
  };
}

/**
 * Parse ExternalPort element
 */
function parseExternalPort(el: Element): ExternalPort {
  const id = el.getAttribute("id") || generateId("ep");
  const name = getDataValue(el, "Name") || "External Port";
  const direction =
    (getDataValue(el, "Direction") as "inlet" | "outlet") || "inlet";
  const flowType =
    (getDataValue(el, "FlowType") as DexpiFlowType) || "material";

  // Parse layout - try nested Layout object first, then dot notation
  const layoutContainer = getComponentsElement(el, "Layout");
  const layoutObjects = layoutContainer ? getChildObjects(layoutContainer) : [];
  const layoutEl = layoutObjects[0];
  const layout = layoutEl
    ? parseLayout(layoutEl)
    : parseLayoutFromDotNotation(el);

  return {
    id,
    name,
    direction,
    flowType,
    layout,
  };
}

/**
 * Parse ProcessConnection element
 */
function parseProcessConnection(el: Element): ProcessConnection {
  const id = el.getAttribute("id") || generateId("conn");
  const type =
    (el.getAttribute("type") as DexpiConnectionType) ||
    "Process/Process.MaterialFlow";
  const fromPort = getDataValue(el, "FromPort") || "";
  const toPort = getDataValue(el, "ToPort") || "";
  const flowType =
    (getDataValue(el, "FlowType") as DexpiFlowType) || "material";
  const label = getDataValue(el, "Label");
  const originalEdgeType = getDataValue(el, "OriginalEdgeType");

  // Parse stream properties (case-insensitive, handle both nested and dot notation)
  const propsContainer =
    getComponentsElement(el, "StreamProperties") ||
    getComponentsElement(el, "Properties");
  const propsObjects = propsContainer ? getChildObjects(propsContainer) : [];
  const propsEl = propsObjects[0];
  const properties = propsEl
    ? parseStreamProperties(propsEl)
    : parseStreamPropertiesFromDotNotation(el);

  return {
    id,
    type,
    fromPort,
    toPort,
    flowType,
    label,
    properties,
    originalEdgeType,
  };
}

/**
 * Parse StreamProperties element (handles both nested objects and dot notation)
 */
function parseStreamProperties(el: Element): StreamProperties {
  // Try nested object structure first
  let flowRate = parsePhysicalQuantity(el, "FlowRate");
  let temperature = parsePhysicalQuantity(el, "Temperature");
  let pressure = parsePhysicalQuantity(el, "Pressure");
  const composition = getDataValue(el, "Composition");

  // If nested didn't work, try dot notation
  if (!flowRate) {
    const flowRateValue = getDataValueDotNotation(el, "flowRate.value");
    const flowRateUnit = getDataValueDotNotation(el, "flowRate.unit");
    if (flowRateValue) {
      flowRate = { value: parseFloat(flowRateValue), unit: flowRateUnit || "" };
    }
  }

  if (!temperature) {
    const tempValue = getDataValueDotNotation(el, "temperature.value");
    const tempUnit = getDataValueDotNotation(el, "temperature.unit");
    if (tempValue) {
      temperature = { value: parseFloat(tempValue), unit: tempUnit || "" };
    }
  }

  if (!pressure) {
    const pressureValue = getDataValueDotNotation(el, "pressure.value");
    const pressureUnit = getDataValueDotNotation(el, "pressure.unit");
    if (pressureValue) {
      pressure = { value: parseFloat(pressureValue), unit: pressureUnit || "" };
    }
  }

  return {
    flowRate,
    temperature,
    pressure,
    composition,
  };
}

/**
 * Parse PhysicalQuantity from Data element
 */
function parsePhysicalQuantity(
  parent: Element,
  property: string
): { value: number; unit: string } | undefined {
  const dataEl = parent.querySelector(`Data[property="${property}"]`);
  if (!dataEl) return undefined;

  const quantityEl = dataEl.querySelector("Object");
  if (!quantityEl) return undefined;

  const value = parseFloat(getDataValue(quantityEl, "Value") || "0");
  const unit = getDataValue(quantityEl, "Unit") || "";

  return { value, unit };
}

/**
 * Parse Parameter element
 */
function parseParameter(el: Element): Parameter {
  const name = getDataValue(el, "Name") || "Parameter";
  const valueStr = getDataValue(el, "Value") || "";
  const unit = getDataValue(el, "Unit");

  // Try to parse as number
  const numValue = parseFloat(valueStr);
  const value = isNaN(numValue) ? valueStr : numValue;

  return {
    name,
    value,
    unit,
  };
}

/**
 * Parse Layout element
 */
function parseLayout(el: Element): LayoutInfo {
  const x = parseFloat(getDataValue(el, "X") || "0");
  const y = parseFloat(getDataValue(el, "Y") || "0");
  const width = getDataValue(el, "Width");
  const height = getDataValue(el, "Height");

  return {
    x,
    y,
    width: width ? parseFloat(width) : undefined,
    height: height ? parseFloat(height) : undefined,
  };
}

/**
 * Parse layout from dot notation (e.g., layout.x, layout.y)
 */
function parseLayoutFromDotNotation(el: Element): LayoutInfo | undefined {
  const xStr = getDataValueDotNotation(el, "layout.x");
  const yStr = getDataValueDotNotation(el, "layout.y");

  // If no dot notation layout, return undefined
  if (!xStr && !yStr) return undefined;

  const x = parseFloat(xStr || "0");
  const y = parseFloat(yStr || "0");
  const widthStr = getDataValueDotNotation(el, "layout.width");
  const heightStr = getDataValueDotNotation(el, "layout.height");

  return {
    x,
    y,
    width: widthStr ? parseFloat(widthStr) : undefined,
    height: heightStr ? parseFloat(heightStr) : undefined,
  };
}

/**
 * Parse stream properties from dot notation (e.g., flowRate.value, flowRate.unit)
 */
function parseStreamPropertiesFromDotNotation(
  el: Element
): StreamProperties | undefined {
  const flowRateValue = getDataValueDotNotation(el, "flowRate.value");
  const flowRateUnit = getDataValueDotNotation(el, "flowRate.unit");
  const tempValue = getDataValueDotNotation(el, "temperature.value");
  const tempUnit = getDataValueDotNotation(el, "temperature.unit");
  const pressureValue = getDataValueDotNotation(el, "pressure.value");
  const pressureUnit = getDataValueDotNotation(el, "pressure.unit");

  // If nothing found, return undefined
  if (!flowRateValue && !tempValue && !pressureValue) return undefined;

  const properties: StreamProperties = {};

  if (flowRateValue) {
    properties.flowRate = {
      value: parseFloat(flowRateValue),
      unit: flowRateUnit || "",
    };
  }

  if (tempValue) {
    properties.temperature = {
      value: parseFloat(tempValue),
      unit: tempUnit || "",
    };
  }

  if (pressureValue) {
    properties.pressure = {
      value: parseFloat(pressureValue),
      unit: pressureUnit || "",
    };
  }

  return properties;
}

/**
 * Get data value using dot notation property name (e.g., "layout.x")
 */
function getDataValueDotNotation(
  parent: Element,
  property: string
): string | undefined {
  const dataEl = parent.querySelector(`Data[property="${property}"]`);
  if (!dataEl) return undefined;

  // Get the first child element (String, Double, Boolean, etc.)
  const valueEl = dataEl.firstElementChild;
  return valueEl?.textContent || undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get data value from an element by property name (case-insensitive)
 */
function getDataValue(parent: Element, property: string): string | undefined {
  // Try exact match first
  let dataEl = parent.querySelector(`Data[property="${property}"]`);

  // Try lowercase match
  if (!dataEl) {
    dataEl = parent.querySelector(`Data[property="${property.toLowerCase()}"]`);
  }

  // Try with first letter lowercase (camelCase)
  if (!dataEl) {
    const camelCase = property.charAt(0).toLowerCase() + property.slice(1);
    dataEl = parent.querySelector(`Data[property="${camelCase}"]`);
  }

  if (!dataEl) return undefined;

  // Get the first child element (String, Double, Boolean, etc.)
  const valueEl = dataEl.firstElementChild;
  return valueEl?.textContent || undefined;
}

/**
 * Get Components element by property name (case-insensitive)
 */
function getComponentsElement(
  parent: Element,
  property: string
): Element | null {
  // Iterate through direct children to handle namespaced XML correctly
  const children = parent.children;
  const propertyLower = property.toLowerCase();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      child.localName === "Components" ||
      child.tagName.endsWith(":Components")
    ) {
      const propAttr = child.getAttribute("property");
      if (propAttr && propAttr.toLowerCase() === propertyLower) {
        return child;
      }
    }
  }

  return null;
}

/**
 * Get direct child Object elements from a parent
 */
function getChildObjects(parent: Element): Element[] {
  const result: Element[] = [];
  const children = parent.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.localName === "Object" || child.tagName.endsWith(":Object")) {
      result.push(child);
    }
  }

  return result;
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format XML with indentation
 */
function formatXml(xml: string): string {
  let formatted = "";
  let indent = "";
  const tab = "  ";

  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) {
      // Closing tag
      indent = indent.substring(tab.length);
    }

    formatted += indent + "<" + node + ">\n";

    if (node.match(/^<?\w[^>]*[^/]$/) && !node.startsWith("?")) {
      // Opening tag (not self-closing)
      indent += tab;
    }
  });

  return formatted.substring(1, formatted.length - 2);
}

// ============================================================================
// Validation (supports both DEXPI 1.x and 2.0)
// ============================================================================

/**
 * Validate DEXPI XML structure with comprehensive checks
 * Supports both DEXPI 1.x (Proteus Schema) and DEXPI 2.0 (DEXPI-XML) formats
 */
export function validateDexpiXml(xmlString: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // First, detect the version
    const versionInfo = detectDexpiVersion(xmlString);

    console.log("[DEXPI Validation] Detected format:", versionInfo);

    // Handle DEXPI 1.x (Proteus Schema)
    if (versionInfo.format === "proteus" || versionInfo.version === "1.x") {
      const result = validateDexpi1x(xmlString);

      // Add info about detected version
      if (versionInfo.detectedVersion) {
        warnings.push(
          `DEXPI 1.x format detected (version: ${versionInfo.detectedVersion})`
        );
      } else {
        warnings.push("DEXPI 1.x (Proteus Schema) format detected");
      }

      return result;
    }

    // Handle DEXPI 2.0
    if (versionInfo.format === "dexpi-xml" || versionInfo.version === "2.0") {
      return validateDexpi2x(xmlString);
    }

    // Unknown format
    errors.push(
      `Unrecognized DEXPI format. Root element: '${versionInfo.rootElement}'. Expected 'DEXPI-Document' (2.0) or 'PlantModel' (1.x)`
    );
    return { valid: false, errors, warnings };
  } catch (e) {
    errors.push(
      `Validation error: ${e instanceof Error ? e.message : String(e)}`
    );
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate DEXPI 2.0 (DEXPI-XML) format
 */
function validateDexpi2x(xmlString: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
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
    if (root.localName !== "DEXPI-Document") {
      errors.push(
        `Expected root element 'DEXPI-Document', found '${root.localName}'`
      );
    }

    // Check namespace
    const xmlns = root.getAttribute("xmlns");
    if (xmlns !== DEXPI_NAMESPACE) {
      warnings.push(
        `DEXPI namespace mismatch: expected '${DEXPI_NAMESPACE}', found '${
          xmlns || "none"
        }'`
      );
    }

    // Check version
    const version = root.getAttribute("version");
    if (!version) {
      warnings.push("DEXPI version attribute is missing");
    } else if (version !== DEXPI_VERSION) {
      warnings.push(
        `DEXPI version mismatch: expected '${DEXPI_VERSION}', found '${version}'`
      );
    }

    // Check for ProcessModel
    const processModelEl = root.querySelector(
      'Object[type="Process/ProcessModel"]'
    );
    if (!processModelEl) {
      errors.push("No ProcessModel object found in document");
      return { valid: false, errors, warnings };
    }

    // Validate ProcessModel structure
    const pmValidation = validateProcessModelElement(processModelEl);
    errors.push(...pmValidation.errors);
    warnings.push(...pmValidation.warnings);

    return { valid: errors.length === 0, errors, warnings };
  } catch (e) {
    errors.push(
      `Validation error: ${e instanceof Error ? e.message : String(e)}`
    );
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate ProcessModel element structure
 */
function validateProcessModelElement(el: Element): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check ID
  const id = el.getAttribute("id");
  if (!id) {
    errors.push("ProcessModel is missing required 'id' attribute");
  }

  // Check Name
  const nameData = el.querySelector('Data[property="Name"]');
  if (!nameData) {
    warnings.push("ProcessModel is missing Name property");
  }

  // Check DiagramType
  const diagramTypeData = el.querySelector('Data[property="DiagramType"]');
  if (diagramTypeData) {
    const diagramType = diagramTypeData.textContent?.trim();
    if (diagramType && !["BFD", "PFD", "P&ID"].includes(diagramType)) {
      warnings.push(
        `DiagramType '${diagramType}' is not a standard type (expected BFD, PFD, or P&ID)`
      );
    }
  }

  // Validate ProcessSteps
  const stepsContainer = getComponentsElementValidation(el, "ProcessSteps");
  if (stepsContainer) {
    const stepElements = getChildObjectsValidation(stepsContainer);
    for (const stepEl of stepElements) {
      const stepValidation = validateProcessStepElement(stepEl);
      errors.push(...stepValidation.errors);
      warnings.push(...stepValidation.warnings);
    }
  }

  // Validate ProcessConnections
  const connsContainer = getComponentsElementValidation(
    el,
    "ProcessConnections"
  );
  if (connsContainer) {
    const connElements = getChildObjectsValidation(connsContainer);
    for (const connEl of connElements) {
      const connValidation = validateProcessConnectionElement(connEl);
      errors.push(...connValidation.errors);
      warnings.push(...connValidation.warnings);
    }
  }

  return { errors, warnings };
}

/**
 * Validate ProcessStep element
 */
function validateProcessStepElement(el: Element): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const id = el.getAttribute("id");
  const type = el.getAttribute("type");

  if (!id) {
    errors.push("ProcessStep is missing required 'id' attribute");
  }

  if (!type) {
    errors.push(
      `ProcessStep '${id || "unknown"}' is missing required 'type' attribute`
    );
  } else if (!type.startsWith("Process/")) {
    warnings.push(
      `ProcessStep '${id}' has non-standard type '${type}' (should start with 'Process/')`
    );
  }

  // Check for Name
  const nameData = el.querySelector('Data[property="Name"]');
  if (!nameData) {
    warnings.push(`ProcessStep '${id}' is missing Name property`);
  }

  return { errors, warnings };
}

/**
 * Validate ProcessConnection element
 */
function validateProcessConnectionElement(el: Element): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const id = el.getAttribute("id");
  const type = el.getAttribute("type");

  if (!id) {
    errors.push("ProcessConnection is missing required 'id' attribute");
  }

  if (!type) {
    errors.push(
      `ProcessConnection '${
        id || "unknown"
      }' is missing required 'type' attribute`
    );
  }

  // Check FromPort and ToPort
  const fromPortData = el.querySelector('Data[property="FromPort"]');
  const toPortData = el.querySelector('Data[property="ToPort"]');

  if (!fromPortData) {
    errors.push(`ProcessConnection '${id}' is missing FromPort property`);
  }

  if (!toPortData) {
    errors.push(`ProcessConnection '${id}' is missing ToPort property`);
  }

  // Check FlowType
  const flowTypeData = el.querySelector('Data[property="FlowType"]');
  if (flowTypeData) {
    const flowType = flowTypeData.textContent?.trim();
    if (
      flowType &&
      !["material", "energy", "utility", "information"].includes(flowType)
    ) {
      warnings.push(
        `ProcessConnection '${id}' has non-standard FlowType '${flowType}'`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Helper: Get Components element by property name
 */
function getComponentsElementValidation(
  parent: Element,
  property: string
): Element | null {
  const children = parent.children;
  const propertyLower = property.toLowerCase();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      child.localName === "Components" ||
      child.tagName.endsWith(":Components")
    ) {
      const propAttr = child.getAttribute("property");
      if (propAttr && propAttr.toLowerCase() === propertyLower) {
        return child;
      }
    }
  }

  return null;
}

/**
 * Helper: Get direct child Object elements
 */
function getChildObjectsValidation(parent: Element): Element[] {
  const result: Element[] = [];
  const children = parent.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.localName === "Object" || child.tagName.endsWith(":Object")) {
      result.push(child);
    }
  }

  return result;
}
