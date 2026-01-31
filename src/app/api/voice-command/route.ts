import { buildSystemPrompt } from "@/lib/ai-prompt";
import {
  addEdgeSchema,
  addNodeSchema,
  clearCanvasSchema,
  moveNodeSchema,
  removeEdgeSchema,
  removeNodeSchema,
  selectElementsSchema,
  speakResponseSchema,
  updateEdgeSchema,
  updateNodeSchema,
} from "@/lib/ai-tools";
import type { DiagramStateForAI } from "@/lib/diagram-state";
import { cerebras } from "@ai-sdk/cerebras";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface ToolResult {
  toolName: string;
  args: Record<string, unknown>;
  result: { success: boolean } & Record<string, unknown>;
}

// Deduplicate consecutive identical tool calls (same tool + same args)
// This prevents runaway loops where the model calls the same tool repeatedly
function deduplicateToolResults(results: ToolResult[]): ToolResult[] {
  if (results.length <= 1) return results;

  const deduplicated: ToolResult[] = [];
  let lastSignature = "";

  for (const result of results) {
    // Create a signature from tool name and args
    const signature = JSON.stringify({
      tool: result.toolName,
      args: result.args,
    });

    // Skip if identical to the last one
    if (signature === lastSignature) {
      continue;
    }

    deduplicated.push(result);
    lastSignature = signature;
  }

  // Log if we deduplicated a lot
  const removed = results.length - deduplicated.length;
  if (removed > 0) {
    console.log(`[Voice Command] Deduplicated ${removed} duplicate tool calls`);
  }

  return deduplicated;
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
      const label =
        args.label ||
        args.nodeType.charAt(0).toUpperCase() +
          args.nodeType.slice(1).replace(/_/g, " ");

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

    const {
      transcript,
      diagramState,
      ttsEnabled = true,
    } = (await req.json()) as {
      transcript: string;
      diagramState: DiagramStateForAI;
      ttsEnabled?: boolean;
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
      ttsEnabled,
    });

    // Create state tracker for multi-turn execution
    const tracker = createStateTracker(diagramState);

    // Track speech message for TTS
    let speechMessage: string | null = null;

    // Build base tools with execute functions that update tracked state
    const baseTools = {
      add_node: tool({
        description:
          "Add a new node/equipment to the diagram. REQUIRED: nodeType must be specified.",
        inputSchema: addNodeSchema,
        execute: async (args) => {
          console.log("[Tool] add_node:", args);
          // Validate required field
          if (!args.nodeType) {
            console.error("[Tool] add_node: Missing required nodeType", args);
            return { success: false, error: "Missing nodeType" };
          }
          return tracker.addNode(args);
        },
      }),
      add_edge: tool({
        description:
          "Add a connection/stream between two nodes. Use the node IDs returned from add_node.",
        inputSchema: addEdgeSchema,
        execute: async (args) => {
          console.log("[Tool] add_edge:", args);
          // Handle alternate field names (AI sometimes uses fromNodeId/toNodeId)
          const rawArgs = args as Record<string, unknown>;
          const normalizedArgs = {
            ...args,
            sourceNodeId:
              args.sourceNodeId ||
              (rawArgs.fromNodeId as string) ||
              (rawArgs.from as string),
            targetNodeId:
              args.targetNodeId ||
              (rawArgs.toNodeId as string) ||
              (rawArgs.to as string),
          };
          // Validate required fields
          if (!normalizedArgs.sourceNodeId || !normalizedArgs.targetNodeId) {
            console.error(
              "[Tool] add_edge: Missing required fields",
              args,
              normalizedArgs
            );
            return {
              success: false,
              error: "Missing sourceNodeId or targetNodeId",
            };
          }
          return tracker.addEdge(normalizedArgs);
        },
      }),
      remove_node: tool({
        description:
          "Remove a node from the diagram. Also removes all connected edges.",
        inputSchema: removeNodeSchema,
        execute: async (args) => {
          console.log("[Tool] remove_node:", args);
          return tracker.removeNode(args);
        },
      }),
      remove_edge: tool({
        description: "Remove a connection/stream from the diagram",
        inputSchema: removeEdgeSchema,
        execute: async (args) => {
          console.log("[Tool] remove_edge:", args);
          return tracker.removeEdge(args);
        },
      }),
      update_node: tool({
        description: "Update properties of an existing node",
        inputSchema: updateNodeSchema,
        execute: async (args) => {
          console.log("[Tool] update_node:", args);
          return tracker.updateNode(args);
        },
      }),
      update_edge: tool({
        description: "Update properties of an existing edge/stream",
        inputSchema: updateEdgeSchema,
        execute: async (args) => {
          console.log("[Tool] update_edge:", args);
          return tracker.updateEdge(args);
        },
      }),
      select_elements: tool({
        description:
          "Select/highlight one or more elements on the canvas. Use this to visually highlight nodes when answering questions about the diagram (e.g., 'where is the pump?', 'show me the reactors').",
        inputSchema: selectElementsSchema,
        execute: async (args) => {
          console.log("[Tool] select_elements:", args);
          return tracker.selectElements(args);
        },
      }),
      move_node: tool({
        description:
          "Move a node to a new position or relative to another node",
        inputSchema: moveNodeSchema,
        execute: async (args) => {
          console.log("[Tool] move_node:", args);
          return tracker.moveNode(args);
        },
      }),
      clear_canvas: tool({
        description: "Clear all nodes and edges from the canvas",
        inputSchema: clearCanvasSchema,
        execute: async (args) => {
          console.log("[Tool] clear_canvas:", args);
          return tracker.clearCanvas(args);
        },
      }),
      get_current_state: tool({
        description:
          "Get the current diagram state including all nodes and edges. Use this to see what's on the canvas before making changes.",
        inputSchema: z.object({}),
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

    // Conditionally add speak_response tool only if TTS is enabled
    const executableTools = ttsEnabled
      ? {
          ...baseTools,
          speak_response: tool({
            description:
              "Speak a short voice response to the user. Use this to acknowledge commands with a friendly voice message. Keep messages under 100 characters. Call this ONCE at the end of processing to provide audio feedback.",
            inputSchema: speakResponseSchema,
            execute: async (args) => {
              console.log("[Tool] speak_response:", args.message);
              speechMessage = args.message;
              return { success: true, message: args.message };
            },
          }),
        }
      : baseTools;

    const systemPrompt = buildSystemPrompt(diagramState);

    // Create the agent with Cerebras provider
    const modelName = process.env.CEREBRAS_MODEL || "zai-glm-4.7";
    console.log(
      "[Voice Command] Using ToolLoopAgent with Cerebras model:",
      modelName
    );

    const agent = new ToolLoopAgent({
      model: cerebras(modelName),
      instructions: systemPrompt,
      tools: executableTools,
      stopWhen: stepCountIs(10), // Allow up to 10 steps for multi-turn
    });

    // Run the agent to process the voice command
    const result = await agent.generate({
      prompt: transcript,
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

    const rawToolResults = tracker.getToolResults();
    console.log("[Voice Command] Raw tool results:", rawToolResults.length);

    // Deduplicate consecutive identical tool calls to prevent wasteful processing
    const toolResults = deduplicateToolResults(rawToolResults);
    console.log(
      "[Voice Command] Deduplicated tool results:",
      toolResults.length
    );

    // Return immediately with speech message - client will call TTS endpoint separately
    return NextResponse.json({
      transcript,
      response: result.text,
      toolResults,
      steps: result.steps?.length || 1,
      speechMessage, // Client will generate TTS from this
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
