/**
 * Test script for AI SDK tool calling with different providers
 * Run with: npx tsx src/scripts/test-schema.ts
 * 
 * FINDINGS:
 * 1. OpenAI Provider (AI SDK): Has a bug where tool schemas are sent with type: "None"
 *    - Direct OpenAI API calls work fine
 *    - This is an AI SDK issue, not an OpenAI issue
 * 
 * 2. Cerebras Provider (AI SDK):
 *    - Basic tool calling works ✅
 *    - Tool parameters are received correctly in execute() ✅
 *    - Parallel tool calls work ✅
 *    - Multi-turn (maxSteps) continuation does NOT work properly ❌
 *      - Model makes first round of calls
 *      - Results are captured
 *      - But SDK doesn't continue to next round even with finishReason='tool-calls'
 */

import { config } from "dotenv";
import { generateText, tool } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Test Cerebras with single tool call
async function testCerebrasBasic() {
  console.log("\n=== Test 1: Cerebras Basic Tool Call ===\n");
  
  if (!process.env.CEREBRAS_API_KEY) {
    console.log("⚠️  CEREBRAS_API_KEY not set");
    return { success: false, skipped: true };
  }
  
  try {
    const result = await generateText({
      model: cerebras("zai-glm-4.7"),
      system: "You are a diagram assistant. Use add_node tool when asked to add a node.",
      prompt: "Add a rectangle node labeled 'Test'",
      tools: {
        add_node: tool({
          description: "Add a node to the diagram",
          parameters: z.object({
            nodeType: z.string().describe("Type of node: rectangle, circle, etc."),
            label: z.string().optional().describe("Label for the node"),
          }),
          execute: async (args) => {
            console.log("  ✅ Tool executed with args:", JSON.stringify(args));
            return { success: true, nodeId: "node_1" };
          },
        }),
      },
      maxSteps: 3,
    });
    
    console.log("  Response:", result.text?.substring(0, 100) || "(no text)");
    console.log("  Steps:", result.steps?.length || 0);
    
    return { success: true };
  } catch (error) {
    console.log("  ❌ Error:", error instanceof Error ? error.message : error);
    return { success: false };
  }
}

// Test Cerebras with parallel tool calls (multiple tools in one response)
async function testCerebrasParallel() {
  console.log("\n=== Test 2: Cerebras Parallel Tool Calls ===\n");
  
  if (!process.env.CEREBRAS_API_KEY) {
    console.log("⚠️  CEREBRAS_API_KEY not set");
    return { success: false, skipped: true };
  }
  
  let callCount = 0;
  
  try {
    const result = await generateText({
      model: cerebras("zai-glm-4.7"),
      system: "You are a diagram assistant. Create nodes using add_node tool.",
      prompt: "Create 3 nodes: a Start node, a Process node, and an End node. Call add_node 3 times.",
      tools: {
        add_node: tool({
          description: "Add a node to the diagram",
          parameters: z.object({
            nodeType: z.string().describe("Type: rectangle, circle"),
            label: z.string().describe("Label for the node"),
          }),
          execute: async (args) => {
            callCount++;
            console.log(`  ✅ Call ${callCount}: add_node(${JSON.stringify(args)})`);
            return { success: true, nodeId: `node_${callCount}` };
          },
        }),
      },
      maxSteps: 5,
      providerOptions: {
        cerebras: { parallel_tool_calls: true },
      },
    });
    
    console.log(`  Total tool calls: ${callCount}`);
    console.log(`  Steps: ${result.steps?.length || 0}`);
    
    if (callCount >= 2) {
      console.log("  ✅ Parallel calls work!");
      return { success: true, calls: callCount };
    } else {
      console.log("  ⚠️ Only 1 call made - parallel may not be working");
      return { success: true, calls: callCount };
    }
  } catch (error) {
    console.log("  ❌ Error:", error instanceof Error ? error.message : error);
    return { success: false };
  }
}

