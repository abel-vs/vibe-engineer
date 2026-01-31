"use client";

import { useSettings } from "@/contexts/settings-context";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { getSymbolPath } from "@/lib/dexpi-config";
import type { DiagramMode } from "@/lib/modes";
import type { DiagramStyle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    getSmoothStepPath,
    type Edge,
    type EdgeProps,
} from "@xyflow/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

// Inline component data for rendering on edges
export type InlineComponentData = {
  id: string;
  componentClass: string;
  category: string;
  symbolIndex: number;
  label?: string;
  // Position along edge path (0-1)
  position: number;
  // Rotation in degrees
  rotation: number;
};

export type StreamEdgeData = {
  label?: string;
  flowRate?: string;
  temperature?: string;
  pressure?: string;
  streamType?: "material" | "energy" | "utility" | "signal";
  // Label position along the edge: 0 = source, 0.5 = middle (default), 1 = target
  labelPosition?: number;
  // Vertical offset for label (positive = below edge)
  labelOffset?: number;
  // If true, no arrow marker is shown (when target is an inline component like valves)
  noArrow?: boolean;
  // Inline components (valves, instruments) to render along this edge
  inlineComponents?: InlineComponentData[];
};

export type StreamEdge = Edge<StreamEdgeData>;

// ============================================================================
// Inline Component Rendering
// ============================================================================

// Size of inline component symbols on edges (in pixels)
const INLINE_SYMBOL_SIZE = 24;

/**
 * Calculate a point along an SVG path at a given fraction (0-1)
 * Also returns the angle of the path at that point for rotation
 */
function getPointAtFraction(
  pathElement: SVGPathElement | null,
  fraction: number
): { x: number; y: number; angle: number } | null {
  if (!pathElement) return null;
  
  const pathLength = pathElement.getTotalLength();
  if (pathLength === 0) return null;
  
  const targetLength = fraction * pathLength;
  const point = pathElement.getPointAtLength(targetLength);
  
  // Calculate angle by getting nearby point
  const delta = 1; // Small distance for angle calculation
  const prevLength = Math.max(0, targetLength - delta);
  const nextLength = Math.min(pathLength, targetLength + delta);
  const prevPoint = pathElement.getPointAtLength(prevLength);
  const nextPoint = pathElement.getPointAtLength(nextLength);
  
  const angle = Math.atan2(
    nextPoint.y - prevPoint.y,
    nextPoint.x - prevPoint.x
  ) * (180 / Math.PI);
  
  return { x: point.x, y: point.y, angle };
}

/**
 * Single inline component symbol on an edge
 */
function InlineSymbol({
  component,
  x,
  y,
  angle,
}: {
  component: InlineComponentData;
  x: number;
  y: number;
  angle: number;
}) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  
  // Get the SVG path for this component
  const symbolPath = getSymbolPath(component.category, component.symbolIndex);
  
  // Fetch and process the SVG
  useEffect(() => {
    if (!symbolPath) return;
    
    fetch(symbolPath)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load SVG");
        return res.text();
      })
      .then(text => {
        // Extract just the SVG content
        const svgMatch = text.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        if (svgMatch) {
          let innerContent = svgMatch[1];
          
          // Extract viewBox or dimensions from SVG tag
          const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
          const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 42 42";
          
          // Wrap inner content with our own SVG
          setSvgContent(`<svg viewBox="${viewBox}" width="100%" height="100%">${innerContent}</svg>`);
        }
      })
      .catch(() => {
        // Fallback to a simple shape
        setSvgContent('<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" fill="none" stroke="black" stroke-width="2"/></svg>');
      });
  }, [symbolPath]);
  
  if (!svgContent) return null;
  
  // Calculate rotation - align with edge direction
  // Add 90 degrees because valve symbols typically point "up" in their default orientation
  const rotation = angle;
  
  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      className="inline-component-symbol"
    >
      {/* White background to "cut" the pipe line */}
      <rect
        x={-INLINE_SYMBOL_SIZE / 2}
        y={-INLINE_SYMBOL_SIZE / 2}
        width={INLINE_SYMBOL_SIZE}
        height={INLINE_SYMBOL_SIZE}
        fill="white"
        stroke="none"
      />
      {/* The symbol itself */}
      <foreignObject
        x={-INLINE_SYMBOL_SIZE / 2}
        y={-INLINE_SYMBOL_SIZE / 2}
        width={INLINE_SYMBOL_SIZE}
        height={INLINE_SYMBOL_SIZE}
      >
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </foreignObject>
    </g>
  );
}

/**
 * Renders all inline components along an edge path
 */
