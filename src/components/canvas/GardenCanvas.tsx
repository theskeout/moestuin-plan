"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import GridLayer from "./GridLayer";
import PlotOutline from "./PlotOutline";
import PlantItem from "./PlantItem";
import CanvasToolbar from "./CanvasToolbar";
import { Garden, Point } from "@/lib/garden/types";
import { getPlant } from "@/lib/plants/catalog";
import { exportGarden, importGarden } from "@/lib/garden/storage";

interface GardenCanvasProps {
  garden: Garden;
  selectedPlantId: string | null;
  onSelectPlant: (id: string | null) => void;
  onMovePlant: (id: string, x: number, y: number) => void;
  onAddPlant: (plantId: string, x: number, y: number) => void;
  onUpdateShape: (shape: Garden["shape"]) => void;
  onLoadGarden: (garden: Garden) => void;
  editingCorners: boolean;
  dragPlantId: string | null;
}

export default function GardenCanvas({
  garden,
  selectedPlantId,
  onSelectPlant,
  onMovePlant,
  onAddPlant,
  onUpdateShape,
  onLoadGarden,
  editingCorners,
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [gridVisible, setGridVisible] = useState(true);

  // Bereken initiële schaal zodat de tuin in het scherm past
  const baseScale = Math.min(
    (stageSize.width - 40) / garden.widthCm,
    (stageSize.height - 40) / garden.heightCm,
    2
  );
  const scale = baseScale * zoom;

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Zoom met scrollwiel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const stage = stageRef.current;
      if (!stage) return;

      const oldZoom = zoom;
      const newZoom =
        e.evt.deltaY < 0
          ? Math.min(oldZoom * scaleBy, 5)
          : Math.max(oldZoom / scaleBy, 0.1);

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - position.x) / (baseScale * oldZoom),
        y: (pointer.y - position.y) / (baseScale * oldZoom),
      };

      setZoom(newZoom);
      setPosition({
        x: pointer.x - mousePointTo.x * baseScale * newZoom,
        y: pointer.y - mousePointTo.y * baseScale * newZoom,
      });
    },
    [zoom, position, baseScale]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.1));

  const handleCornerDrag = (index: number, newPos: Point) => {
    const newCorners = [...garden.shape.corners];
    newCorners[index] = newPos;
    onUpdateShape({ corners: newCorners });
  };

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
      setPosition({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Drop een plant op het canvas
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Klik op lege ruimte = deselecteer
    if (e.target === stageRef.current) {
      onSelectPlant(null);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const plantId = e.dataTransfer.getData("plantId");
      if (!plantId) return;

      const stage = stageRef.current;
      if (!stage) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;

      onAddPlant(plantId, x, y);
    },
    [position, scale, onAddPlant]
  );

  const handleExport = () => {
    const json = exportGarden(garden);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${garden.name.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        const imported = importGarden(result);
        if (imported) {
          onLoadGarden(imported);
        } else {
          alert("Ongeldig bestand.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-stone-50 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <CanvasToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        gridVisible={gridVisible}
        onToggleGrid={() => setGridVisible(!gridVisible)}
        onExport={handleExport}
        onImport={handleImport}
      />
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={position.x}
        y={position.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          <GridLayer
            widthCm={garden.widthCm}
            heightCm={garden.heightCm}
            scale={scale}
            visible={gridVisible}
          />
          <PlotOutline
            corners={garden.shape.corners}
            scale={scale}
            editable={editingCorners}
            onCornerDrag={handleCornerDrag}
          />
          {garden.plants.map((plant) => {
            const plantData = getPlant(plant.plantId);
            if (!plantData) return null;
            return (
              <PlantItem
                key={plant.id}
                plant={plant}
                plantData={plantData}
                scale={scale}
                isSelected={selectedPlantId === plant.id}
                onSelect={onSelectPlant}
                onDragEnd={onMovePlant}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
