"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { STYLES, type DiagramStyle } from "@/lib/styles";

export function StyleSwitcher() {
  const { style, setStyle } = useDiagramStore();

  return (
    <Select value={style} onValueChange={(value) => setStyle(value as DiagramStyle)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select style" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(STYLES).map((styleConfig) => (
          <SelectItem key={styleConfig.id} value={styleConfig.id}>
            <div className="flex flex-col items-start">
              <span className="font-medium">{styleConfig.name}</span>
              <span className="text-xs text-gray-500">{styleConfig.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
