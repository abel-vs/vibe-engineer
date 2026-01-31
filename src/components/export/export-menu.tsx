"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { canExportToDexpi, getExportWarnings, reactFlowToDexpi } from "@/lib/dexpi";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { Download, FileCode, FileImage, FileText, FileType, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

interface ExportMenuProps {
  flowRef: React.RefObject<HTMLDivElement | null>;
}

export function ExportMenu({ flowRef }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { nodes, edges, mode } = useDiagramStore();

  const getFlowElement = useCallback(() => {
    if (!flowRef.current) return null;
    return flowRef.current.querySelector(".react-flow__viewport") as HTMLElement | null;
  }, [flowRef]);

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  const exportToPng = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
      });
      downloadFile(dataUrl, `diagram-${Date.now()}.png`);
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToSvg = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;

    setIsExporting(true);
    try {
      const dataUrl = await toSvg(element, {
        backgroundColor: "#f9fafb",
      });
      downloadFile(dataUrl, `diagram-${Date.now()}.svg`);
    } catch (err) {
      console.error("Failed to export SVG:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToPdf = useCallback(async () => {
    const element = getFlowElement();
    if (!element) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const imgRatio = img.width / img.height;
      let finalWidth = maxWidth;
      let finalHeight = maxWidth / imgRatio;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * imgRatio;
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, "PNG", x, y, finalWidth, finalHeight);
      pdf.save(`diagram-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement]);

  const exportToJson = useCallback(() => {
    const data = {
      mode,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `diagram-${Date.now()}.json`);
    URL.revokeObjectURL(url);
  }, [mode, nodes, edges]);

  const exportToDexpi = useCallback(() => {
    if (!canExportToDexpi(mode)) {
      console.warn("DEXPI export is only available for BFD, PFD and P&ID modes");
      return;
    }

    setIsExporting(true);
    try {
      // Check for warnings
      const warnings = getExportWarnings(nodes, mode);
      if (warnings.length > 0) {
        console.warn("DEXPI Export Warnings:", warnings);
      }

      // Generate DEXPI XML
      const xml = reactFlowToDexpi(nodes, edges, mode, {
        name: `${mode.toUpperCase()} Diagram`,
        description: `Exported from Voice Diagram on ${new Date().toLocaleDateString()}`,
      });

      // Download as file
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `diagram-${Date.now()}.dexpi.xml`);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export DEXPI XML:", err);
    } finally {
      setIsExporting(false);
    }
  }, [mode, nodes, edges]);

  // Check if DEXPI export is available
  const isDexpiAvailable = canExportToDexpi(mode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPng}>
          <FileImage className="w-4 h-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToSvg}>
          <FileCode className="w-4 h-4 mr-2" />
          Export as SVG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPdf}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToJson}>
          <FileCode className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={exportToDexpi}
          disabled={!isDexpiAvailable}
          title={!isDexpiAvailable ? "DEXPI export is only available for BFD, PFD and P&ID modes" : undefined}
        >
          <FileType className="w-4 h-4 mr-2" />
          Export as DEXPI XML
          {!isDexpiAvailable && <span className="ml-1 text-xs text-muted-foreground">(BFD/PFD/P&ID only)</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
