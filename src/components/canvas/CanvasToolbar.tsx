"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, Grid3X3, Tag } from "lucide-react";
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
  onZoomSet: (zoom: number) => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  labelsVisible: boolean;
  onToggleLabels: () => void;
}

export default function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomSet,
  gridVisible,
  onToggleGrid,
  labelsVisible,
  onToggleLabels,
}: CanvasToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const startEdit = () => {
    setEditValue(String(Math.round(zoom * 100)));
    setEditing(true);
  };

  const commitEdit = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val >= 10 && val <= 1500) {
      onZoomSet(val / 100);
    }
    setEditing(false);
  };

  return (
    <TooltipProvider>
      <div className="flex gap-1 items-center flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        {editing ? (
          <input
            type="number"
            min={10}
            max={1500}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="w-14 text-center text-sm border rounded px-1 py-0.5"
          />
        ) : (
          <button
            onClick={startEdit}
            className="px-2 text-sm text-muted-foreground hover:text-foreground min-w-[3rem] text-center transition-colors"
            title="Klik om zoom in te voeren"
          >
            {Math.round(zoom * 100)}%
          </button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom uit</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={labelsVisible ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleLabels}
            >
              <Tag className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Labels {labelsVisible ? "verbergen" : "tonen"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
