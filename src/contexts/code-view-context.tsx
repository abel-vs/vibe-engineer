"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type CodeViewFormat = "json" | "dexpi" | "original";
export type HighlightElementType = "node" | "edge";

interface CodeViewContextValue {
  // Currently highlighted element in code view
  highlightedElementId: string | null;
  // Type of element (node or edge)
  highlightedElementType: HighlightElementType | null;
  // Format to display (json or dexpi)
  highlightFormat: CodeViewFormat | null;
  // Line number to scroll to
  highlightLine: number | null;
  // Open code view and highlight a specific node
  highlightNode: (nodeId: string, format: CodeViewFormat) => void;
  // Open code view and highlight a specific edge
  highlightEdge: (edgeId: string, format: CodeViewFormat) => void;
  // Clear the highlight
  clearHighlight: () => void;
  // Set the line number (called after content is generated)
  setHighlightLine: (line: number | null) => void;
  // Legacy: get highlighted node ID (for backwards compatibility)
  highlightedNodeId: string | null;
}

const CodeViewContext = createContext<CodeViewContextValue | null>(null);

export function CodeViewProvider({ children }: { children: ReactNode }) {
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [highlightedElementType, setHighlightedElementType] = useState<HighlightElementType | null>(null);
  const [highlightFormat, setHighlightFormat] = useState<CodeViewFormat | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  const highlightNode = useCallback((nodeId: string, format: CodeViewFormat) => {
    setHighlightedElementId(nodeId);
    setHighlightedElementType("node");
    setHighlightFormat(format);
    setHighlightLine(null); // Will be set after content is generated
  }, []);

  const highlightEdge = useCallback((edgeId: string, format: CodeViewFormat) => {
    setHighlightedElementId(edgeId);
    setHighlightedElementType("edge");
    setHighlightFormat(format);
    setHighlightLine(null); // Will be set after content is generated
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedElementId(null);
    setHighlightedElementType(null);
    setHighlightFormat(null);
    setHighlightLine(null);
  }, []);

  // Legacy: derive highlightedNodeId for backwards compatibility
  const highlightedNodeId = highlightedElementType === "node" ? highlightedElementId : null;

  return (
    <CodeViewContext.Provider
      value={{
        highlightedElementId,
        highlightedElementType,
        highlightFormat,
        highlightLine,
        highlightNode,
        highlightEdge,
        clearHighlight,
        setHighlightLine,
        highlightedNodeId,
      }}
    >
      {children}
    </CodeViewContext.Provider>
  );
}

export function useCodeView() {
  const context = useContext(CodeViewContext);
  if (!context) {
    throw new Error("useCodeView must be used within a CodeViewProvider");
  }
  return context;
}