function InlineComponentsRenderer({
  edgeId,
  edgePath,
  components,
}: {
  edgeId: string;
  edgePath: string;
  components: InlineComponentData[];
}) {
  const [positions, setPositions] = useState<Array<{ x: number; y: number; angle: number; component: InlineComponentData }>>([]);
  
  // Calculate positions once the path is rendered
  const calculatePositions = useCallback(() => {
    const pathElement = document.querySelector(
      `[data-testid="rf__edge-${edgeId}"] path`
    ) as SVGPathElement | null;
    
    if (!pathElement) {
      // Retry after a short delay if path not found
      setTimeout(calculatePositions, 100);
      return;
    }
    
    const newPositions = components.map(comp => {
      const pointInfo = getPointAtFraction(pathElement, comp.position);
      if (!pointInfo) {
        return { x: 0, y: 0, angle: 0, component: comp };
      }
      return {
        x: pointInfo.x,
        y: pointInfo.y,
        angle: pointInfo.angle,
        component: comp,
      };
    });
    
    setPositions(newPositions);
  }, [edgeId, components]);
  
  // Calculate positions when components change or path changes
  useEffect(() => {
    calculatePositions();
  }, [calculatePositions, edgePath]);
  
  if (positions.length === 0) return null;
  
  return (
    <g className="inline-components-group">
      {positions.map(({ x, y, angle, component }) => (
        <InlineSymbol
          key={component.id}
          component={component}
          x={x}
          y={y}
          angle={angle}
        />
      ))}
    </g>
  );
}

// ============================================================================
// Edge Styling and Layout
// ============================================================================

// Calculate Y offset for edges to prevent overlapping when multiple edges share a source or target
function calculateEdgeOffset(
  edgeId: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  allEdges: Edge[]
): { sourceOffset: number; targetOffset: number } {
  const offsetStep = 15;

  // Find all edges from the same source AND same source handle
  // Only edges sharing the exact same connection point should be offset
  const sourceEdges = allEdges.filter(
    (e) => e.source === sourceId && e.sourceHandle === sourceHandle
  );
  const sourceIndex = sourceEdges.findIndex((e) => e.id === edgeId);
  const sourceOffset =
    sourceEdges.length > 1
      ? (sourceIndex - (sourceEdges.length - 1) / 2) * offsetStep
      : 0;

  // Find all edges to the same target AND same target handle
  const targetEdges = allEdges.filter(
    (e) => e.target === targetId && e.targetHandle === targetHandle
  );
  const targetIndex = targetEdges.findIndex((e) => e.id === edgeId);
  const targetOffset =
    targetEdges.length > 1
      ? (targetIndex - (targetEdges.length - 1) / 2) * offsetStep
      : 0;

  return { sourceOffset, targetOffset };
}

const getEdgeStyle = (streamType?: string, selected?: boolean, diagramStyle?: DiagramStyle) => {
  const baseStyle = {
    strokeWidth: selected ? 3 : 2,
  };

  // Engineering style: all black, differentiate by dash pattern
  if (diagramStyle === "engineering") {
    const engineeringBase = {
      ...baseStyle,
      stroke: selected ? "#1f2937" : "#000000",
    };

    switch (streamType) {
      case "energy":
        return {
          ...engineeringBase,
          strokeDasharray: "8,4",
        };
      case "utility":
        return {
          ...engineeringBase,
          strokeDasharray: "2,2",
        };
      case "signal":
        return {
          ...engineeringBase,
          strokeDasharray: "12,4,2,4",
          strokeWidth: 1.5,
        };
      case "material":
      default:
        return engineeringBase;
    }
  }

  // Colorful style: existing colored implementation
  switch (streamType) {
    case "energy":
      return {
        ...baseStyle,
        stroke: selected ? "#dc2626" : "#ef4444",
        strokeDasharray: "5,5",
      };
    case "utility":
      return {
        ...baseStyle,
        stroke: selected ? "#7c3aed" : "#8b5cf6",
        strokeDasharray: "2,2",
      };
    case "signal":
      return {
        ...baseStyle,
        stroke: selected ? "#0891b2" : "#06b6d4",
        strokeDasharray: "8,4",
        strokeWidth: 1.5,
      };
    case "material":
    default:
      return {
        ...baseStyle,
        stroke: selected ? "#1d4ed8" : "#3b82f6",
      };
  }
};

