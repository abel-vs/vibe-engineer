"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { DiagramCanvas } from "@/components/diagram-canvas";
import { ShapeToolbar } from "@/components/toolbar/shape-toolbar";
import { ModeSwitcher } from "@/components/mode-switcher";
import { VoiceController } from "@/components/voice-controller";
import { PropertiesPanel } from "@/components/sidebar/properties-panel";
import { ExportMenu } from "@/components/export/export-menu";
import { useVoiceCommands, type DebugLog } from "@/hooks/use-voice-commands";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { autoSave, loadAutoSave, clearAutoSave } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, FolderOpen, Trash2, MessageSquare, Bug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DebugTerminal, type DebugLogEntry } from "@/components/debug-terminal";

export default function DiagramPage() {
  const flowRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

  const handleDebugLog = useCallback((log: DebugLog) => {
    setDebugLogs((prev) => [...prev, log]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const { processVoiceCommand, isProcessing, lastResponse, error } = useVoiceCommands({
    onDebugLog: debugMode ? handleDebugLog : undefined,
  });
  const { nodes, edges, mode, loadDiagram, clearCanvas } = useDiagramStore();

  // Auto-save on changes
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      autoSave(nodes, edges, mode);
    }
  }, [nodes, edges, mode]);

  // Load auto-save on mount
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && (saved.nodes.length > 0 || saved.edges.length > 0)) {
      loadDiagram(saved.nodes, saved.edges, saved.mode);
    }
  }, [loadDiagram]);

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

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">Voice Diagram</h1>
            <Separator orientation="vertical" className="h-6" />
            <ModeSwitcher />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleNewDiagram}>
              <Trash2 className="w-4 h-4 mr-2" />
              New
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Open Diagram</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center text-gray-500">
                  <p>Diagram browser coming soon.</p>
                  <p className="text-sm mt-2">
                    Diagrams are auto-saved locally.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Separator orientation="vertical" className="h-6" />
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
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Shape Toolbar */}
          <aside className="w-40 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <ShapeToolbar />
          </aside>

          {/* Canvas Area */}
          <main className="flex-1 relative" ref={flowRef}>
            <DiagramCanvas />

            {/* Voice Controller Overlay */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
                <VoiceController
                  onTranscript={handleTranscript}
                  disabled={isProcessing}
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
                      {lastResponse && (
                        <p className="text-sm text-green-600 mt-1">
                          {lastResponse}
                        </p>
                      )}
                      {error && (
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
