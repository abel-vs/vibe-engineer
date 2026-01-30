"use client";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { MODES, type DiagramMode } from "@/lib/modes";
import { Shapes, Boxes, Settings } from "lucide-react";

const modeIcons: Record<DiagramMode, React.ComponentType<{ className?: string }>> = {
  playground: Shapes,
  bfd: Boxes,
  pfd: Settings,
};

export function ModeSwitcher() {
  const { mode, setMode } = useDiagramStore();

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(value) => {
        if (value) {
          setMode(value as DiagramMode);
        }
      }}
      variant="outline"
      spacing={0}
    >
      {Object.values(MODES).map((modeConfig) => {
        const Icon = modeIcons[modeConfig.id];
        return (
          <Tooltip key={modeConfig.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={modeConfig.id} aria-label={modeConfig.name}>
                <Icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col items-start">
                <span className="font-medium">{modeConfig.name}</span>
                <span className="text-xs opacity-80">{modeConfig.description}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}