// Get flow dot color based on stream type and diagram style
function getFlowDotColor(streamType?: string, diagramStyle?: DiagramStyle): string {
  if (diagramStyle === "engineering") {
    return "#000000";
  }
  
  switch (streamType) {
    case "energy":
      return "#ef4444";
    case "utility":
      return "#8b5cf6";
    case "signal":
      return "#06b6d4";
    case "material":
    default:
      return "#3b82f6";
  }
}

// Constants for consistent flow animation across all edges
const DOT_SPEED = 80; // pixels per second - all dots move at this speed
const DOT_SPACING = 80; // pixels between dots - controls how often dots appear
const MIN_DOTS = 1; // minimum number of dots per edge
const MAX_DOTS = 10; // maximum to prevent performance issues on very long edges

// Shared hidden SVG element for path length measurements (singleton)
let measurementPath: SVGPathElement | null = null;

function getPathLength(pathData: string): number {
  if (!pathData) return 0;
  
  // Create measurement element on first use
  if (!measurementPath) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    measurementPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(measurementPath);
    svg.style.cssText = "position:absolute;visibility:hidden;width:0;height:0;pointer-events:none";
    document.body.appendChild(svg);
  }
  
  measurementPath.setAttribute("d", pathData);
  return measurementPath.getTotalLength();
}

// Animated flow dots component with consistent speed
function FlowDots({ 
  edgePath, 
  dotColor,
}: { 
  edgePath: string; 
  dotColor: string;
}) {
  // Calculate path length synchronously (no state = no re-render flicker)
  const pathLength = useMemo(() => getPathLength(edgePath), [edgePath]);

  // Calculate animation parameters
  const { duration, dots } = useMemo(() => {
    if (pathLength === 0) {
      return { duration: 2, dots: [] };
    }
    
    const dur = pathLength / DOT_SPEED;
    const count = Math.max(MIN_DOTS, Math.min(MAX_DOTS, Math.ceil(pathLength / DOT_SPACING)));
    
    // Create dots with negative begin times to start at different phases immediately
    // Negative begin = start that many seconds "into" the animation
    const dotArray = Array.from({ length: count }, (_, i) => ({
      id: i,
      // Negative begin time positions dot at (i/count) along the path at t=0
      beginOffset: -(i / count) * dur,
    }));
    
    return { duration: dur, dots: dotArray };
  }, [pathLength]);

  if (pathLength === 0 || dots.length === 0) return null;

  return (
    <g className="flow-dots">
      {dots.map((dot) => (
        <circle
          key={dot.id}
          r={3}
          fill={dotColor}
          opacity={0.8}
        >
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`${dot.beginOffset}s`}
            path={edgePath}
          />
        </circle>
      ))}
    </g>
  );
}

// Get edge label styles based on diagram mode
// P&ID: Floating text close to edge (no box) - per engineering convention
// PFD/BFD/Playground: Boxed labels with borders
function getEdgeLabelStyle(mode: DiagramMode, diagramStyle: DiagramStyle, selected?: boolean): {
  className: string;
  offset: number; // Perpendicular offset from edge (positive = above/left of edge direction)
} {
  // P&ID mode: labels float close to pipes without boxes
  if (mode === "pid") {
    return {
      className: cn(
        "text-[10px] font-medium bg-white/80",
        diagramStyle === "engineering" ? "text-black" : "text-gray-700",
        selected && "font-semibold"
      ),
      offset: 8, // Small offset above/beside the edge
    };
  }

  // PFD mode: boxed labels with operating conditions
  if (mode === "pfd") {
    return {
      className: cn(
        "px-2 py-1 text-xs font-medium bg-white border",
        diagramStyle === "engineering"
          ? cn("rounded-none border-black", selected && "border-2")
          : cn("rounded shadow-sm", selected ? "border-blue-500 bg-blue-50" : "border-gray-300")
      ),
      offset: 0,
    };
  }

  // BFD mode: boxed labels for flow rates
  if (mode === "bfd") {
    return {
      className: cn(
        "px-2 py-1 text-xs font-medium bg-white border",
        diagramStyle === "engineering"
          ? cn("rounded-none border-black", selected && "border-2")
          : cn("rounded shadow-sm", selected ? "border-blue-500 bg-blue-50" : "border-gray-300")
      ),
      offset: 0,
    };
  }

  // Playground mode: colorful boxed labels
  return {
    className: cn(
      "px-2 py-1 text-xs font-medium bg-white border rounded shadow-sm",
      selected ? "border-blue-500 bg-blue-50" : "border-gray-300"
    ),
    offset: 0,
  };
}

// Calculate the angle of an edge segment for label rotation
// Returns angle in degrees, where 0 = horizontal (left to right)
function calculateEdgeAngle(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Normalize angle to keep text readable (not upside down)
  // If angle would make text upside down, flip it 180 degrees
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  
  return angle;
}

