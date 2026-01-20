import { generateText, tool } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { openai } from "@ai-sdk/openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/ai-prompt";
import type { DiagramStateForAI } from "@/lib/diagram-state";
import {
  addNodeSchema,
  addEdgeSchema,
  removeNodeSchema,
  removeEdgeSchema,
  updateNodeSchema,
  updateEdgeSchema,
  selectElementsSchema,
  moveNodeSchema,
  clearCanvasSchema,
} from "@/lib/ai-tools";

interface ToolResult {
  toolName: string;
  args: Record<string, unknown>;
  result: { success: boolean } & Record<string, unknown>;
}

// Create a mutable state tracker for multi-turn tool execution
function createStateTracker(initialState: DiagramStateForAI) {
  // Deep clone the initial state
  const state: DiagramStateForAI = JSON.parse(JSON.stringify(initialState));
  const toolResults: ToolResult[] = [];

  // Helper to generate unique IDs
  const generateId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Helper to find rightmost node position
  const getRightmostPosition = () => {
    if (state.nodes.length === 0) {
      return { x: 400, y: 300 };
    }
    const rightmost = state.nodes.reduce(
      (max, n) => (n.position.x > max.position.x ? n : max),
      state.nodes[0]
    );
    return {
      x: rightmost.position.x + 200,
      y: rightmost.position.y,
    };
  };

  return {
    getState: () => state,
    getToolResults: () => toolResults,

    // Tool executors that update state
    addNode: (args: z.infer<typeof addNodeSchema>) => {
      const nodeId = generateId("node");
      const position = args.position || getRightmostPosition();
      // Generate default label if not provided
      const label = args.label ||
        args.nodeType.charAt(0).toUpperCase() + args.nodeType.slice(1).replace(/_/g, ' ');

      state.nodes.push({
        id: nodeId,
        type: args.nodeType,
        label,
        position,
      });

      const result = { success: true, nodeId, position };
      toolResults.push({ toolName: "add_node", args, result });
      return result;
    },

    addEdge: (args: z.infer<typeof addEdgeSchema>) => {
      const edgeId = generateId("edge");

      state.edges.push({
        id: edgeId,
        sourceId: args.sourceNodeId,
        targetId: args.targetNodeId,
        type: args.edgeType || "stream",
        label: args.label,
      });

      const result = { success: true, edgeId };
      toolResults.push({ toolName: "add_edge", args, result });
      return result;
    },

    removeNode: (args: z.infer<typeof removeNodeSchema>) => {
      const index = state.nodes.findIndex((n) => n.id === args.nodeId);
      if (index !== -1) {
        state.nodes.splice(index, 1);
        // Also remove connected edges
        state.edges = state.edges.filter(
          (e) => e.sourceId !== args.nodeId && e.targetId !== args.nodeId
        );
      }

      const result = { success: true };
      toolResults.push({ toolName: "remove_node", args, result });
      return result;
    },

    removeEdge: (args: z.infer<typeof removeEdgeSchema>) => {
      const index = state.edges.findIndex((e) => e.id === args.edgeId);
      if (index !== -1) {
        state.edges.splice(index, 1);
      }

      const result = { success: true };
      toolResults.push({ toolName: "remove_edge", args, result });
      return result;
    },

    updateNode: (args: z.infer<typeof updateNodeSchema>) => {
      const node = state.nodes.find((n) => n.id === args.nodeId);
      if (node) {
        if (args.label) node.label = args.label;
        if (args.position) node.position = args.position;
      }

      const result = { success: true };
      toolResults.push({ toolName: "update_node", args, result });
      return result;
    },

    updateEdge: (args: z.infer<typeof updateEdgeSchema>) => {
      const edge = state.edges.find((e) => e.id === args.edgeId);
      if (edge) {
        if (args.label) edge.label = args.label;
        if (args.edgeType) edge.type = args.edgeType;
      }

      const result = { success: true };
      toolResults.push({ toolName: "update_edge", args, result });
      return result;
    },

    selectElements: (args: z.infer<typeof selectElementsSchema>) => {
      if (args.clearPrevious !== false) {
        state.selectedNodeIds = [];
        state.selectedEdgeIds = [];
      }
      if (args.nodeIds) state.selectedNodeIds = args.nodeIds;
      if (args.edgeIds) state.selectedEdgeIds = args.edgeIds;

      const result = { success: true };
      toolResults.push({ toolName: "select_elements", args, result });
      return result;
    },

    moveNode: (args: z.infer<typeof moveNodeSchema>) => {
      const node = state.nodes.find((n) => n.id === args.nodeId);
      if (node) {
        if (args.position) {
          node.position = args.position;
        } else if (args.direction) {
          const offset = args.offset || 100;
          switch (args.direction) {
            case "left":
              node.position.x -= offset;
              break;
            case "right":
              node.position.x += offset;
              break;
            case "up":
              node.position.y -= offset;
              break;
            case "down":
              node.position.y += offset;
              break;
          }
        } else if (args.relativeTo) {
          const refNode = state.nodes.find(
            (n) => n.id === args.relativeTo!.referenceNodeId
          );
          if (refNode) {
            const relOffset = args.relativeTo.offset || 150;
            switch (args.relativeTo.direction) {
              case "left":
                node.position = {
                  x: refNode.position.x - relOffset,
                  y: refNode.position.y,
                };
                break;
              case "right":
                node.position = {
                  x: refNode.position.x + relOffset,
                  y: refNode.position.y,
                };
                break;
              case "above":
                node.position = {
                  x: refNode.position.x,
                  y: refNode.position.y - relOffset,
                };
                break;
              case "below":
                node.position = {
                  x: refNode.position.x,
                  y: refNode.position.y + relOffset,
                };
                break;
            }
          }
        }
      }

      const result = { success: true, position: node?.position };
      toolResults.push({ toolName: "move_node", args, result });
      return result;
    },

    clearCanvas: (args: z.infer<typeof clearCanvasSchema>) => {
      if (args.confirm) {
        state.nodes = [];
        state.edges = [];
        state.selectedNodeIds = [];
        state.selectedEdgeIds = [];
      }

      const result = { success: args.confirm };
      toolResults.push({ toolName: "clear_canvas", args, result });
      return result;
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    // Check for API key
    if (!process.env.CEREBRAS_API_KEY) {
      console.error("CEREBRAS_API_KEY is not set");
      return NextResponse.json(
        {
          error:
            "Cerebras API key not configured. Please add CEREBRAS_API_KEY to your .env.local file.",
        },
        { status: 500 }
      );
    }

    const { transcript, diagramState } = (await req.json()) as {
      transcript: string;
      diagramState: DiagramStateForAI;
    };

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    console.log("[Voice Command] Processing:", transcript);
    console.log("[Voice Command] Initial state:", {
      nodes: diagramState.nodes.length,
      edges: diagramState.edges.length,
    });

    // Create state tracker for multi-turn execution
    const tracker = createStateTracker(diagramState);

    // Build tools with execute functions that update tracked state
    // Using type assertion due to AI SDK v6 type inference issues with Cerebras provider
    const executableTools = {
      // @ts-ignore - AI SDK type inference
      add_node: tool({
        description: "Add a new node/equipment to the diagram. REQUIRED: nodeType must be specified.",
        parameters: addNodeSchema,
        execute: async (args: z.infer<typeof addNodeSchema>) => {
          console.log("[Tool] add_node:", args);
          // Validate required field
          if (!args.nodeType) {
            console.error("[Tool] add_node: Missing required nodeType", args);
            return { success: false, error: "Missing nodeType" };
          }
          return tracker.addNode(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      add_edge: tool({
        description: "Add a connection/stream between two nodes. Use the node IDs returned from add_node.",
        parameters: addEdgeSchema,
        execute: async (args: z.infer<typeof addEdgeSchema>) => {
          console.log("[Tool] add_edge:", args);
          // Handle alternate field names (AI sometimes uses fromNodeId/toNodeId)
          const rawArgs = args as Record<string, unknown>;
          const normalizedArgs = {
            ...args,
            sourceNodeId: args.sourceNodeId || (rawArgs.fromNodeId as string) || (rawArgs.from as string),
            targetNodeId: args.targetNodeId || (rawArgs.toNodeId as string) || (rawArgs.to as string),
          };
          // Validate required fields
          if (!normalizedArgs.sourceNodeId || !normalizedArgs.targetNodeId) {
            console.error("[Tool] add_edge: Missing required fields", args, normalizedArgs);
            return { success: false, error: "Missing sourceNodeId or targetNodeId" };
          }
          return tracker.addEdge(normalizedArgs);
        },
      }),
      // @ts-ignore - AI SDK type inference
      remove_node: tool({
        description: "Remove a node from the diagram. Also removes all connected edges.",
        parameters: removeNodeSchema,
        execute: async (args: z.infer<typeof removeNodeSchema>) => {
          console.log("[Tool] remove_node:", args);
          return tracker.removeNode(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      remove_edge: tool({
        description: "Remove a connection/stream from the diagram",
        parameters: removeEdgeSchema,
        execute: async (args: z.infer<typeof removeEdgeSchema>) => {
          console.log("[Tool] remove_edge:", args);
          return tracker.removeEdge(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      update_node: tool({
        description: "Update properties of an existing node",
        parameters: updateNodeSchema,
        execute: async (args: z.infer<typeof updateNodeSchema>) => {
          console.log("[Tool] update_node:", args);
          return tracker.updateNode(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      update_edge: tool({
        description: "Update properties of an existing edge/stream",
        parameters: updateEdgeSchema,
        execute: async (args: z.infer<typeof updateEdgeSchema>) => {
          console.log("[Tool] update_edge:", args);
          return tracker.updateEdge(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      select_elements: tool({
        description: "Select one or more elements on the canvas",
        parameters: selectElementsSchema,
        execute: async (args: z.infer<typeof selectElementsSchema>) => {
          console.log("[Tool] select_elements:", args);
          return tracker.selectElements(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      move_node: tool({
        description: "Move a node to a new position or relative to another node",
        parameters: moveNodeSchema,
        execute: async (args: z.infer<typeof moveNodeSchema>) => {
          console.log("[Tool] move_node:", args);
          return tracker.moveNode(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      clear_canvas: tool({
        description: "Clear all nodes and edges from the canvas",
        parameters: clearCanvasSchema,
        execute: async (args: z.infer<typeof clearCanvasSchema>) => {
          console.log("[Tool] clear_canvas:", args);
          return tracker.clearCanvas(args);
        },
      }),
      // @ts-ignore - AI SDK type inference
      get_current_state: tool({
        description: "Get the current diagram state including all nodes and edges. Use this to see what's on the canvas before making changes.",
        parameters: z.object({}),
        execute: async () => {
          const state = tracker.getState();
          console.log("[Tool] get_current_state:", state);
          return {
            nodes: state.nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              position: n.position,
            })),
            edges: state.edges.map((e) => ({
              id: e.id,
              source: e.sourceId,
              target: e.targetId,
              label: e.label,
            })),
            selectedNodeIds: state.selectedNodeIds,
            selectedEdgeIds: state.selectedEdgeIds,
          };
        },
      }),
    };

    const systemPrompt = buildSystemPrompt(diagramState);

    // Choose provider: "openai" or "cerebras"
    const provider = process.env.AI_PROVIDER || "openai";
    const modelName = provider === "openai"
      ? (process.env.OPENAI_MODEL || "gpt-4o")
      : (process.env.CEREBRAS_MODEL || "zai-glm-4.7");

    console.log("[Voice Command] Using provider:", provider, "model:", modelName);

    // Use maxSteps to allow multi-turn tool calling
    const model = provider === "openai" ? openai(modelName) : cerebras(modelName);

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: transcript,
      tools: executableTools,
      maxSteps: 10, // Allow up to 10 tool-calling rounds
      ...(provider === "cerebras" && {
        providerOptions: {
          cerebras: {
            parallel_tool_calls: true,
          },
        },
      }),
    });

    console.log("[Voice Command] Finished. Steps:", result.steps?.length || 1);
    console.log("[Voice Command] Final text:", result.text);

    // Log each step for debugging multi-turn
    if (result.steps && result.steps.length > 0) {
      result.steps.forEach((step, i) => {
        console.log(`[Voice Command] Step ${i + 1}:`, {
          toolCalls: step.toolCalls?.length || 0,
          toolResults: step.toolResults?.length || 0,
          finishReason: step.finishReason,
        });
      });
    }

    const toolResults = tracker.getToolResults();
    console.log("[Voice Command] Tool results:", toolResults.length);

    return NextResponse.json({
      transcript,
      response: result.text,
      toolResults,
      steps: result.steps?.length || 1,
    });
  } catch (error) {
    console.error("Voice command error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to process voice command",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
