"use client";

import { useEffect, useRef, useState } from "react";
import { X, Terminal, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DebugLogEntry {
  timestamp: Date;
  type: "info" | "command" | "tool" | "result" | "error";
  message: string;
  data?: unknown;
}

interface DebugTerminalProps {
  logs: DebugLogEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function DebugTerminal({ logs, onClear, onClose }: DebugTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = async () => {
    if (logs.length === 0) return;

    const text = logs
      .map((log) => {
        const time = formatTime(log.timestamp);
        const prefix = getTypePrefix(log.type);
        const data = log.data
          ? ` ${typeof log.data === "string" ? log.data : JSON.stringify(log.data)}`
          : "";
        return `${time} ${prefix} ${log.message}${data}`;
      })
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasLogs = logs.length > 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  const getTypeColor = (type: DebugLogEntry["type"]) => {
    switch (type) {
      case "info":
        return "text-gray-400";
      case "command":
        return "text-cyan-400";
      case "tool":
        return "text-yellow-400";
      case "result":
        return "text-green-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getTypePrefix = (type: DebugLogEntry["type"]) => {
    switch (type) {
      case "info":
        return "[INFO]";
      case "command":
        return "[CMD]";
      case "tool":
        return "[TOOL]";
      case "result":
        return "[OK]";
      case "error":
        return "[ERR]";
      default:
        return "[LOG]";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[500px] h-[350px] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col z-50 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <div className="flex items-center gap-2 text-gray-300">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold">Debug Console</span>
          <span className="text-xs text-gray-500">({logs.length} entries)</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
            onClick={handleCopy}
            disabled={!hasLogs}
            title={copied ? "Copied!" : "Copy logs"}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
            onClick={onClear}
            disabled={!hasLogs}
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            onClick={onClose}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">
            Waiting for voice commands...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-gray-600 shrink-0">
                {formatTime(log.timestamp)}
              </span>
              <span className={`shrink-0 ${getTypeColor(log.type)}`}>
                {getTypePrefix(log.type)}
              </span>
              <span className="text-gray-300">{log.message}</span>
              {log.data && (
                <span className="text-gray-500 truncate">
                  {typeof log.data === "string"
                    ? log.data
                    : JSON.stringify(log.data)}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-gray-800 rounded-b-lg border-t border-gray-700 text-xs text-gray-500">
        <span className="text-green-500">●</span> Debug mode active
      </div>
    </div>
  );
}
