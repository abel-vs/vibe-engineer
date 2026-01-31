"use client";

import { DebugTerminal, type DebugLogEntry } from "@/components/debug-terminal";
import { DiagramCanvas } from "@/components/diagram-canvas";
import { ImportDialogs } from "@/components/import/import-dialogs";
import { ModeSwitcher } from "@/components/mode-switcher";
import { PropertiesPanel } from "@/components/sidebar/properties-panel";
import { StyleSwitcher } from "@/components/style-switcher";
import { ShapeToolbar } from "@/components/toolbar/shape-toolbar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceController } from "@/components/voice-controller";
import { useCodeView } from "@/contexts/code-view-context";
import { useSettings } from "@/contexts/settings-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { useVoiceCommands, type DebugLog } from "@/hooks/use-voice-commands";
import { getModeLayoutOptions } from "@/lib/auto-layout";
import { canExportToDexpi, dexpiToReactFlow, getExportWarnings, reactFlowToDexpi, validateDexpiForImport } from "@/lib/dexpi";
import { clearAutoSave, loadWorkspace, saveDiagram, saveWorkspace, type SavedDiagram } from "@/lib/storage";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { lintGutter, linter } from "@codemirror/lint";
import { openSearchPanel, search } from "@codemirror/search";
import { EditorView } from "@codemirror/view";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { ReactFlowProvider } from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { ArrowRight, Bug, Check, Code, Copy, Download, FileCode, FileImage, FileText, FileType, FolderOpen, LayoutGrid, Loader2, MessageSquare, MoreVertical, Pencil, Redo2, Save, Trash2, Undo2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function DiagramPage() {
  const flowRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const [showJsonView, setShowJsonView] = useState(false);
  const [codeViewMode, setCodeViewMode] = useState<"json" | "dexpi">("json");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [editableJson, setEditableJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dexpiXml, setDexpiXml] = useState<string>("");
  const [newDiagramDialogOpen, setNewDiagramDialogOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { dictionary, dictionaryEnabled, showChatInput } = useSettings();
  const { highlightedNodeId, highlightFormat, clearHighlight, setHighlightLine } = useCodeView();
  
  // CodeMirror refs for programmatic scrolling
  const jsonEditorRef = useRef<ReactCodeMirrorRef>(null);
  const dexpiEditorRef = useRef<ReactCodeMirrorRef>(null);

  const handleDebugLog = useCallback((log: DebugLog) => {
    setDebugLogs((prev) => [...prev, log]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  // Always pass the debug log handler - filter happens inside based on debugMode
  const { processVoiceCommand, reset: resetVoiceCommands, isProcessing, lastResponse, error } = useVoiceCommands({
    onDebugLog: handleDebugLog,
  });
  const { nodes, edges, mode, style, loadDiagram, resetCanvas, undo, redo, canUndo, canRedo, organizeLayout, clearPinnedNodes, setMode } = useDiagramStore();

  // Import dialogs
  const { triggerImport, importData, showWarnings, dialogs: importDialogs } = ImportDialogs({
    onImportComplete: loadDiagram,
    hasExistingContent: nodes.length > 0,
  });

  // Helper to generate JSON string from current state
  const generateJsonString = useCallback(() => {
    return JSON.stringify(
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
    );
  }, [mode, style, nodes, edges]);

  // Helper to generate DEXPI XML from current state
  const generateDexpiXml = useCallback(() => {
    if (!canExportToDexpi(mode)) {
      return `<!-- DEXPI export is only available for BFD, PFD and P&ID modes.\nCurrent mode: ${mode.toUpperCase()} -->\n\n<!-- Switch to BFD, PFD or P&ID mode to view DEXPI XML -->`;
    }
    try {
      return reactFlowToDexpi(nodes, edges, mode, {
        name: `${mode.toUpperCase()} Diagram`,
        description: `Generated from Voice Diagram`,
      });
    } catch (err) {
      return `<!-- Error generating DEXPI XML: ${err instanceof Error ? err.message : String(err)} -->`;
    }
  }, [mode, nodes, edges]);

  // Enter edit mode with current JSON
  const handleEnterEditMode = useCallback(() => {
    setEditableJson(generateJsonString());
    setJsonError(null);
    setJsonEditMode(true);
  }, [generateJsonString]);

  // Apply JSON changes
  const handleApplyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(editableJson);
      
      // Validate structure
      if (!Array.isArray(parsed.nodes)) {
        throw new Error("Invalid JSON: 'nodes' must be an array");
      }
      if (!Array.isArray(parsed.edges)) {
        throw new Error("Invalid JSON: 'edges' must be an array");
      }
      
      // Convert to React Flow format
      const newNodes = parsed.nodes.map((n: { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data || {},
      }));
      
      const newEdges = parsed.edges.map((e: { id: string; source: string; target: string; type?: string; label?: string; data?: Record<string, unknown> }) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || "default",
        label: e.label,
        data: e.data || {},
      }));
      
      // Load the diagram with new data
      loadDiagram(newNodes, newEdges, parsed.mode || mode, parsed.style || style);
      
      setJsonEditMode(false);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }, [editableJson, loadDiagram, mode, style]);

  // Cancel edit mode
  const handleCancelEdit = useCallback(() => {
    setJsonEditMode(false);
    setJsonError(null);
  }, []);

  // CodeMirror extensions for JSON editing
  const jsonExtensions = useMemo(() => [
    json(),
    linter(jsonParseLinter()),
    lintGutter(),
    search({
      top: true,
    }),
    // Handle Cmd/Ctrl+F to open search panel (prevents browser default)
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "f") {
          event.preventDefault();
          openSearchPanel(view);
          return true;
        }
        return false;
      },
    }),
  ], []);

  // CodeMirror extensions for XML viewing (with line wrapping)
  const xmlExtensions = useMemo(() => [
    xml(),
    search({
      top: true,
    }),
    // Handle Cmd/Ctrl+F to open search panel (prevents browser default)
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "f") {
          event.preventDefault();
          openSearchPanel(view);
          return true;
        }
        return false;
      },
    }),
  ], []);

  // Auto-save on changes - save to per-mode workspace
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      saveWorkspace(mode, {
        nodes,
        edges,
        style,
        timestamp: Date.now(),
      });
    }
  }, [nodes, edges, mode, style]);

  // Load workspace for current mode on mount
  useEffect(() => {
    const saved = loadWorkspace(mode);
    if (saved && (saved.nodes.length > 0 || saved.edges.length > 0)) {
      loadDiagram(saved.nodes, saved.edges, mode, saved.style);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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

  // Paste event handler for DEXPI XML
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Ignore if pasting in an input field or in JSON edit mode
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || jsonEditMode) {
        return;
      }

      const text = e.clipboardData?.getData("text");
      if (!text) return;

      // Check if it looks like DEXPI XML
      const trimmed = text.trim();
      if (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<DEXPI-Document")) {
        return;
      }

      // Try to validate and parse as DEXPI
      try {
        const validation = validateDexpiForImport(text);
        if (!validation.valid) {
          console.warn("Pasted content is not valid DEXPI XML:", validation.errors);
          return;
        }

        e.preventDefault();

        // Parse DEXPI XML
        const result = dexpiToReactFlow(text);
        const allWarnings = [...(validation.warnings || []), ...result.warnings];

        // Use importData to handle the import flow (dialogs, etc.)
        importData({
          success: true,
          nodes: result.nodes,
          edges: result.edges,
          mode: result.mode,
          warnings: allWarnings,
        });
      } catch (err) {
        console.error("Failed to parse pasted DEXPI XML:", err);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [jsonEditMode, importData]);

  // Helper function to find line number for a node ID in content
  const findNodeLineNumber = useCallback((content: string, nodeId: string, format: "json" | "dexpi"): number | null => {
    const lines = content.split("\n");
    
    if (format === "json") {
      // Look for "id": "nodeId" pattern
      const pattern = new RegExp(`"id":\\s*"${nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          return i + 1; // Line numbers are 1-indexed
        }
      }
    } else {
      // Look for id="nodeId" pattern in XML
      const pattern = new RegExp(`id="${nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          return i + 1;
        }
      }
    }
    return null;
  }, []);

  // Effect to handle code view highlighting from context menu
  useEffect(() => {
    if (highlightedNodeId && highlightFormat) {
      // Open code view with the correct tab
      setShowJsonView(true);
      setCodeViewMode(highlightFormat);
      
      // Find the line number in the generated content
      const content = highlightFormat === "json" ? generateJsonString() : generateDexpiXml();
      const lineNumber = findNodeLineNumber(content, highlightedNodeId, highlightFormat);
      
      if (lineNumber) {
        setHighlightLine(lineNumber);
        
        // Scroll to line after a short delay to allow CodeMirror to render
        setTimeout(() => {
          const editorRef = highlightFormat === "json" ? jsonEditorRef : dexpiEditorRef;
          const view = editorRef.current?.view;
          
          if (view) {
            const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
            view.dispatch({
              effects: EditorView.scrollIntoView(line.from, { y: "center" }),
              selection: { anchor: line.from, head: line.to },
            });
          }
        }, 100);
      }
    }
  }, [highlightedNodeId, highlightFormat, generateJsonString, generateDexpiXml, findNodeLineNumber, setHighlightLine]);

  // Clear highlight when closing code view
  useEffect(() => {
    if (!showJsonView && highlightedNodeId) {
      clearHighlight();
    }
  }, [showJsonView, highlightedNodeId, clearHighlight]);

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

  const confirmNewDiagram = useCallback(() => {
    resetVoiceCommands();
    resetCanvas();
    clearAutoSave();
    clearDebugLogs();
    setShowTranscript(false);
    setTranscript("");
    setJsonEditMode(false);
    setEditableJson("");
    setJsonError(null);
    setJsonCopied(false);
    setCanvasResetKey((k) => k + 1);
    setNewDiagramDialogOpen(false);
  }, [resetVoiceCommands, resetCanvas, clearDebugLogs]);

  const handleNewDiagram = useCallback(() => {
    const isEmpty = nodes.length === 0 && edges.length === 0;
    if (isEmpty) {
      confirmNewDiagram();
    } else {
      setNewDiagramDialogOpen(true);
    }
  }, [nodes.length, edges.length, confirmNewDiagram]);

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

  // Handle upgrading diagram to next level (BFD -> PFD or PFD -> P&ID)
  const handleUpgradeDiagram = useCallback(async () => {
    if (nodes.length === 0) return;
    
    const targetMode = mode === "bfd" ? "pfd" : "pid";
    const upgradePrompt = mode === "bfd" 
      ? "Upgrade this BFD to a PFD: Convert each process block to specific equipment (vessels, pumps, heat exchangers, etc.), add operating conditions on streams (temperature, pressure, flow rates), maintain the same process flow. Do NOT add valves or instruments - those are for P&ID."
      : "Upgrade this PFD to a P&ID: Keep all existing equipment, add control valves on each stream, add instruments (transmitters, controllers) for key process variables, add relief valves where needed, add control loops. Use ISA tag numbers for instruments.";
    
    setIsUpgrading(true);
    try {
      // First change the mode so the AI uses the correct equipment types
      setMode(targetMode);
      // Then process the upgrade command
      await processVoiceCommand(upgradePrompt);
    } catch (err) {
      console.error("Error upgrading diagram:", err);
    } finally {
      setIsUpgrading(false);
    }
  }, [mode, nodes.length, processVoiceCommand, setMode]);

  // Export handlers
  const getFlowElement = useCallback(() => {
    if (!flowRef.current) return null;
    return flowRef.current.querySelector(".react-flow__viewport") as HTMLElement | null;
  }, []);

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const exportToPng = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
      });
      downloadFile(dataUrl, `diagram-${Date.now()}.png`);
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToSvg = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;
    setIsExporting(true);
    try {
      const dataUrl = await toSvg(element, {
        backgroundColor: "#f9fafb",
      });
      downloadFile(dataUrl, `diagram-${Date.now()}.svg`);
    } catch (err) {
      console.error("Failed to export SVG:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToPdf = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const imgRatio = img.width / img.height;
      let finalWidth = maxWidth;
      let finalHeight = maxWidth / imgRatio;
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgRatio;
      }
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, finalWidth, finalHeight);
      pdf.save(`diagram-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToJson = useCallback(() => {
    const data = {
      mode,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `diagram-${Date.now()}.json`);
    URL.revokeObjectURL(url);
  }, [mode, nodes, edges]);

  const exportToDexpi = useCallback(() => {
    if (!canExportToDexpi(mode)) {
      console.warn("DEXPI export is only available for BFD, PFD and P&ID modes");
      return;
    }
    setIsExporting(true);
    try {
      const warnings = getExportWarnings(nodes, mode);
      if (warnings.length > 0) {
        console.warn("DEXPI Export Warnings:", warnings);
      }
      const xml = reactFlowToDexpi(nodes, edges, mode, {
        name: `${mode.toUpperCase()} Diagram`,
        description: `Exported from Voice Diagram on ${new Date().toLocaleDateString()}`,
      });
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `diagram-${Date.now()}.dexpi.xml`);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export DEXPI XML:", err);
    } finally {
      setIsExporting(false);
    }
  }, [mode, nodes, edges]);

  const isDexpiAvailable = canExportToDexpi(mode);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-800">Voice Diagram</h1>
            <Separator orientation="vertical" className="h-6" />
            <ModeSwitcher />
            {/* Generate next level diagram button - appears in BFD and PFD modes */}
            {(mode === "bfd" || mode === "pfd") && nodes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpgradeDiagram}
                disabled={isUpgrading || isProcessing}
                className="gap-1.5 text-xs"
                title={mode === "bfd" 
                  ? "Generate PFD from this BFD - converts blocks to specific equipment" 
                  : "Generate P&ID from this PFD - adds valves, instruments, control loops"}
              >
                {isUpgrading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                {mode === "bfd" ? "Generate PFD" : "Generate P&ID"}
              </Button>
            )}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={nodes.length === 0}
                  onClick={() => {
                    clearPinnedNodes();
                    organizeLayout(getModeLayoutOptions(mode));
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Auto-organize layout</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleNewDiagram}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New diagram</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="More options">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  title="Open saved designs (⌘K → Saved Designs)"
                  onClick={() => {
                    document.dispatchEvent(
                      new KeyboardEvent("keydown", {
                        key: "k",
                        metaKey: true,
                        bubbles: true,
                      })
                    );
                  }}
                >
                  <FolderOpen className="w-4 h-4" />
                  Open
                </DropdownMenuItem>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem
                      disabled={nodes.length === 0}
                      onSelect={(e) => {
                        e.preventDefault();
                        setSaveDialogOpen(true);
                      }}
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </DropdownMenuItem>
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          mode === "playground" ? "bg-gray-100 text-gray-700" :
                          mode === "bfd" ? "bg-blue-100 text-blue-700" :
                          mode === "pfd" ? "bg-green-100 text-green-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>
                          {mode === "pid" ? "P&ID" : mode.toUpperCase()}
                        </span>
                        <span>{nodes.length} nodes • {edges.length} edges</span>
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
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Upload className="w-4 h-4" />
                    Import
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => triggerImport("json")}>
                      <FileCode className="w-4 h-4" />
                      Import JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => triggerImport("dexpi")}>
                      <FileType className="w-4 h-4" />
                      Import DEXPI XML
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={exportToPng} disabled={isExporting}>
                      <FileImage className="w-4 h-4" />
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToSvg} disabled={isExporting}>
                      <FileCode className="w-4 h-4" />
                      Export as SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPdf} disabled={isExporting}>
                      <FileText className="w-4 h-4" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportToJson} disabled={isExporting}>
                      <FileCode className="w-4 h-4" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={exportToDexpi}
                      disabled={!isDexpiAvailable || isExporting}
                      title={!isDexpiAvailable ? "DEXPI export is only available for BFD, PFD and P&ID modes" : undefined}
                    >
                      <FileType className="w-4 h-4" />
                      Export as DEXPI XML
                      {!isDexpiAvailable && <span className="ml-1 text-xs text-muted-foreground">(BFD/PFD/P&ID only)</span>}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDebugMode(!debugMode)}
                  className={debugMode ? "bg-accent" : ""}
                >
                  <Bug className="w-4 h-4" />
                  {debugMode ? "Debug ON" : "Debug"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showJsonView ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowJsonView(!showJsonView)}
                >
                  <Code className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle JSON view - shows raw diagram state</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* New Diagram Confirmation Dialog */}
        <AlertDialog open={newDiagramDialogOpen} onOpenChange={setNewDiagramDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start a new diagram?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear your current diagram. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmNewDiagram}>
                Clear & Start Fresh
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Dialogs */}
        {importDialogs}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Shape Toolbar */}
          <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <ShapeToolbar />
          </aside>

          {/* Canvas Area */}
          <main className="flex-1 relative overflow-hidden" ref={flowRef}>
            {showJsonView ? (
              <div className="w-full h-full flex flex-col bg-gray-900 relative overflow-hidden">
                <Tabs
                  value={codeViewMode}
                  onValueChange={(value) => setCodeViewMode(value as "json" | "dexpi")}
                  className="flex flex-col h-full"
                >
                  {/* Toolbar with Tabs and Actions */}
                  <div className="flex items-center justify-between p-2 border-b border-neutral-700 shrink-0 bg-neutral-800">
                    {/* Tabs */}
                    <TabsList className="bg-neutral-900 border border-neutral-700">
                      <TabsTrigger value="json" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100 text-neutral-400">
                        JSON
                      </TabsTrigger>
                      <TabsTrigger
                        value="dexpi"
                        className="data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-100 text-neutral-400"
                        disabled={!canExportToDexpi(mode)}
                        title={!canExportToDexpi(mode) ? "DEXPI XML is only available in BFD/PFD/P&ID modes" : undefined}
                      >
                        DEXPI XML
                      </TabsTrigger>
                    </TabsList>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Edit/Apply/Cancel Buttons - Only for JSON */}
                      {codeViewMode === "json" && (
                        <>
                          {jsonEditMode ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                                onClick={handleApplyJson}
                                title="Apply changes"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Apply
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                                onClick={handleCancelEdit}
                                title="Cancel editing"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white hover:bg-gray-700"
                              onClick={handleEnterEditMode}
                              title="Edit JSON"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </>
                      )}

                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                        onClick={() => {
                          const content = codeViewMode === "json"
                            ? (jsonEditMode ? editableJson : generateJsonString())
                            : generateDexpiXml();
                          navigator.clipboard.writeText(content);
                          setJsonCopied(true);
                          setTimeout(() => setJsonCopied(false), 2000);
                        }}
                        title={`Copy ${codeViewMode === "json" ? "JSON" : "DEXPI XML"} to clipboard`}
                      >
                        {jsonCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Error message */}
                  {jsonError && codeViewMode === "json" && (
                    <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-xs">
                      {jsonError}
                    </div>
                  )}

                  {/* Tab Content */}
                  <TabsContent value="json" className="flex-1 overflow-hidden m-0 ring-0 w-full">
                    <CodeMirror
                      ref={jsonEditorRef}
                      value={jsonEditMode ? editableJson : generateJsonString()}
                      height="100%"
                      width="100%"
                      theme={vscodeDark}
                      extensions={jsonExtensions}
                      editable={jsonEditMode}
                      readOnly={!jsonEditMode}
                      onChange={(value) => {
                        if (jsonEditMode) {
                          setEditableJson(value);
                          setJsonError(null);
                        }
                      }}
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        highlightActiveLine: jsonEditMode || !!highlightedNodeId,
                        foldGutter: true,
                        bracketMatching: true,
                        closeBrackets: jsonEditMode,
                        autocompletion: jsonEditMode,
                        indentOnInput: jsonEditMode,
                      }}
                      className="h-full w-full max-w-full [&_.cm-editor]:h-full [&_.cm-editor]:w-full [&_.cm-scroller]:overflow-auto"
                    />
                  </TabsContent>

                  <TabsContent value="dexpi" className="flex-1 overflow-hidden m-0 ring-0 w-full">
                    <CodeMirror
                      ref={dexpiEditorRef}
                      value={generateDexpiXml()}
                      height="100%"
                      width="100%"
                      theme={vscodeDark}
                      extensions={xmlExtensions}
                      editable={false}
                      readOnly={true}
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        highlightActiveLine: !!highlightedNodeId,
                        foldGutter: true,
                        bracketMatching: true,
                      }}
                      className="h-full w-full max-w-full [&_.cm-editor]:h-full [&_.cm-editor]:w-full [&_.cm-scroller]:overflow-auto"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <DiagramCanvas key={canvasResetKey} />
            )}

            {/* Voice Controller Overlay */}
            {showChatInput && (
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
            )}

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
