import { getPfdNodeTypes } from "./dexpi-config";

export type DiagramMode = "playground" | "bfd" | "pfd";

export interface ModeConfig {
  id: DiagramMode;
  name: string;
  description: string;
  availableNodeTypes: string[];
  availableEdgeTypes: string[];
  rules: string[];
}

// Get DEXPI equipment types for PFD mode
const pfdEquipmentTypes = getPfdNodeTypes();

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
    availableEdgeTypes: ["material_stream", "energy_stream", "utility_stream", "signal"],
    rules: [
      "process_block = equipment/process units that transform material (Reactor, Dryer, Filter, Pump, Turbine, HRSG, Compressor, Settler Separator, etc.)",
      "input_output = text labels for inputs/outputs at system boundaries (raw materials like 'Biomass Fuel', 'Air', 'N2' or outputs like 'Spent Gas', 'Ash', 'Steam')",
      "storage = tanks, vessels for holding materials",
      "Flow rates and temperatures go as EDGE LABELS, not node labels (e.g., edge label: '150,000 kg/hr')",
      "Main process flow runs LEFT to RIGHT; inputs enter from left/top; outputs exit right/bottom",
      "Blocks should have short descriptive names (e.g., 'Dryer', 'Reactor/Gasifier', 'HRSG')",
      "material_stream = physical material flows (liquids, gases, solids)",
      "energy_stream = heat and energy transfers",
      "utility_stream = utility streams (steam, cooling water, etc.)",
      "signal = control signals and data flows",
    ],
  },
  pfd: {
    id: "pfd",
    name: "Process Flow Diagram",
    description: "Detailed process diagram with DEXPI equipment symbols and instrumentation",
    availableNodeTypes: pfdEquipmentTypes,
    availableEdgeTypes: ["material_stream", "energy_stream", "utility_stream"],
    rules: [
      "Equipment uses DEXPI P&ID standard symbols (ISO 10628-2:2012)",
      "Equipment categories include: Vessels, Pumps, Compressors, Heat Exchangers, Valves, Filters, Separators, Instruments, etc.",
      "Each category has multiple symbol variants - select via Properties panel",
      "Equipment should have tag numbers (e.g., R-101, P-201, E-301)",
      "Streams must have stream numbers and key properties",
      "Material streams show flow direction with arrows",
      "Equipment sizing info can be added to node properties",
      "Utility streams (steam, cooling water) use different line styles",
    ],
  },
};