// Calculate perpendicular offset for label positioning
// Offset is applied perpendicular to the edge direction
function calculateLabelOffset(
  angle: number,
  offset: number
): { offsetX: number; offsetY: number } {
  // Perpendicular direction is 90 degrees from edge angle
  const perpAngle = (angle - 90) * (Math.PI / 180);
  return {
    offsetX: Math.cos(perpAngle) * offset,
    offsetY: Math.sin(perpAngle) * offset,
  };
}

export const StreamEdgeComponent = memo(function StreamEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
  selected,
  markerEnd,
  label: propLabel,
}: EdgeProps<StreamEdge>) {
  const diagramStyle = useDiagramStore((state) => state.style);
  const diagramMode = useDiagramStore((state) => state.mode);
  const allEdges = useDiagramStore((state) => state.edges);
  const { showFlow } = useSettings();

  // Calculate offsets to prevent overlapping edges
  // Only edges sharing the exact same handle should be offset from each other
  const { sourceOffset, targetOffset } = useMemo(
    () => calculateEdgeOffset(id, source, target, sourceHandleId, targetHandleId, allEdges),
    [id, source, target, sourceHandleId, targetHandleId, allEdges]
  );

  // Apply offsets perpendicular to the edge direction
  // For horizontal edges (LR layout), offset Y; for vertical edges (TB layout), offset X
  const isHorizontal = sourcePosition === "right" || sourcePosition === "left";
  const adjustedSourceX = isHorizontal ? sourceX : sourceX + sourceOffset;
  const adjustedSourceY = isHorizontal ? sourceY + sourceOffset : sourceY;
  const adjustedTargetX = isHorizontal ? targetX : targetX + targetOffset;
  const adjustedTargetY = isHorizontal ? targetY + targetOffset : targetY;

  // Engineering style: use step path with hard corners (borderRadius: 0)
  // Colorful style: use smooth bezier curves
  const [edgePath, midLabelX, midLabelY] = diagramStyle === "engineering"
    ? getSmoothStepPath({
        sourceX: adjustedSourceX,
        sourceY: adjustedSourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY: adjustedTargetY,
        targetPosition,
        borderRadius: 0, // Hard 90-degree corners
      })
    : getBezierPath({
        sourceX: adjustedSourceX,
        sourceY: adjustedSourceY,
        sourcePosition,
        targetX: adjustedTargetX,
        targetY: adjustedTargetY,
        targetPosition,
      });

  // Get mode-specific label styling
  const labelStyle = getEdgeLabelStyle(diagramMode, diagramStyle, selected);

  // Support both React Flow's standard label prop and data.label for backwards compatibility
  const label = propLabel || data?.label;
  
  // Calculate label position and rotation for P&ID mode
  // Use the path's midpoint (from getSmoothStepPath/getBezierPath) for accurate positioning
  const isPidMode = diagramMode === "pid";
  
  // Calculate edge angle at the midpoint for P&ID label rotation
  // For step paths, determine if the segment at the label position is vertical or horizontal
  const edgeAngle = useMemo(() => {
    if (!isPidMode) return 0;
    
    // For step paths (engineering style), the midpoint from the path function
    // is on a specific segment. We can detect segment orientation by checking
    // if the midpoint's X or Y aligns with source or target coordinates.
    
    // Check if midpoint is on a vertical segment (X close to source or target X)
    const xMatchesSource = Math.abs(midLabelX - adjustedSourceX) < 5;
    const xMatchesTarget = Math.abs(midLabelX - adjustedTargetX) < 5;
    
    // Check if midpoint is on a horizontal segment (Y close to source or target Y)
    const yMatchesSource = Math.abs(midLabelY - adjustedSourceY) < 5;
    const yMatchesTarget = Math.abs(midLabelY - adjustedTargetY) < 5;
    
    // If X matches but Y doesn't, we're on a vertical segment
    const onVerticalSegment = (xMatchesSource || xMatchesTarget) && !yMatchesSource && !yMatchesTarget;
    
    // If Y matches but X doesn't, we're on a horizontal segment  
    const onHorizontalSegment = (yMatchesSource || yMatchesTarget) && !xMatchesSource && !xMatchesTarget;
    
    if (onVerticalSegment) {
      // Vertical segment - rotate label 90 degrees
      // Read from bottom to top (standard P&ID convention)
      return -90;
    }
    
    if (onHorizontalSegment) {
      // Horizontal segment - no rotation
      return 0;
    }
    
    // Fallback: use overall direction if we can't determine segment
    const dx = adjustedTargetX - adjustedSourceX;
    const dy = adjustedTargetY - adjustedSourceY;
    const isVerticalDominant = Math.abs(dy) > Math.abs(dx);
    
    return isVerticalDominant ? -90 : 0;
  }, [isPidMode, midLabelX, midLabelY, adjustedSourceX, adjustedSourceY, adjustedTargetX, adjustedTargetY]);
  
  // Calculate label position
  // For P&ID mode, use the path's actual midpoint for accurate positioning on the edge
  // For other modes, allow adjustment via labelPosition prop
  const labelPosition = data?.labelPosition ?? 0.5;
  
  const labelX = useMemo(() => {
    // P&ID mode: always use path midpoint (label should be on the edge)
    if (isPidMode) {
      return midLabelX;
    }
    // Other modes: interpolate based on labelPosition
    if (labelPosition <= 0.5) {
      const t = labelPosition * 2;
      return adjustedSourceX + (midLabelX - adjustedSourceX) * t;
    } else {
      const t = (labelPosition - 0.5) * 2;
      return midLabelX + (adjustedTargetX - midLabelX) * t;
    }
  }, [isPidMode, labelPosition, adjustedSourceX, midLabelX, adjustedTargetX]);
  
  const labelY = useMemo(() => {
    // P&ID mode: always use path midpoint
    if (isPidMode) {
      return midLabelY;
    }
    // Other modes: interpolate based on labelPosition
    if (labelPosition <= 0.5) {
      const t = labelPosition * 2;
      return adjustedSourceY + (midLabelY - adjustedSourceY) * t;
    } else {
      const t = (labelPosition - 0.5) * 2;
      return midLabelY + (adjustedTargetY - midLabelY) * t;
    }
  }, [isPidMode, labelPosition, adjustedSourceY, midLabelY, adjustedTargetY]);
  
  // Calculate perpendicular offset for P&ID labels (positions label above/beside the edge)
  const { offsetX: labelOffsetX, offsetY: labelOffsetY } = useMemo(() => {
    if (!isPidMode || labelStyle.offset === 0) {
      return { offsetX: 0, offsetY: data?.labelOffset ?? 0 };
    }
    return calculateLabelOffset(edgeAngle, labelStyle.offset);
  }, [isPidMode, edgeAngle, labelStyle.offset, data?.labelOffset]);

  const edgeStyle = getEdgeStyle(data?.streamType, selected, diagramStyle);
  const flowDotColor = getFlowDotColor(data?.streamType, diagramStyle);

  // Hide arrow when target is an inline component (valve, instrument, etc.)
  // Arrows should point INTO equipment but not INTO inline components on pipes
  const effectiveMarkerEnd = data?.noArrow ? undefined : markerEnd;

  // Get inline components for this edge
  const inlineComponents = data?.inlineComponents;
  const hasInlineComponents = inlineComponents && inlineComponents.length > 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={effectiveMarkerEnd}
      />
      {/* Render inline components (valves, instruments) along the edge */}
      {hasInlineComponents && (
        <InlineComponentsRenderer
          edgeId={id}
          edgePath={edgePath}
          components={inlineComponents}
        />
      )}
      {showFlow && !hasInlineComponents && (
        <FlowDots 
          edgePath={edgePath} 
          dotColor={flowDotColor}
        />
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px, ${labelY + labelOffsetY}px)${isPidMode && edgeAngle !== 0 ? ` rotate(${edgeAngle}deg)` : ""}`,
              pointerEvents: "all",
              whiteSpace: "nowrap",
            }}
            className={labelStyle.className}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// Material Stream
export const MaterialStreamEdge = memo(function MaterialStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "material" }}
    />
  );
});

// Energy Stream
export const EnergyStreamEdge = memo(function EnergyStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "energy" }}
    />
  );
});

// Utility Stream
export const UtilityStreamEdge = memo(function UtilityStreamEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "utility" }}
    />
  );
});

// Signal (for instrumentation)
export const SignalEdge = memo(function SignalEdge(
  props: EdgeProps<StreamEdge>
) {
  return (
    <StreamEdgeComponent
      {...props}
      data={{ ...props.data, streamType: "signal" }}
    />
  );
});

export const edgeTypes = {
  stream: StreamEdgeComponent,
  default: StreamEdgeComponent,
  material_stream: MaterialStreamEdge,
  energy_stream: EnergyStreamEdge,
  utility_stream: UtilityStreamEdge,
  signal: SignalEdge,
  arrow: StreamEdgeComponent,
  dashed: EnergyStreamEdge,
};
