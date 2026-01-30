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
import { STYLES, type DiagramStyle } from "@/lib/styles";
import { Palette, Ruler } from "lucide-react";

const styleIcons: Record<DiagramStyle, React.ComponentType<{ className?: string }>> = {
  colorful: Palette,
  engineering: Ruler,
};

export function StyleSwitcher() {
  const { style, setStyle } = useDiagramStore();

  return (
    <ToggleGroup
      type="single"
      value={style}
      onValueChange={(value) => {
        if (value) {
          setStyle(value as DiagramStyle);
        }
      }}
      variant="outline"
      spacing={0}
    >
      {Object.values(STYLES).map((styleConfig) => {
        const Icon = styleIcons[styleConfig.id];
        return (
          <Tooltip key={styleConfig.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={styleConfig.id} aria-label={styleConfig.name}>
                <Icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col items-start">
                <span className="font-medium">{styleConfig.name}</span>
                <span className="text-xs opacity-80">{styleConfig.description}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}
