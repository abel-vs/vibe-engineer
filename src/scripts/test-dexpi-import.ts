/**
 * Test script for DEXPI import functionality
 * Tests both DEXPI 1.x (Proteus) and DEXPI 2.0 formats
 *
 * Run with: pnpm tsx src/scripts/test-dexpi-import.ts
 */

import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

// Set up DOM environment for DOMParser
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.XMLSerializer = dom.window.XMLSerializer;

// Now import the DEXPI functions
import { detectDexpiVersion } from "../lib/dexpi/proteus-parser";
import { parseDexpiXml, validateDexpiXml } from "../lib/dexpi/xml-utils";
import { dexpiToReactFlow } from "../lib/dexpi/from-dexpi";

const EXAMPLES_DIR = path.join(__dirname, "../../examples");

function testFile(filename: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${filename}`);
  console.log("=".repeat(60));

  const filepath = path.join(EXAMPLES_DIR, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`❌ File not found: ${filepath}`);
    return;
  }

  const xmlContent = fs.readFileSync(filepath, "utf-8");

  // Test version detection
  console.log("\n1. Version Detection:");
  const versionInfo = detectDexpiVersion(xmlContent);
  console.log(`   Format: ${versionInfo.format}`);
  console.log(`   Version: ${versionInfo.version}`);
  console.log(`   Detected Version: ${versionInfo.detectedVersion || "N/A"}`);
  console.log(`   Root Element: ${versionInfo.rootElement}`);

  // Test validation
  console.log("\n2. Validation:");
  const validation = validateDexpiXml(xmlContent);
  console.log(`   Valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log(`   Errors:`);
    validation.errors.forEach((e) => console.log(`     - ${e}`));
  }
  if (validation.warnings.length > 0) {
    console.log(`   Warnings:`);
    validation.warnings.forEach((w) => console.log(`     - ${w}`));
  }

  // Test parsing
  if (validation.valid) {
    console.log("\n3. Parsing:");
    try {
      const doc = parseDexpiXml(xmlContent);
      console.log(`   ProcessModel ID: ${doc.processModel.id}`);
      console.log(`   ProcessModel Name: ${doc.processModel.name}`);
      console.log(`   Diagram Type: ${doc.processModel.diagramType}`);
      console.log(`   Process Steps: ${doc.processModel.processSteps.length}`);
      console.log(
        `   Process Connections: ${doc.processModel.processConnections.length}`
      );
      console.log(
        `   External Ports: ${doc.processModel.externalPorts.length}`
      );

      // List process steps
      if (doc.processModel.processSteps.length > 0) {
        console.log("\n   Process Steps:");
        doc.processModel.processSteps.forEach((step) => {
          console.log(`     - ${step.id}: ${step.name} (type: ${step.type})`);
          if (step.originalNodeType) {
            console.log(`       originalNodeType: ${step.originalNodeType}`);
          }
          if (step.ports.length > 0) {
            console.log(
              `       ports: ${step.ports.map((p) => p.id).join(", ")}`
            );
          }
        });
      }

      // Test conversion to React Flow
      console.log("\n4. React Flow Conversion:");
      const result = dexpiToReactFlow(xmlContent);
      console.log(`   Mode: ${result.mode}`);
      console.log(`   Nodes: ${result.nodes.length}`);
      console.log(`   Edges: ${result.edges.length}`);

      // List nodes
      if (result.nodes.length > 0) {
        console.log("\n   Nodes:");
        result.nodes.forEach((node) => {
          console.log(
            `     - ${node.id}: type=${node.type}, label=${node.data.label}`
          );
        });
      }

      if (result.warnings.length > 0) {
        console.log("\n   Conversion Warnings:");
        result.warnings.forEach((w) => console.log(`     - ${w}`));
      }

      console.log("\n✅ Import successful!");
    } catch (e) {
      console.log(
        `\n❌ Parse error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  } else {
    console.log("\n❌ Skipping parsing due to validation errors");
  }
}

// Test files
const testFiles = [
  "dexpi-1.3-sample.xml", // DEXPI 1.x format
  "dexpi-bfd-example.xml", // DEXPI 2.0 format
  "dexpi-bfd-benzene-example.xml", // DEXPI 2.0 format
];

console.log("DEXPI Import Test Suite");
console.log("Testing DEXPI 1.x (Proteus) and DEXPI 2.0 formats\n");

for (const file of testFiles) {
  testFile(file);
}

console.log("\n" + "=".repeat(60));
console.log("Test suite complete!");
console.log("=".repeat(60));
