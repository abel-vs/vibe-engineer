"use client";

import { useCallback, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileCode, FileType, AlertCircle, CheckCircle2 } from "lucide-react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { dexpiToReactFlow, validateDexpiForImport } from "@/lib/dexpi";
import type { DiagramMode } from "@/lib/modes";
import type { Node, Edge } from "@xyflow/react";

interface ImportResult {
  success: boolean;
  nodes?: Node[];
  edges?: Edge[];
  mode?: DiagramMode;
  warnings?: string[];
  error?: string;
}

export function ImportMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"json" | "dexpi" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const { nodes, loadDiagram } = useDiagramStore();

  const handleImportClick = useCallback((type: "json" | "dexpi") => {
    setImportType(type);
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      const text = await file.text();

      if (importType === "dexpi") {
        return processDexpiFile(text);
      } else {
        return processJsonFile(text);
      }
    },
    [importType]
  );

  const processDexpiFile = (text: string): ImportResult => {
    try {
      // Validate first
      const validation = validateDexpiForImport(text);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid DEXPI file: ${validation.errors.join(", ")}`,
          warnings: validation.warnings,
        };
      }

      // Convert to React Flow format
      const result = dexpiToReactFlow(text);

      return {
        success: true,
        nodes: result.nodes,
        edges: result.edges,
        mode: result.mode,
        warnings: [...(validation.warnings || []), ...result.warnings],
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse DEXPI file: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  };

  const processJsonFile = (text: string): ImportResult => {
    try {
      const data = JSON.parse(text);

      // Validate JSON structure
      if (!data.nodes || !Array.isArray(data.nodes)) {
        return {
          success: false,
          error: "Invalid JSON: missing or invalid 'nodes' array",
        };
      }

      if (!data.edges || !Array.isArray(data.edges)) {
        return {
          success: false,
          error: "Invalid JSON: missing or invalid 'edges' array",
        };
      }

      const mode = data.mode || "playground";
      const warnings: string[] = [];

      if (!data.mode) {
        warnings.push("No mode specified in file, defaulting to playground");
      }

      return {
        success: true,
        nodes: data.nodes,
        edges: data.edges,
        mode: mode as DiagramMode,
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse JSON file: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input
      e.target.value = "";

      const result = await processFile(file);
      setImportResult(result);

      if (result.success) {
        // Check if there's existing content
        if (nodes.length > 0) {
          setShowConfirmDialog(true);
        } else {
          // No existing content, import directly
          confirmImport(result);
        }
      } else {
        setShowResultDialog(true);
      }
    },
    [nodes.length, processFile]
  );

  const confirmImport = useCallback(
    (result: ImportResult) => {
      if (result.success && result.nodes && result.edges && result.mode) {
        loadDiagram(result.nodes, result.edges, result.mode);
        setShowConfirmDialog(false);

        // Show success with warnings if any
        if (result.warnings && result.warnings.length > 0) {
          setShowResultDialog(true);
        }
      }
    },
    [loadDiagram]
  );

  const getAcceptedFileTypes = () => {
    if (importType === "dexpi") {
      return ".xml,.dexpi.xml";
    }
    return ".json";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleImportClick("json")}>
            <FileCode className="w-4 h-4 mr-2" />
            Import JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleImportClick("dexpi")}>
            <FileType className="w-4 h-4 mr-2" />
            Import DEXPI XML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedFileTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Current Diagram?</DialogTitle>
            <DialogDescription>
              Importing will replace your current diagram. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {importResult?.warnings && importResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Import Warnings
                  </p>
                  <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => importResult && confirmImport(importResult)}>
              Replace Diagram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog (for errors or success with warnings) */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importResult?.success ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Import Successful
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Import Failed
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {importResult?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{importResult.error}</p>
            </div>
          )}

          {importResult?.warnings && importResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Warnings:
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside">
                {importResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
