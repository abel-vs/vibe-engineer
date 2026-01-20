"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { getStyleConfig, type DiagramStyle, type StyleConfig } from "@/lib/styles";

interface StyleContextValue {
  style: DiagramStyle;
  config: StyleConfig;
}

const StyleContext = createContext<StyleContextValue | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const style = useDiagramStore((state) => state.style);
  const config = getStyleConfig(style);

  return (
    <StyleContext.Provider value={{ style, config }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle(): StyleContextValue {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyle must be used within a StyleProvider");
  }
  return context;
}
