/**
 * Test the voice-command API endpoint directly
 * Run with: npx tsx src/scripts/test-voice-api.ts
 * 
 * Make sure the dev server is running: pnpm dev
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const API_URL = process.env.TEST_API_URL || "http://localhost:3000/api/voice-command";

interface TestCase {
  name: string;
  transcript: string;
  expectedTools: string[];
}

const testCases: TestCase[] = [
  {
    name: "Add single node",
    transcript: "Add a rectangle node",
    expectedTools: ["add_node"],
  },
  {
    name: "Add node with label",
    transcript: "Add a circle node labeled 'Start'",
    expectedTools: ["add_node"],
  },
  {
    name: "Add multiple nodes",
    transcript: "Create three nodes: a Start rectangle, a Process rectangle, and an End rectangle",
    expectedTools: ["add_node", "add_node", "add_node"],
  },
  {
    name: "Clear canvas",
    transcript: "Clear the canvas",
    expectedTools: ["clear_canvas"],
  },
];

async function runTest(test: TestCase): Promise<{ passed: boolean; details: string }> {
  console.log(`\n--- Testing: ${test.name} ---`);
  console.log(`Transcript: "${test.transcript}"`);
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: test.transcript,
        diagramState: {
          mode: "playground",
          modeName: "Playground",
          modeRules: ["Use rectangle, circle, diamond, triangle, or text node types"],
          availableNodeTypes: ["rectangle", "circle", "diamond", "triangle", "text"],
          availableEdgeTypes: ["default", "stream"],
          nodes: [],
          edges: [],
          selectedNodeIds: [],
          selectedEdgeIds: [],
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { 
        passed: false, 
        details: `HTTP ${response.status}: ${error.error || error.details || 'Unknown error'}` 
      };
    }
    
    const result = await response.json();
    
    console.log(`Response: ${result.response?.substring(0, 100) || '(no text)'}`);
    console.log(`Tool calls: ${result.toolResults?.length || 0}`);
    console.log(`Steps: ${result.steps || 1}`);
    
    if (result.toolResults) {
      result.toolResults.forEach((tr: { toolName: string; args: unknown }, i: number) => {
        console.log(`  ${i + 1}. ${tr.toolName}(${JSON.stringify(tr.args).substring(0, 50)}...)`);
      });
    }
    
    // Check if expected tools were called
    const calledTools = result.toolResults?.map((tr: { toolName: string }) => tr.toolName) || [];
    const hasExpectedTools = test.expectedTools.every(t => calledTools.includes(t));
    
    if (hasExpectedTools) {
      return { passed: true, details: `Called ${calledTools.length} tools correctly` };
    } else {
      return { 
        passed: false, 
        details: `Expected tools [${test.expectedTools.join(', ')}], got [${calledTools.join(', ')}]` 
      };
    }
  } catch (error) {
    return { 
      passed: false, 
      details: `Error: ${error instanceof Error ? error.message : error}` 
    };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║            Voice Command API Integration Tests             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nAPI URL: ${API_URL}`);
  console.log("Make sure your dev server is running (pnpm dev)\n");
  
  // Check if server is running
  try {
    await fetch(API_URL.replace('/api/voice-command', ''));
  } catch {
    console.log("❌ Cannot connect to server. Make sure to run: pnpm dev");
    process.exit(1);
  }
  
  const results: { name: string; passed: boolean; details: string }[] = [];
  
  for (const test of testCases) {
    const result = await runTest(test);
    results.push({ name: test.name, ...result });
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("TEST SUMMARY");
  console.log("═".repeat(60));
  
  results.forEach(r => {
    console.log(`${r.passed ? "✅" : "❌"} ${r.name}: ${r.details}`);
  });
  
  const passed = results.filter(r => r.passed).length;
  console.log(`\nResults: ${passed}/${results.length} tests passed`);
}

main().catch(console.error);
