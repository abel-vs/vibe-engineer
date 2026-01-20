export type DiagramMode = "playground" | "bfd" | "pfd";

export interface ModeConfig {
  id: DiagramMode;
  name: string;
  description: string;
  availableNodeTypes: string[];
  availableEdgeTypes: string[];
  rules: string[];
}

export const MODES: Record<DiagramMode, ModeConfig> = {
  playground: {
    id: "playground",
    name: "Playground",
    description: "Free-form diagramming with all shapes available",
    availableNodeTypes: ["rectangle", "circle", "diamond", "triangle", "text"],
    availableEdgeTypes: ["default", "arrow", "dashed"],
    rules: [
      "No restrictions - any shape can connect to any other shape",
      "Labels are optional",
      "Freeform positioning allowed",
    ],
  },
  bfd: {
    id: "bfd",
    name: "Block Flow Diagram",
    description: "Simplified process overview showing major units and streams",
    availableNodeTypes: ["process_block", "input_output", "storage"],
    availableEdgeTypes: ["material_stream", "energy_stream", "signal"],
    rules: [
      "Each block represents a major process unit or group of units",
      "Streams show main material and energy flows",
      "Labels should include stream names and key parameters (flow rate, temp)",
      "Left-to-right flow direction is conventional",
      "Blocks should have unique identifiers (e.g., UNIT-100)",
    ],
  },
  pfd: {
    id: "pfd",
    name: "Process Flow Diagram",
    description: "Detailed process diagram with equipment and instrumentation",
    availableNodeTypes: [
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
    ],
    availableEdgeTypes: ["material_stream", "energy_stream", "utility_stream"],
    rules: [
      "Equipment should have tag numbers (e.g., R-101, P-201, E-301)",
      "Streams must have stream numbers and key properties",
      "Material streams show flow direction with arrows",
      "Equipment sizing info can be added to labels",
      "Utility streams (steam, cooling water) use different line styles",
    ],
  },
};
