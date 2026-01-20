"use client";

import { useState, useCallback } from "react";
import { useDiagramStore } from "./use-diagram-store";
import { useSettings } from "@/contexts/settings-context";
import { serializeDiagramForAI } from "@/lib/diagram-state";
import type { Node, Edge } from "@xyflow/react";

// Get fresh state from store at call time (avoids stale closures)
const getStoreState = () => useDiagramStore.getState();

interface ToolResult {
  toolName: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface VoiceCommandResponse {
  transcript: string;
  response: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: ToolResult[];
  speechMessage?: string | null; // Text to convert to speech
  error?: string;
  details?: string;
}

export type DebugLogType = "info" | "command" | "tool" | "result" | "error";

export interface DebugLog {
  timestamp: Date;
  type: DebugLogType;
  message: string;
  data?: unknown;
}

interface UseVoiceCommandsOptions {
  onDebugLog?: (log: DebugLog) => void;
}

// Helper to play audio from base64
function playAudioFromBase64(base64Audio: string, mimeType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log("[Audio] Starting decode, base64 length:", base64Audio.length);
      
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log("[Audio] Decoded to bytes:", bytes.length);

      // Create blob and URL
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      console.log("[Audio] Created blob URL:", url);

      // Create and play audio
      const audio = new Audio(url);
      
      audio.onloadeddata = () => {
        console.log("[Audio] Audio loaded, duration:", audio.duration);
      };
      
      audio.onended = () => {
        console.log("[Audio] Playback ended");
        URL.revokeObjectURL(url);
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error("[Audio] Error event:", e, audio.error);
        URL.revokeObjectURL(url);
        reject(new Error(`Audio error: ${audio.error?.message || "unknown"}`));
      };
      
      console.log("[Audio] Attempting to play...");
      audio.play()
        .then(() => console.log("[Audio] Play started successfully"))
        .catch((err) => {
          console.error("[Audio] Play failed:", err);
          reject(err);
        });
    } catch (err) {
      console.error("[Audio] Exception:", err);
      reject(err);
    }
  });
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { onDebugLog } = options;
  const { ttsEnabled } = useSettings();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Helper to generate TTS and play it (fire and forget)
  const generateAndPlayTTS = useCallback(async (text: string) => {
    console.log("[TTS] Calling /api/tts...");
    setIsSpeaking(true);
    
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "TTS failed");
      }

      const { audio, mimeType } = await response.json();
      console.log("[TTS] Received audio, length:", audio?.length);
      
      await playAudioFromBase64(audio, mimeType);
      console.log("[TTS] Playback complete");
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  // Helper to log debug messages
  const log = useCallback(
    (type: DebugLogType, message: string, data?: unknown) => {
      console.log(`[${type.toUpperCase()}]`, message, data || "");
      onDebugLog?.({
        timestamp: new Date(),
        type,
        message,
        data,
      });
    },
    [onDebugLog]
  );

  const {
    addNode,
    addEdgeAction,
    removeNode,
    removeEdge,
    updateNode,
    updateEdge,
    setSelectedNodes,
    setSelectedEdges,
    clearCanvas,
  } = useDiagramStore();

  const applyToolResults = useCallback(
    (toolResults: ToolResult[]) => {
      log("info", `Processing ${toolResults.length} tool result(s)`);

      for (const { toolName, args, result } of toolResults) {
        log("tool", `Executing: ${toolName}`, args);

        if (!result.success) {
          log("error", `Tool failed: ${toolName}`);
          continue;
        }

        // Guard against undefined args
        if (!args || typeof args !== "object") {
          log("error", `Invalid args for tool: ${toolName}`);
          continue;
        }

        // Get fresh state for each tool (state changes between tools)
        const currentState = getStoreState();

        switch (toolName) {
          case "add_node": {
            const rawArgs = args as Record<string, unknown>;
            const nodeType = rawArgs.nodeType as string;
            // Handle position as nested object OR top-level x/y fields
            let position = rawArgs.position as { x: number; y: number } | undefined;
            if (!position && (rawArgs.x !== undefined || rawArgs.y !== undefined)) {
              position = {
                x: (rawArgs.x as number) ?? 400,
                y: (rawArgs.y as number) ?? 300,
              };
            }
            const data = rawArgs.data as Record<string, string> | undefined;
            // Generate default label if not provided (capitalize nodeType)
            const label = (rawArgs.label as string) ||
              nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace(/_/g, ' ');

            if (!nodeType) {
              console.error("[applyToolResults] add_node missing nodeType:", rawArgs);
              continue;
            }

            const nodeId = (result as { nodeId: string }).nodeId || `node_${Date.now()}`;

            // Calculate position if not provided
            let finalPosition = position;
            if (!finalPosition) {
              if (currentState.nodes.length === 0) {
                finalPosition = { x: 400, y: 300 };
              } else {
                const rightmost = currentState.nodes.reduce(
                  (max, n) => (n.position.x > max.position.x ? n : max),
                  currentState.nodes[0]
                );
                finalPosition = {
                  x: rightmost.position.x + 200,
                  y: rightmost.position.y,
                };
              }
            }

            const newNode: Node = {
              id: nodeId,
              type: nodeType,
              position: finalPosition,
              data: {
                label,
                description: "",
                // Put additional properties under 'properties' for engineering style
                ...(data && Object.keys(data).length > 0 ? { properties: data } : {}),
              },
            };
            console.log("[DEBUG] About to call addNode with:", newNode);
            addNode(newNode);
            console.log("[DEBUG] addNode called, checking store:", getStoreState().nodes.length, "nodes");
            log("result", `Added node: "${label}" (${nodeType})`, { id: nodeId, position: finalPosition });
            break;
          }

          case "add_edge": {
            const rawArgs = args as Record<string, unknown>;
            // Handle alternate field names (AI sometimes uses fromNodeId/toNodeId)
            const sourceNodeId = (rawArgs.sourceNodeId || rawArgs.fromNodeId || rawArgs.from) as string;
            const targetNodeId = (rawArgs.targetNodeId || rawArgs.toNodeId || rawArgs.to) as string;
            const edgeType = rawArgs.edgeType as string | undefined;
            const label = rawArgs.label as string | undefined;
            const data = rawArgs.data as Record<string, string> | undefined;

            if (!sourceNodeId || !targetNodeId) {
              console.error("[applyToolResults] add_edge missing sourceNodeId or targetNodeId:", rawArgs);
              continue;
            }

            const edgeId = (result as { edgeId: string }).edgeId || `edge_${Date.now()}`;

            const newEdge: Edge = {
              id: edgeId,
              source: sourceNodeId,
              target: targetNodeId,
              type: edgeType || "stream",
              label,
              data: data,
            };
            addEdgeAction(newEdge);
            log("result", `Added edge: ${sourceNodeId} -> ${targetNodeId}`, { id: edgeId });
            break;
          }

          case "remove_node": {
            const nodeId = (args as Record<string, unknown>).nodeId as string;
            if (!nodeId) {
              log("error", "remove_node missing nodeId");
              continue;
            }
            removeNode(nodeId);
            log("result", `Removed node: ${nodeId}`);
            break;
          }

          case "remove_edge": {
            const edgeId = (args as Record<string, unknown>).edgeId as string;
            if (!edgeId) {
              log("error", "remove_edge missing edgeId");
              continue;
            }
            removeEdge(edgeId);
            log("result", `Removed edge: ${edgeId}`);
            break;
          }

          case "update_node": {
            const rawArgs = args as Record<string, unknown>;
            const nodeId = rawArgs.nodeId as string;
            const label = rawArgs.label as string | undefined;
            const position = rawArgs.position as { x: number; y: number } | undefined;
            const data = rawArgs.data as Record<string, string> | undefined;

            console.log("=== UPDATE_NODE DEBUG START ===");
            console.log("[DEBUG update_node] Raw args:", JSON.stringify(rawArgs, null, 2));
            console.log("[DEBUG update_node] Extracted fields:");
            console.log("  - nodeId:", nodeId);
            console.log("  - label:", label);
            console.log("  - data:", JSON.stringify(data));
            console.log("  - data type:", typeof data);
            console.log("  - data keys:", data ? Object.keys(data) : "N/A");

            if (!nodeId) {
              log("error", "update_node missing nodeId");
              continue;
            }

            const existingNode = currentState.nodes.find((n) => n.id === nodeId);
            console.log("[DEBUG update_node] Existing node found:", !!existingNode);
            console.log("[DEBUG update_node] Existing node data:", JSON.stringify(existingNode?.data, null, 2));

            const updates: Partial<Node> = {};
            if (position) updates.position = position;

            // Always rebuild data to ensure we capture all changes
            const existingProps = (existingNode?.data?.properties as Record<string, string>) || {};
            console.log("[DEBUG update_node] Existing properties:", JSON.stringify(existingProps));

            // Build new data object
            const newData = {
              ...existingNode?.data,
              ...(label ? { label } : {}),
              // Merge new properties into existing properties (not directly onto data)
              ...(data && Object.keys(data).length > 0
                ? { properties: { ...existingProps, ...data } }
                : {}),
            };
            updates.data = newData;

            console.log("[DEBUG update_node] New data object:", JSON.stringify(newData, null, 2));
            console.log("[DEBUG update_node] Final updates to apply:", JSON.stringify(updates, null, 2));
            console.log("=== UPDATE_NODE DEBUG END - CALLING updateNode ===");

            updateNode(nodeId, updates);

            // Verify the update was applied
            const verifyState = getStoreState();
            const updatedNode = verifyState.nodes.find((n) => n.id === nodeId);
            console.log("[DEBUG update_node] VERIFICATION - Node after update:", JSON.stringify(updatedNode?.data, null, 2));

            log("result", `Updated node: ${nodeId}`, updates);
            break;
          }

          case "update_edge": {
            const edgeId = (args as Record<string, unknown>).edgeId as string;
            const label = (args as Record<string, unknown>).label as string | undefined;
            const edgeType = (args as Record<string, unknown>).edgeType as string | undefined;
            const data = (args as Record<string, unknown>).data as Record<string, string> | undefined;

            if (!edgeId) {
              log("error", "update_edge missing edgeId");
              continue;
            }

            const updates: Partial<Edge> = {};
            if (label !== undefined) updates.label = label;
            if (edgeType) updates.type = edgeType;
            if (data) updates.data = data;
            updateEdge(edgeId, updates);
            log("result", `Updated edge: ${edgeId}`, updates);
            break;
          }

          case "select_elements": {
            const nodeIds = (args as Record<string, unknown>).nodeIds as string[] | undefined;
            const edgeIds = (args as Record<string, unknown>).edgeIds as string[] | undefined;
            const clearPrevious = (args as Record<string, unknown>).clearPrevious as boolean | undefined;

            if (clearPrevious !== false) {
              setSelectedNodes([]);
              setSelectedEdges([]);
            }
            if (nodeIds) setSelectedNodes(nodeIds);
            if (edgeIds) setSelectedEdges(edgeIds);
            log("result", `Selected elements`, { nodeIds, edgeIds });
            break;
          }

          case "move_node": {
            const nodeId = (args as Record<string, unknown>).nodeId as string;
            const position = (args as Record<string, unknown>).position as { x: number; y: number } | undefined;
            const direction = (args as Record<string, unknown>).direction as "left" | "right" | "up" | "down" | undefined;
            const offset = ((args as Record<string, unknown>).offset as number) || 100;
            const relativeTo = (args as Record<string, unknown>).relativeTo as {
              referenceNodeId: string;
              direction: "left" | "right" | "above" | "below";
              offset: number;
            } | undefined;

            if (!nodeId) {
              log("error", "move_node missing nodeId");
              continue;
            }

            let finalPosition = position;

            // Simple direction-based movement from current position
            if (!finalPosition && direction) {
              const currentNode = currentState.nodes.find((n) => n.id === nodeId);
              if (currentNode) {
                switch (direction) {
                  case "left":
                    finalPosition = {
                      x: currentNode.position.x - offset,
                      y: currentNode.position.y,
                    };
                    break;
                  case "right":
                    finalPosition = {
                      x: currentNode.position.x + offset,
                      y: currentNode.position.y,
                    };
                    break;
                  case "up":
                    finalPosition = {
                      x: currentNode.position.x,
                      y: currentNode.position.y - offset,
                    };
                    break;
                  case "down":
                    finalPosition = {
                      x: currentNode.position.x,
                      y: currentNode.position.y + offset,
                    };
                    break;
                }
              }
            }

            // Relative to another node
            if (!finalPosition && relativeTo) {
              const refNode = currentState.nodes.find((n) => n.id === relativeTo.referenceNodeId);
              if (refNode) {
                const relOffset = relativeTo.offset || 150;
                switch (relativeTo.direction) {
                  case "left":
                    finalPosition = {
                      x: refNode.position.x - relOffset,
                      y: refNode.position.y,
                    };
                    break;
                  case "right":
                    finalPosition = {
                      x: refNode.position.x + relOffset,
                      y: refNode.position.y,
                    };
                    break;
                  case "above":
                    finalPosition = {
                      x: refNode.position.x,
                      y: refNode.position.y - relOffset,
                    };
                    break;
                  case "below":
                    finalPosition = {
                      x: refNode.position.x,
                      y: refNode.position.y + relOffset,
                    };
                    break;
                }
              }
            }

            if (finalPosition) {
              updateNode(nodeId, { position: finalPosition });
              log("result", `Moved node: ${nodeId}`, { direction, position: finalPosition });
            }
            break;
          }

          case "clear_canvas": {
            clearCanvas();
            log("result", "Canvas cleared");
            break;
          }

          default:
            log("error", `Unknown tool: ${toolName}`);
        }
      }
    },
    [
      addNode,
      addEdgeAction,
      removeNode,
      removeEdge,
      updateNode,
      updateEdge,
      setSelectedNodes,
      setSelectedEdges,
      clearCanvas,
      log,
    ]
  );

  const processVoiceCommand = useCallback(
    async (transcript: string) => {
      setIsProcessing(true);
      setError(null);

      log("command", `Voice command: "${transcript}"`);

      try {
        // Get fresh state at call time to avoid stale closures
        const freshState = getStoreState();
        const diagramState = serializeDiagramForAI(
          freshState.nodes,
          freshState.edges,
          freshState.mode,
          freshState.selectedNodeIds,
          freshState.selectedEdgeIds
        );

        log("info", `Sending to AI (${freshState.nodes.length} nodes, ${freshState.edges.length} edges, TTS: ${ttsEnabled})`);

        const response = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, diagramState, ttsEnabled }),
        });

        const data: VoiceCommandResponse = await response.json();

        if (!response.ok) {
          const errorMsg = data.details || data.error || "Failed to process voice command";
          log("error", `API error: ${errorMsg}`);
          throw new Error(errorMsg);
        }

        log("info", `AI response received`, { toolCalls: data.toolResults?.length || 0 });

        // Apply tool results to the diagram IMMEDIATELY
        if (data.toolResults && data.toolResults.length > 0) {
          log("info", `Received ${data.toolResults.length} tool result(s) from API`);
          console.log("[DEBUG] toolResults from API:", JSON.stringify(data.toolResults, null, 2));
          applyToolResults(data.toolResults);
        } else {
          log("info", "No tool calls from AI");
        }

        if (data.response) {
          log("info", `AI message: ${data.response}`);
        }

        setLastResponse(data.response || "Command executed");

        // Generate and play TTS in parallel (don't block) - only if TTS is enabled
        if (data.speechMessage && ttsEnabled) {
          console.log("[VoiceCommands] Generating TTS for:", data.speechMessage);
          log("info", "Generating voice response...");
          
          // Fire and forget - don't await
          generateAndPlayTTS(data.speechMessage).catch((err) => {
            console.error("[VoiceCommands] TTS failed:", err);
          });
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        log("error", `Command failed: ${message}`);
        setError(message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [applyToolResults, log, ttsEnabled, generateAndPlayTTS]
  );

  return {
    processVoiceCommand,
    isProcessing,
    isSpeaking,
    lastResponse,
    error,
  };
}
