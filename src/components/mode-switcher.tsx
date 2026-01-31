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
import { Boxes, Cog, Shapes, Workflow } from "lucide-react";

const modeIcons: Record<DiagramMode, React.ComponentType<{ className?: string }>> = {
  playground: Shapes,
  bfd: Boxes,
  pfd: Workflow,
  pid: Cog,
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
        const isPlayground = modeConfig.id === "playground";
        
        return (
          <Tooltip key={modeConfig.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem 
                value={modeConfig.id} 
                aria-label={modeConfig.name}
                className={isPlayground ? "" : "gap-1.5 px-2.5"}
              >
                <Icon className="h-4 w-4" />
                {!isPlayground && (
                  <span className="text-xs font-medium">{modeConfig.shortName}</span>
                )}
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
