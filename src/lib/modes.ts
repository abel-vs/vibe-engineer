import { getPidNodeTypes } from "./dexpi-config";

export type DiagramMode = "playground" | "bfd" | "pfd" | "pid";

export interface ModeConfig {
  id: DiagramMode;
  name: string;
  shortName: string;
  description: string;
  availableNodeTypes: string[];
  availableEdgeTypes: string[];
  rules: string[];
}

// Simplified PFD equipment types - one DEXPI symbol per category
// Specific equipment details can be set in properties
const pfdSimplifiedTypes = [
  "pfd_vessel", // Generic tank/vessel/reactor/column (DEXPI Vessels)
  "pfd_pump", // Generic pump (DEXPI Pumps_ISO)
  "pfd_compressor", // Generic compressor (DEXPI Compressors_ISO)
  "pfd_exchanger", // Generic heat exchanger (DEXPI Heat_Exchangers)
  "pfd_separator", // Generic separator/cyclone (DEXPI Separators)
  "pfd_mixer", // Generic mixer (DEXPI Mixers)
  "pfd_filter", // Generic filter (DEXPI Filters)
  "pfd_agitator", // Generic agitator (DEXPI Agitators)
  "pfd_text", // Text label for streams/annotations
];

// Get DEXPI equipment types for P&ID mode (full equipment including valves/instruments)
const pidEquipmentTypes = getPidNodeTypes();

export const MODES: Record<DiagramMode, ModeConfig> = {
  playground: {
    id: "playground",
    name: "Playground",
    shortName: "Play",
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
    shortName: "BFD",
    description:
      "High-level process overview with blocks representing unit operations",
    availableNodeTypes: ["process_block", "input_output", "storage"],
    availableEdgeTypes: [
      "material_stream",
      "energy_stream",
      "utility_stream",
      "signal",
    ],
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
      "BFD is conceptual - no individual equipment details, valves, or instruments",
    ],
  },
  pfd: {
    id: "pfd",
    name: "Process Flow Diagram",
    shortName: "PFD",
    description:
      "Generic equipment with operating conditions. Specify details in properties.",
    availableNodeTypes: pfdSimplifiedTypes,
    availableEdgeTypes: ["material_stream", "energy_stream", "utility_stream"],
    rules: [
      "Uses DEXPI standard symbols (one generic per category)",
      "Include operating conditions on streams: temperature, pressure, flow rates",
      "NO individual valves (those are P&ID details)",
      "NO instruments or control loops (those are P&ID details)",
      "Equipment should have tag numbers (e.g., V-101, P-201, E-301)",
      "Stream numbers required (S-1, S-2, etc.) with flow rates",
      "Main process flow runs LEFT to RIGHT",
      "pfd_vessel = tanks, reactors, columns, drums",
      "pfd_pump = any pump type",
      "pfd_exchanger = heat exchangers, coolers, condensers",
      "pfd_separator = separators, cyclones, scrubbers",
      "pfd_mixer = mixers, blenders",
      "pfd_filter = filters, strainers",
      "pfd_agitator = agitators, stirrers",
    ],
  },
  pid: {
    id: "pid",
    name: "Piping & Instrumentation Diagram",
    shortName: "P&ID",
    description:
      "Complete diagram with all pipes, valves, instruments, and control loops",
    availableNodeTypes: pidEquipmentTypes,
    availableEdgeTypes: [
      "material_stream",
      "energy_stream",
      "utility_stream",
      "signal",
    ],
    rules: [
      "The master document for construction, commissioning, and operations",
      "Equipment uses DEXPI P&ID standard symbols (ISO 10628-2:2012)",
      "ALL equipment categories: Vessels, Pumps, Compressors, Heat Exchangers, Valves, Filters, Separators, Instruments, etc.",
      "Every valve with type (gate, globe, ball, check, control)",
      "Every instrument with tag (FT, PT, LT, TT for transmitters; FIC, PIC, LIC, TIC for controllers)",
      "Control loops showing transmitter → controller → valve relationships",
      'Pipe line numbers with size and material class (e.g., 4"-CS-101)',
      "Relief devices (PSV, PRV) with set pressures",
      "Equipment tag numbers (e.g., V-101, P-201, E-301)",
      "Utility streams (steam, cooling water, nitrogen) with line styles",
      "signal = instrumentation signals and control loops",
    ],
  },
};
