"use client";

import { DebugTerminal, type DebugLogEntry } from "@/components/debug-terminal";
import { DiagramCanvas } from "@/components/diagram-canvas";
import { ExportMenu } from "@/components/export/export-menu";
import { ImportMenu } from "@/components/import-menu";
import { ModeSwitcher } from "@/components/mode-switcher";
import { PropertiesPanel } from "@/components/sidebar/properties-panel";
import { StyleSwitcher } from "@/components/style-switcher";
import { ShapeToolbar } from "@/components/toolbar/shape-toolbar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { VoiceController } from "@/components/voice-controller";
import { useSettings } from "@/contexts/settings-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { useVoiceCommands, type DebugLog } from "@/hooks/use-voice-commands";
import { getDefaultDirection } from "@/lib/auto-layout";
import { autoSave, clearAutoSave, loadAutoSave, saveDiagram, type SavedDiagram } from "@/lib/storage";
import { ReactFlowProvider } from "@xyflow/react";
import { Bug, Code, FolderOpen, LayoutGrid, MessageSquare, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function DiagramPage() {
  const flowRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showJsonView, setShowJsonView] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { dictionary, dictionaryEnabled } = useSettings();

  const handleDebugLog = useCallback((log: DebugLog) => {
    setDebugLogs((prev) => [...prev, log]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  // Always pass the debug log handler - filter happens inside based on debugMode
  const { processVoiceCommand, isProcessing, lastResponse, error } = useVoiceCommands({
    onDebugLog: handleDebugLog,
  });
  const { nodes, edges, mode, style, loadDiagram, clearCanvas, undo, redo, canUndo, canRedo, organizeLayout, clearPinnedNodes } = useDiagramStore();

  // Auto-save on changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      autoSave(nodes, edges, mode, style);
    }
  }, [nodes, edges, mode, style]);

  // Load auto-save on mount
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && (saved.nodes.length > 0 || saved.edges.length > 0)) {
      loadDiagram(saved.nodes, saved.edges, saved.mode, saved.style);
    }
  }, [loadDiagram]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (modifierKey && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd/Ctrl + Shift + Z = Redo
          redo();
        } else {
          // Cmd/Ctrl + Z = Undo
          undo();
        }
      }

      // Also support Cmd/Ctrl + Y for redo (Windows convention)
      if (modifierKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleTranscript = useCallback(
    async (text: string) => {
      setTranscript(text);
      setShowTranscript(true);

      // Log STT result when debug mode is enabled
      if (debugMode) {
        handleDebugLog({
          timestamp: new Date(),
          type: "info",
          message: `STT received: "${text}"`,
        });
      }

      try {
        await processVoiceCommand(text);
      } catch (err) {
        console.error("Error processing command:", err);
      }
    },
    [processVoiceCommand, debugMode, handleDebugLog]
  );

  const handleNewDiagram = useCallback(() => {
    if (
      nodes.length === 0 ||
      window.confirm("Clear current diagram and start fresh?")
    ) {
      clearCanvas();
      clearAutoSave(); // Clear session storage so refresh starts clean
    }
  }, [nodes.length, clearCanvas]);

  const handleSaveDiagram = useCallback(async () => {
    if (!saveName.trim()) return;
    
    setIsSaving(true);
    try {
      const diagram: SavedDiagram = {
        id: `diagram_${Date.now()}`,
        name: saveName.trim(),
        mode,
        nodes,
        edges,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveDiagram(diagram);
      setSaveDialogOpen(false);
      setSaveName("");
    } catch (err) {
      console.error("Error saving diagram:", err);
    } finally {
      setIsSaving(false);
    }
  }, [saveName, mode, nodes, edges]);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">Voice Diagram</h1>
            <Separator orientation="vertical" className="h-6" />
            <ModeSwitcher />
            <StyleSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo()}
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo()}
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              disabled={nodes.length === 0}
              title="Auto-organize layout"
              onClick={() => {
                clearPinnedNodes(); // Reset pins on manual organize
                organizeLayout(getDefaultDirection(mode));
              }}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Organize
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" onClick={handleNewDiagram}>
              <Trash2 className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Open saved designs (⌘K → Saved Designs)"
              onClick={() => {
                // Dispatch keyboard event to open command menu
                document.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    bubbles: true,
                  })
                );
              }}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Open
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={nodes.length === 0}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Design</DialogTitle>
                  <DialogDescription>
                    Save your diagram to access it later from the command menu (⌘K).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="design-name">Design Name</Label>
                    <Input
                      id="design-name"
                      placeholder="My Design"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && saveName.trim()) {
                          handleSaveDiagram();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {mode.toUpperCase()} • {nodes.length} nodes • {edges.length} edges
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSaveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDiagram}
                    disabled={!saveName.trim() || isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Design"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Separator orientation="vertical" className="h-6" />
            <ImportMenu />
            <ExportMenu flowRef={flowRef} />
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant={debugMode ? "default" : "ghost"}
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              title="Toggle debug terminal - shows all executed commands"
            >
              <Bug className="w-4 h-4 mr-2" />
              {debugMode ? "Debug ON" : "Debug"}
            </Button>
            <Button
              variant={showJsonView ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowJsonView(!showJsonView)}
              title="Toggle JSON view - shows raw diagram state"
            >
              <Code className="w-4 h-4 mr-2" />
              {showJsonView ? "JSON ON" : "JSON"}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Shape Toolbar */}
          <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <ShapeToolbar />
          </aside>

          {/* Canvas Area */}
          <main className="flex-1 relative" ref={flowRef}>
            {showJsonView ? (
              <div className="w-full h-full overflow-auto bg-gray-900 p-4">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      mode,
                      style,
                      nodes: nodes.map((n) => ({
                        id: n.id,
                        type: n.type,
                        position: n.position,
                        data: n.data,
                      })),
                      edges: edges.map((e) => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        type: e.type,
                        label: e.label,
                        data: e.data,
                      })),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            ) : (
              <DiagramCanvas />
            )}

            {/* Voice Controller Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              {/* Test Buttons */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => handleTranscript("Add a rectangle and a circle and connect them")}
                  disabled={isProcessing}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Test: Add shapes
                </button>
                <button
                  onClick={() => {
                    const firstNode = nodes[0];
                    if (firstNode) {
                      console.log("[Test] Setting property on node:", firstNode.id);
                      const { updateNode } = useDiagramStore.getState();
                      const existingProps = (firstNode.data?.properties as Record<string, string>) || {};
                      updateNode(firstNode.id, {
                        data: {
                          ...firstNode.data,
                          properties: { ...existingProps, testProp: "testValue" },
                        },
                      });
                      console.log("[Test] Property set, verifying...");
                      const verifyNode = useDiagramStore.getState().nodes.find(n => n.id === firstNode.id);
                      console.log("[Test] Node after update:", JSON.stringify(verifyNode?.data, null, 2));
                    } else {
                      console.log("[Test] No nodes to update");
                    }
                  }}
                  disabled={nodes.length === 0}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded border border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Test: Set Property
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                <VoiceController
                  onTranscript={handleTranscript}
                  disabled={isProcessing}
                  dictionary={dictionaryEnabled ? dictionary : []}
                />
              </div>
            </div>

            {/* Transcript/Response Toast */}
            {showTranscript && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-md">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">You said:</span> {transcript}
                      </p>
                      {isProcessing && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-blue-500">Thinking...</span>
                        </div>
                      )}
                      {!isProcessing && lastResponse && (
                        <div className="text-sm text-green-600 mt-1 prose prose-sm prose-green max-w-none">
                          <ReactMarkdown>{lastResponse}</ReactMarkdown>
                        </div>
                      )}
                      {!isProcessing && error && (
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowTranscript(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar - Properties Panel */}
          <aside className="w-64 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Properties</h3>
            </div>
            <PropertiesPanel />
          </aside>
        </div>

        {/* Status Bar */}
        <footer className="h-8 bg-white border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0">
          <span>
            {isProcessing ? "Processing voice command..." : "Ready"}
          </span>
          <span>
            {debugMode && (
              <span className="text-green-600 mr-3">[Debug Terminal Open]</span>
            )}
            Press and hold <kbd className="px-1 bg-gray-100 rounded">Space</kbd>{" "}
            to speak
          </span>
        </footer>

        {/* Debug Terminal */}
        {debugMode && (
          <DebugTerminal
            logs={debugLogs}
            onClear={clearDebugLogs}
            onClose={() => setDebugMode(false)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
