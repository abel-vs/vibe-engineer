import { z } from "zod";
import { zodSchema } from "ai";

// Define the schemas for each tool
export const addNodeSchema = z.object({
  nodeType: z
    .string()
    .describe(
      "Type/shape of node. For Playground mode use: 'rectangle', 'circle', 'diamond', 'triangle', or 'text'. For BFD mode use: 'process_block', 'input_output', 'storage'. For PFD mode use: 'reactor', 'tank', 'vessel', 'pump', 'compressor', 'heat_exchanger', 'column', 'valve', 'mixer', 'splitter'. IMPORTANT: Use the exact string values listed."
    ),
  label: z
    .string()
    .optional()
    .describe("Display label for the node (e.g., 'My Triangle', 'R-101'). If omitted, defaults to the node type."),
  position: z
    .object({
      x: z.number().describe("X coordinate on canvas"),
      y: z.number().describe("Y coordinate on canvas"),
    })
    .optional()
    .describe("Position on canvas. If omitted, auto-place intelligently"),
  data: z
    .record(z.string(), z.string())
    .optional()
    .describe("Additional properties: capacity, temperature, pressure"),
});

export const addEdgeSchema = z.object({
  sourceNodeId: z
    .string()
    .describe("ID of the source node (where stream originates)"),
  targetNodeId: z
    .string()
    .describe("ID of the target node (where stream goes)"),
  edgeType: z
    .string()
    .optional()
    .describe("Type: material_stream, energy_stream, utility_stream"),
  label: z
    .string()
    .optional()
    .describe("Stream label (e.g., '500 kg/hr, 25C')"),
  data: z
    .record(z.string(), z.string())
    .optional()
    .describe("Stream properties: flowRate, temperature, pressure"),
});

export const removeNodeSchema = z.object({
  nodeId: z.string().describe("ID of the node to remove"),
});

export const removeEdgeSchema = z.object({
  edgeId: z.string().describe("ID of the edge to remove"),
});

export const updateNodeSchema = z.object({
  nodeId: z.string().describe("ID of the node to update"),
  label: z.string().optional().describe("New label for the node"),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional()
    .describe("New position for the node"),
  data: z.record(z.string(), z.string()).optional().describe("Updated properties"),
});

export const updateEdgeSchema = z.object({
  edgeId: z.string().describe("ID of the edge to update"),
  label: z.string().optional().describe("New label for the stream"),
  edgeType: z.string().optional().describe("New edge type"),
  data: z.record(z.string(), z.string()).optional().describe("Updated stream properties"),
});

export const selectElementsSchema = z.object({
  nodeIds: z.array(z.string()).optional().describe("Node IDs to select"),
  edgeIds: z.array(z.string()).optional().describe("Edge IDs to select"),
  clearPrevious: z
    .boolean()
    .default(true)
    .describe("Clear previous selection first"),
});

export const moveNodeSchema = z.object({
  nodeId: z.string().describe("ID of the node to move"),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional()
    .describe("Absolute position to move to"),
  direction: z
    .enum(["left", "right", "up", "down"])
    .optional()
    .describe("Move the node in this direction from its current position. Use this for 'move X to the right/left/up/down'."),
  offset: z
    .number()
    .optional()
    .describe("Distance to move in pixels (default: 100). Use for direction-based movement."),
  relativeTo: z
    .object({
      referenceNodeId: z.string().describe("ID of reference node"),
      direction: z.enum(["left", "right", "above", "below"]),
      offset: z.number().default(150).describe("Distance in pixels"),
    })
    .optional()
    .describe("Move relative to another node (use direction+offset above for simple moves)"),
});

export const clearCanvasSchema = z.object({
  confirm: z.boolean().describe("Must be true to confirm clearing"),
});

// Export types inferred from schemas
export type AddNodeInput = z.infer<typeof addNodeSchema>;
export type AddEdgeInput = z.infer<typeof addEdgeSchema>;
export type RemoveNodeInput = z.infer<typeof removeNodeSchema>;
export type RemoveEdgeInput = z.infer<typeof removeEdgeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type UpdateEdgeInput = z.infer<typeof updateEdgeSchema>;
export type SelectElementsInput = z.infer<typeof selectElementsSchema>;
export type MoveNodeInput = z.infer<typeof moveNodeSchema>;
export type ClearCanvasInput = z.infer<typeof clearCanvasSchema>;

// Tool definitions for use with generateText - using AI SDK 6.x format with inputSchema
export const diagramTools = {
  add_node: {
    description: "Add a new node/equipment to the diagram",
    inputSchema: zodSchema(addNodeSchema),
  },
  add_edge: {
    description: "Add a connection/stream between two nodes",
    inputSchema: zodSchema(addEdgeSchema),
  },
  remove_node: {
    description: "Remove a node from the diagram. Also removes all connected edges.",
    inputSchema: zodSchema(removeNodeSchema),
  },
  remove_edge: {
    description: "Remove a connection/stream from the diagram",
    inputSchema: zodSchema(removeEdgeSchema),
  },
  update_node: {
    description: "Update properties of an existing node",
    inputSchema: zodSchema(updateNodeSchema),
  },
  update_edge: {
    description: "Update properties of an existing edge/stream",
    inputSchema: zodSchema(updateEdgeSchema),
  },
  select_elements: {
    description: "Select one or more elements on the canvas",
    inputSchema: zodSchema(selectElementsSchema),
  },
  move_node: {
    description: "Move a node to a new position or relative to another node",
    inputSchema: zodSchema(moveNodeSchema),
  },
  clear_canvas: {
    description: "Clear all nodes and edges from the canvas",
    inputSchema: zodSchema(clearCanvasSchema),
  },
};

export type DiagramToolName = keyof typeof diagramTools;
