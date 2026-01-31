"use client";

import { useDiagramStore } from "@/hooks/use-diagram-store";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useRef, useState } from "react";

interface EditableLabelProps {
  nodeId: string;
  value: string;
  className?: string;
  placeholder?: string;
}

export const EditableLabel = memo(function EditableLabel({
  nodeId,
  value,
  className,
  placeholder = "Label",
}: EditableLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const nodes = useDiagramStore((state) => state.nodes);
  const updateNode = useDiagramStore((state) => state.updateNode);

  // Store click position to restore cursor after enabling contentEditable
  const clickPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Focus when entering edit mode, place cursor at click position
  useEffect(() => {
    if (isEditing && spanRef.current) {
      spanRef.current.focus();
      
      // If we have a click position, try to place cursor there
      if (clickPositionRef.current) {
        const { x, y } = clickPositionRef.current;
        
        // Use caretPositionFromPoint or caretRangeFromPoint to find cursor position
        let range: Range | null = null;
        
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(x, y);
        }
        
        if (range) {
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        
        clickPositionRef.current = null;
      }
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If already editing, let the browser handle it (select word, etc.)
    if (isEditing) {
      return;
    }
    
    e.preventDefault();
    // Store click position to place cursor there after enabling edit mode
    clickPositionRef.current = { x: e.clientX, y: e.clientY };
    setIsEditing(true);
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (!spanRef.current) return;
    
    const newValue = (spanRef.current.textContent || "").trim();
    const currentValue = value || "";
    
    // Only update if value changed
    if (newValue !== currentValue) {
      const currentNode = nodes.find((n) => n.id === nodeId);
      const currentData = currentNode?.data ?? {};
      updateNode(nodeId, {
        data: {
          ...currentData,
          label: newValue || placeholder,
        },
      });
    }
    setIsEditing(false);
  }, [value, nodeId, nodes, updateNode, placeholder]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Reset content to original value
        if (spanRef.current) {
          spanRef.current.textContent = value || placeholder;
        }
        setIsEditing(false);
      }
    },
    [handleSave, value, placeholder]
  );

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Stop mousedown propagation when editing to prevent React Flow drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
    }
  }, [isEditing]);

  // Prevent paste with formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const displayText = value || placeholder;

  return (
    <span
      ref={spanRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={isEditing ? handleKeyDown : undefined}
      onBlur={isEditing ? handleBlur : undefined}
      onPaste={isEditing ? handlePaste : undefined}
      className={cn(
        "outline-none",
        isEditing 
          ? "border-b border-blue-400 bg-blue-50/30 nodrag nopan nowheel cursor-text" 
          : "cursor-text select-none hover:bg-blue-50/50 rounded-sm transition-colors",
        className
      )}
      title={isEditing ? undefined : "Double-click to edit"}
    >
      {displayText}
    </span>
  );
});
