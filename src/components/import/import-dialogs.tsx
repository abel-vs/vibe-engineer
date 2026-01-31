"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { dexpiToReactFlow, validateDexpiForImport } from "@/lib/dexpi";
import type { DiagramMode } from "@/lib/modes";
import type { Edge, Node } from "@xyflow/react";
import { AlertCircle, Check, Copy, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export interface ImportResult {
  success: boolean;
  nodes?: Node[];
  edges?: Edge[];
  mode?: DiagramMode;
  warnings?: string[];
  error?: string;
}

interface ImportDialogsProps {
  onImportComplete: (nodes: Node[], edges: Edge[], mode: DiagramMode) => void;
  hasExistingContent: boolean;
}

export function ImportDialogs({ onImportComplete, hasExistingContent }: ImportDialogsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"json" | "dexpi" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const processFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();

      if (importType === "dexpi") {
        try {
          const validation = validateDexpiForImport(text);
          if (!validation.valid) {
            return {
              success: false,
              error: `Invalid DEXPI file: ${validation.errors.join(", ")}`,
              warnings: validation.warnings,
            };
          }

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
      } else {
        try {
          const data = JSON.parse(text);
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
      }
    },
    [importType]
  );

  const confirmImport = useCallback(
    (result: ImportResult | null) => {
      if (result?.success && result.nodes && result.edges && result.mode) {
        onImportComplete(result.nodes, result.edges, result.mode);
        setShowConfirmDialog(false);
        if (result.warnings && result.warnings.length > 0) {
          setShowResultDialog(true);
        }
      }
    },
    [onImportComplete]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const result = await processFile(file);
      setImportResult(result);

      if (result.success) {
        if (hasExistingContent) {
          setShowConfirmDialog(true);
        } else {
          confirmImport(result);
        }
      } else {
        setShowResultDialog(true);
      }
    },
    [hasExistingContent, processFile, confirmImport]
  );

  const triggerImport = useCallback((type: "json" | "dexpi") => {
    setImportType(type);
    // Small delay to ensure state is set before opening file dialog
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  }, []);

  // For programmatic imports (e.g., from paste handler)
  const importData = useCallback(
    (result: ImportResult) => {
      setImportResult(result);
      if (result.success) {
        if (hasExistingContent) {
          setShowConfirmDialog(true);
        } else {
          if (result.nodes && result.edges && result.mode) {
            onImportComplete(result.nodes, result.edges, result.mode);
          }
          if (result.warnings && result.warnings.length > 0) {
            setShowResultDialog(true);
          }
        }
      } else {
        setShowResultDialog(true);
      }
    },
    [hasExistingContent, onImportComplete]
  );

  const copyWarningsToClipboard = useCallback(() => {
    if (!importResult) return;
    const text = importResult.warnings?.join("\n") ?? "";
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [importResult]);

  const copyAllToClipboard = useCallback(() => {
    if (!importResult) return;
    const text = [importResult.error, ...(importResult.warnings ?? [])]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [importResult]);

  // Show warnings dialog without confirm (for direct imports when canvas is empty)
  const showWarnings = useCallback((warnings: string[]) => {
    setImportResult({ success: true, warnings });
    setShowResultDialog(true);
  }, []);

  return {
    triggerImport,
    importData,
    showWarnings,
    dialogs: (
      <>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={importType === "dexpi" ? ".xml,.dexpi.xml" : ".json"}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Import Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Replace Current Diagram?</DialogTitle>
              <DialogDescription>
                Importing will replace your current diagram. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {importResult?.warnings && importResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-yellow-800">
                        Import Warnings ({importResult.warnings.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyWarningsToClipboard}
                        className="h-6 px-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside max-h-[200px] overflow-y-auto">
                      {importResult.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => confirmImport(importResult)}>
                Replace Diagram
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Result Dialog */}
        <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {importResult?.success ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Import Successful
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-600" />
                    Import Failed
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {importResult?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-red-700 flex-1">{importResult.error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAllToClipboard}
                      className="h-6 px-2 text-red-700 hover:text-red-900 hover:bg-red-100 shrink-0"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {importResult?.warnings && importResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-yellow-800">
                      Warnings ({importResult.warnings.length}):
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyWarningsToClipboard}
                      className="h-6 px-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <ul className="text-sm text-yellow-700 list-disc list-inside max-h-[200px] overflow-y-auto">
                    {importResult.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowResultDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    ),
  };
}
