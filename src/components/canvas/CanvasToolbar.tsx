"use client";

import { ZoomIn, ZoomOut, Grid3X3, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  onExport: () => void;
  onImport: () => void;
}

export default function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  gridVisible,
  onToggleGrid,
  onExport,
  onImport,
}: CanvasToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <span className="flex items-center px-2 text-sm text-muted-foreground min-w-[3rem] justify-center">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom uit</TooltipContent>
        </Tooltip>

        <div className="w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={gridVisible ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleGrid}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Raster {gridVisible ? "verbergen" : "tonen"}</TooltipContent>
        </Tooltip>

        <div className="w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporteer JSON</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onImport}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Importeer JSON</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
