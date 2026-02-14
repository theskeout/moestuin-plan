"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import type Konva from "konva";
import GridLayer from "./GridLayer";
import PlotOutline from "./PlotOutline";
import CropZoneItem from "./CropZoneItem";
import StructureItem from "./StructureItem";
import CanvasToolbar from "./CanvasToolbar";
import { Garden, Point, StructureType } from "@/lib/garden/types";
import { getPlant } from "@/lib/plants/catalog";
import { exportGarden, importGarden } from "@/lib/garden/storage";
import { snapToGrid } from "@/lib/garden/helpers";
import { SelectedType } from "@/lib/hooks/useGarden";

interface GardenCanvasProps {
  garden: Garden;
  selectedId: string | null;
  selectedType: SelectedType;
  onSelect: (id: string | null, type?: SelectedType) => void;
  onMoveZone: (id: string, x: number, y: number) => void;
  onTransformZone: (id: string, x: number, y: number, w: number, h: number, rotation: number) => void;
  onAddZone: (plantId: string, x: number, y: number) => void;
  onRemoveZone: (id: string) => void;
  onMoveStructure: (id: string, x: number, y: number) => void;
  onTransformStructure: (id: string, x: number, y: number, w: number, h: number, rotation: number) => void;
  onAddStructure: (type: StructureType, x: number, y: number) => void;
  onRemoveStructure: (id: string) => void;
  onUpdateShape: (shape: Garden["shape"]) => void;
  onLoadGarden: (garden: Garden) => void;
  editingCorners: boolean;
}

export default function GardenCanvas({
  garden,
  selectedId,
  onSelect,
  onMoveZone,
  onTransformZone,
  onAddZone,
  onRemoveZone,
  onMoveStructure,
  onTransformStructure,
  onAddStructure,
  onRemoveStructure,
  onUpdateShape,
  onLoadGarden,
  editingCorners,
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
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

  // Koppel transformer aan geselecteerd element (niet bij locked structuren)
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    // Check of het een locked structuur is
    const lockedStruct = garden.structures.find((s) => s.id === selectedId && s.locked);
    if (lockedStruct) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, garden.zones, garden.structures]);

  // Scroll = pan, pinch/ctrl+scroll = zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      if (e.evt.ctrlKey || e.evt.metaKey) {
        // Pinch-zoom (trackpad) of ctrl+scroll
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
      } else {
        // Gewoon scrollen = pan
        setPosition((prev) => ({
          x: prev.x - e.evt.deltaX,
          y: prev.y - e.evt.deltaY,
        }));
      }
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

  // Klik op lege ruimte = deselecteer
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) {
      onSelect(null);
    }
  };

  // Transform end: sla positie, afmetingen en rotatie op in 1 call
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Reset scale, bereken nieuwe afmetingen
    node.scaleX(1);
    node.scaleY(1);

    const newWidthCm = snapToGrid(Math.max((node.width() * scaleX) / scale, 10));
    const newHeightCm = snapToGrid(Math.max((node.height() * scaleY) / scale, 10));
    const newX = snapToGrid(node.x() / scale);
    const newY = snapToGrid(node.y() / scale);

    node.width(newWidthCm * scale);
    node.height(newHeightCm * scale);
    node.x(newX * scale);
    node.y(newY * scale);

    // Bepaal of het een zone of structure is
    const isZone = garden.zones.some((z) => z.id === id);
    if (isZone) {
      onTransformZone(id, newX, newY, newWidthCm, newHeightCm, rotation);
    } else {
      onTransformStructure(id, newX, newY, newWidthCm, newHeightCm, rotation);
    }
  };

  // Drop een plant of structuur op het canvas
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const plantId = e.dataTransfer.getData("plantId");
      const structureType = e.dataTransfer.getData("structureType") as StructureType;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;

      if (plantId) {
        onAddZone(plantId, x, y);
      } else if (structureType) {
        onAddStructure(structureType, x, y);
      }
    },
    [position, scale, onAddZone, onAddStructure]
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

  // Delete handler via keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Niet verwijderen als een input gefocust is
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        const isZone = garden.zones.some((z) => z.id === selectedId);
        if (isZone) {
          onRemoveZone(selectedId);
        } else {
          onRemoveStructure(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, garden.zones, onRemoveZone, onRemoveStructure]);

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
          {/* Grid */}
          <GridLayer
            widthCm={garden.widthCm}
            heightCm={garden.heightCm}
            scale={scale}
            visible={gridVisible}
          />
          {/* Tuinomtrek */}
          <PlotOutline
            corners={garden.shape.corners}
            scale={scale}
            editable={editingCorners}
            onCornerDrag={handleCornerDrag}
          />
          {/* Structuren */}
          {garden.structures.map((structure) => (
            <StructureItem
              key={structure.id}
              structure={structure}
              scale={scale}
              isSelected={selectedId === structure.id}
              onSelect={(id) => onSelect(id, "structure")}
              onDragEnd={onMoveStructure}
            />
          ))}
          {/* Gewaszones */}
          {garden.zones.map((zone) => {
            const plantData = getPlant(zone.plantId);
            if (!plantData) return null;
            return (
              <CropZoneItem
                key={zone.id}
                zone={zone}
                plantData={plantData}
                scale={scale}
                isSelected={selectedId === zone.id}
                onSelect={(id) => onSelect(id, "zone")}
                onDragEnd={onMoveZone}
              />
            );
          })}
          {/* Transformer voor resize + rotatie */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            keepRatio={false}
            borderStroke="#3b82f6"
            borderStrokeWidth={1}
            borderDash={[4, 4]}
            anchorSize={8}
            anchorStroke="#3b82f6"
            anchorFill="#fff"
            anchorCornerRadius={2}
            rotateAnchorOffset={20}
            padding={2}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              // Minimum 10cm
              const minPx = 10 * scale;
              if (newBox.width < minPx || newBox.height < minPx) {
                return oldBox;
              }
              return newBox;
            }}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>
      </Stage>
    </div>
  );
}
