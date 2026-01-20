"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { MODES, type DiagramMode } from "@/lib/modes";

export function ModeSwitcher() {
  const { mode, setMode } = useDiagramStore();

  return (
    <Select value={mode} onValueChange={(value) => setMode(value as DiagramMode)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select mode" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(MODES).map((modeConfig) => (
          <SelectItem key={modeConfig.id} value={modeConfig.id}>
            <div className="flex flex-col items-start">
              <span className="font-medium">{modeConfig.name}</span>
              <span className="text-xs text-gray-500">{modeConfig.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
