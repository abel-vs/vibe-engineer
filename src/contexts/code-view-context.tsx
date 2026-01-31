"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type CodeViewFormat = "json" | "dexpi";

interface CodeViewContextValue {
  // Currently highlighted node in code view
  highlightedNodeId: string | null;
  // Format to display (json or dexpi)
  highlightFormat: CodeViewFormat | null;
  // Line number to scroll to
  highlightLine: number | null;
  // Open code view and highlight a specific node
  highlightNode: (nodeId: string, format: CodeViewFormat) => void;
  // Clear the highlight
  clearHighlight: () => void;
  // Set the line number (called after content is generated)
  setHighlightLine: (line: number | null) => void;
}

const CodeViewContext = createContext<CodeViewContextValue | null>(null);

export function CodeViewProvider({ children }: { children: ReactNode }) {
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [highlightFormat, setHighlightFormat] = useState<CodeViewFormat | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  const highlightNode = useCallback((nodeId: string, format: CodeViewFormat) => {
    setHighlightedNodeId(nodeId);
    setHighlightFormat(format);
    setHighlightLine(null); // Will be set after content is generated
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedNodeId(null);
    setHighlightFormat(null);
    setHighlightLine(null);
  }, []);

  return (
    <CodeViewContext.Provider
      value={{
        highlightedNodeId,
        highlightFormat,
        highlightLine,
        highlightNode,
        clearHighlight,
        setHighlightLine,
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
