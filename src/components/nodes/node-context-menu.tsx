"use client";

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCodeView } from "@/contexts/code-view-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { canExportToDexpi } from "@/lib/dexpi";
import { Braces, FileCode } from "lucide-react";
import { type ReactNode } from "react";

interface NodeContextMenuProps {
  children: ReactNode;
  nodeId: string;
  nodeLabel?: string;
}

export function NodeContextMenu({ children, nodeId, nodeLabel }: NodeContextMenuProps) {
  const { highlightNode } = useCodeView();
  const mode = useDiagramStore((state) => state.mode);
  
  const isDexpiAvailable = canExportToDexpi(mode);
  const displayLabel = nodeLabel || nodeId;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="text-xs text-muted-foreground truncate">
          {displayLabel}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => highlightNode(nodeId, "json")}
          className="gap-2"
        >
          <Braces className="w-4 h-4" />
          View in JSON
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => highlightNode(nodeId, "dexpi")}
          disabled={!isDexpiAvailable}
          className="gap-2"
        >
          <FileCode className="w-4 h-4" />
          View in DEXPI XML
          {!isDexpiAvailable && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              P&ID only
            </span>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
