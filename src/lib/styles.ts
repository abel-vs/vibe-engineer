export type DiagramStyle = "colorful" | "engineering";

export interface StyleConfig {
  id: DiagramStyle;
  name: string;
  description: string;
  node: {
    background: string;
    border: string;
    borderSelected: string;
    text: string;
    textSecondary: string;
    shadow: string;
    borderRadius: string;
    handleBg: string;
  };
  edge: {
    stroke: string;
    strokeWidth: number;
    labelBg: string;
    labelBorder: string;
  };
  canvas: {
    background: string;
    gridColor: string;
  };
  showPropertiesOnNode: boolean;
  simplifyShapes: boolean;
}

export const STYLES: Record<DiagramStyle, StyleConfig> = {
  colorful: {
    id: "colorful",
    name: "Colorful",
    description: "Vibrant colors with distinctive shapes",
    node: {
      background: "#ffffff",
      border: "#9ca3af",
      borderSelected: "#3b82f6",
      text: "#1f2937",
      textSecondary: "#6b7280",
      shadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      borderRadius: "0.5rem",
      handleBg: "#3b82f6",
    },
    edge: {
      stroke: "#3b82f6",
      strokeWidth: 2,
      labelBg: "#ffffff",
      labelBorder: "#d1d5db",
    },
    canvas: {
      background: "#f9fafb",
      gridColor: "#e5e7eb",
    },
    showPropertiesOnNode: false,
    simplifyShapes: false,
  },
  engineering: {
    id: "engineering",
    name: "Engineering",
    description: "Professional black/white technical drawing style",
    node: {
      background: "#ffffff",
      border: "#000000",
      borderSelected: "#3b82f6",
      text: "#000000",
      textSecondary: "#4b5563",
      shadow: "none",
      borderRadius: "0",
      handleBg: "#000000",
    },
    edge: {
      stroke: "#000000",
      strokeWidth: 2,
      labelBg: "#ffffff",
      labelBorder: "#000000",
    },
    canvas: {
      background: "#ffffff",
      gridColor: "#d1d5db",
    },
    showPropertiesOnNode: true,
    simplifyShapes: true,
  },
};

export function getStyleConfig(style: DiagramStyle): StyleConfig {
  return STYLES[style];
}