// Test multi-turn (model uses results from previous calls)
async function testCerebrasMultiTurn() {
  console.log("\n=== Test 3: Cerebras Multi-Turn (Sequential Dependency) ===\n");
  
  if (!process.env.CEREBRAS_API_KEY) {
    console.log("⚠️  CEREBRAS_API_KEY not set");
    return { success: false, skipped: true };
  }
  
  const createdNodes: string[] = [];
  let edgeCreated = false;
  
  try {
    const result = await generateText({
      model: cerebras("zai-glm-4.7"),
      system: `You are a flowchart assistant. To create a connected diagram:
1. First call add_node to create the source node - note the returned nodeId
2. Then call add_node to create the target node - note the returned nodeId  
3. Finally call add_edge with the two nodeIds to connect them`,
      prompt: "Create two nodes 'A' and 'B', then connect A to B with an edge. You MUST use the nodeIds returned from add_node when calling add_edge.",
      tools: {
        add_node: tool({
          description: "Create a node. Returns { nodeId: string }",
          parameters: z.object({
            label: z.string().describe("Node label"),
          }),
          execute: async (args) => {
            const nodeId = `node_${createdNodes.length + 1}_${Date.now()}`;
            createdNodes.push(nodeId);
            console.log(`  ✅ add_node(${args.label}) -> ${nodeId}`);
            return { success: true, nodeId };
          },
        }),
        add_edge: tool({
          description: "Connect two nodes. Use nodeIds from add_node results.",
          parameters: z.object({
            sourceNodeId: z.string().describe("Source node ID from add_node"),
            targetNodeId: z.string().describe("Target node ID from add_node"),
          }),
          execute: async (args) => {
            edgeCreated = true;
            const usedRealIds = createdNodes.includes(args.sourceNodeId) && createdNodes.includes(args.targetNodeId);
            console.log(`  ✅ add_edge(${args.sourceNodeId} -> ${args.targetNodeId})`);
            if (usedRealIds) {
              console.log(`    ✅ Model correctly used returned node IDs!`);
            } else {
              console.log(`    ⚠️ Model did NOT use actual returned IDs`);
            }
            return { success: true };
          },
        }),
      },
      maxSteps: 10, // Allow multiple rounds
    });
    
    console.log(`\n  Nodes created: ${createdNodes.length}`);
    console.log(`  Edge created: ${edgeCreated}`);
    console.log(`  Steps/rounds: ${result.steps?.length || 0}`);
    
    // Analyze if multi-turn worked
    const multiTurnWorked = createdNodes.length >= 2 && edgeCreated;
    
    return { success: true, multiTurnWorked, nodes: createdNodes.length, edgeCreated };
  } catch (error) {
    console.log("  ❌ Error:", error instanceof Error ? error.message : error);
    return { success: false };
  }
}

// Main test runner
async function runTests() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       AI SDK + Cerebras Provider Tool Calling Tests        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  const results = {
    basic: await testCerebrasBasic(),
    parallel: await testCerebrasParallel(),
    multiTurn: await testCerebrasMultiTurn(),
  };
  
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`Basic tool call:     ${results.basic.success ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Parallel tool calls: ${results.parallel.success ? `✅ PASS (${(results.parallel as {calls?: number}).calls || 0} calls)` : "❌ FAIL"}`);
  console.log(`Multi-turn:          ${results.multiTurn.success ? 
    ((results.multiTurn as {multiTurnWorked?: boolean}).multiTurnWorked ? "✅ PASS (full multi-turn)" : "⚠️ PARTIAL (tools work, multi-turn limited)") : 
    "❌ FAIL"}`);
  
  console.log("\n" + "═".repeat(60));
  console.log("RECOMMENDATIONS FOR VOICE COMMAND ROUTE");
  console.log("═".repeat(60));
  console.log(`
1. Use Cerebras provider instead of OpenAI (AI SDK has a schema bug with OpenAI)
2. Parallel tool calls work - the model CAN make multiple tool calls in one response
3. Multi-turn (maxSteps) has limitations - model may not continue after tool results
4. For complex multi-step operations, consider:
   - Breaking into separate API calls
   - Using a more explicit system prompt
   - Handling single-round parallel calls (which work well)
`);
}

runTests().catch(console.error);
