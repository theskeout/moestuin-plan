"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import type Konva from "konva";
import GridLayer from "./GridLayer";
import PlotOutline from "./PlotOutline";
import CropZoneItem from "./CropZoneItem";
import StructureItem from "./StructureItem";
import { Garden, Point, StructureType } from "@/lib/garden/types";
import { getPlant } from "@/lib/plants/catalog";
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
  editingCorners: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  gridVisible: boolean;
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
  editingCorners,
  zoom,
  onZoomChange,
  gridVisible,
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const initializedRef = useRef(false);

  // Bereken initiële schaal zodat de tuin in het scherm past
  const baseScale = Math.min(
    (stageSize.width - 40) / garden.widthCm,
    (stageSize.height - 40) / garden.heightCm,
    2
  );
  const scale = baseScale * zoom;

  // Centreer de tuin bij eerste render
  const centeredPosition = useMemo(() => ({
    x: (stageSize.width - garden.widthCm * scale) / 2,
    y: (stageSize.height - garden.heightCm * scale) / 2,
  }), [stageSize.width, stageSize.height, garden.widthCm, garden.heightCm, scale]);
  const pos = position || centeredPosition;

  // Resize observer + initiële centrering
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        setStageSize(newSize);
        // Centreer bij allereerste meting
        if (!initializedRef.current && newSize.width > 0) {
          initializedRef.current = true;
          const bs = Math.min(
            (newSize.width - 40) / garden.widthCm,
            (newSize.height - 40) / garden.heightCm,
            2
          );
          setPosition({
            x: (newSize.width - garden.widthCm * bs) / 2,
            y: (newSize.height - garden.heightCm * bs) / 2,
          });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [garden.widthCm, garden.heightCm]);

  // Koppel transformer aan geselecteerd element (niet bij locked structuren)
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    // Check of het een locked element is
    const lockedStruct = garden.structures.find((s) => s.id === selectedId && s.locked);
    const lockedZone = garden.zones.find((z) => z.id === selectedId && z.locked);
    if (lockedStruct || lockedZone) {
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
            ? Math.min(oldZoom * scaleBy, 15)
            : Math.max(oldZoom / scaleBy, 0.1);

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - pos.x) / (baseScale * oldZoom),
          y: (pointer.y - pos.y) / (baseScale * oldZoom),
        };

        internalZoomRef.current = true;
        onZoomChange(newZoom);
        setPosition({
          x: pointer.x - mousePointTo.x * baseScale * newZoom,
          y: pointer.y - mousePointTo.y * baseScale * newZoom,
        });
      } else {
        // Gewoon scrollen = pan
        setPosition((prev) => {
          const p = prev || centeredPosition;
          return {
            x: p.x - e.evt.deltaX,
            y: p.y - e.evt.deltaY,
          };
        });
      }
    },
    [zoom, pos, baseScale, centeredPosition, onZoomChange]
  );

  // Detecteer externe zoom-wijzigingen (toolbar) en centreer
  const prevZoomRef = useRef(zoom);
  const internalZoomRef = useRef(false);
  useEffect(() => {
    const oldZoom = prevZoomRef.current;
    if (oldZoom === zoom) return;
    prevZoomRef.current = zoom;

    // Wheel-zoom handelt positie zelf af
    if (internalZoomRef.current) {
      internalZoomRef.current = false;
      return;
    }

    // Externe zoom: centreer op viewport midden
    if (!position) return;
    const cx = stageSize.width / 2;
    const cy = stageSize.height / 2;
    const pointTo = {
      x: (cx - position.x) / (baseScale * oldZoom),
      y: (cy - position.y) / (baseScale * oldZoom),
    };
    setPosition({
      x: cx - pointTo.x * baseScale * zoom,
      y: cy - pointTo.y * baseScale * zoom,
    });
  }, [zoom, position, baseScale, stageSize]);

  const handleCornerDrag = (index: number, newPos: Point) => {
    const newCorners = [...garden.shape.corners];
    newCorners[index] = newPos;
    onUpdateShape({ corners: newCorners });
  };

  const handleAddCorner = (afterIndex: number, pos: Point) => {
    const newCorners = [...garden.shape.corners];
    newCorners.splice(afterIndex + 1, 0, pos);
    onUpdateShape({ corners: newCorners });
  };

  const handleRemoveCorner = (index: number) => {
    if (garden.shape.corners.length <= 3) return;
    const newCorners = garden.shape.corners.filter((_, i) => i !== index);
    onUpdateShape({ corners: newCorners });
  };

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === stageRef.current) {
      setPosition({ x: e.target.x(), y: e.target.y() });
    }
  };

  // Klik op lege ruimte = deselecteer
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselecteer als je op de stage, layer, grid of outline klikt (alles behalve zones/structures)
    const clicked = e.target;
    const isStage = clicked === stageRef.current;
    const isInteractive = clicked.getParent()?.id();
    if (isStage || !isInteractive) {
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

      const x = (e.clientX - rect.left - pos.x) / scale;
      const y = (e.clientY - rect.top - pos.y) / scale;

      if (plantId) {
        onAddZone(plantId, x, y);
      } else if (structureType) {
        onAddStructure(structureType, x, y);
      }
    },
    [pos, scale, onAddZone, onAddStructure]
  );


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

  // Scrollbar posities berekenen
  const gardenPxW = garden.widthCm * scale;
  const gardenPxH = garden.heightCm * scale;
  // Hoeveel van de totale content is zichtbaar?
  const hThumbRatio = Math.min(1, stageSize.width / (gardenPxW + 100));
  const vThumbRatio = Math.min(1, stageSize.height / (gardenPxH + 100));
  // Positie van de thumb (0..1)
  const hThumbPos = Math.max(0, Math.min(1 - hThumbRatio, ((-pos.x + stageSize.width * 0.1) / (gardenPxW + 100))));
  const vThumbPos = Math.max(0, Math.min(1 - vThumbRatio, ((-pos.y + stageSize.height * 0.1) / (gardenPxH + 100))));
  const showScrollbars = zoom > 1.2;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-stone-50 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Scrollbar indicators */}
      {showScrollbars && (
        <>
          {/* Horizontale scrollbar */}
          <div
            className="absolute bottom-1 left-0 right-4 h-3 z-10 cursor-pointer"
            onMouseDown={(e) => {
              const track = e.currentTarget;
              const rect = track.getBoundingClientRect();
              const startMouseX = e.clientX;
              const startPos = pos.x;
              const trackW = rect.width;
              const totalW = gardenPxW + 100;

              const onMouseMove = (ev: MouseEvent) => {
                const dx = ev.clientX - startMouseX;
                const ratio = dx / trackW;
                setPosition((prev) => ({
                  x: startPos - ratio * totalW,
                  y: (prev || centeredPosition).y,
                }));
              };
              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };
              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            }}
          >
            <div
              className="absolute h-2 top-0.5 rounded-full bg-foreground/20 hover:bg-foreground/35 transition-colors"
              style={{
                left: `${hThumbPos * 100}%`,
                width: `${Math.max(hThumbRatio * 100, 8)}%`,
              }}
            />
          </div>
          {/* Verticale scrollbar */}
          <div
            className="absolute top-0 right-1 bottom-4 w-3 z-10 cursor-pointer"
            onMouseDown={(e) => {
              const track = e.currentTarget;
              const rect = track.getBoundingClientRect();
              const startMouseY = e.clientY;
              const startPos = pos.y;
              const trackH = rect.height;
              const totalH = gardenPxH + 100;

              const onMouseMove = (ev: MouseEvent) => {
                const dy = ev.clientY - startMouseY;
                const ratio = dy / trackH;
                setPosition((prev) => ({
                  x: (prev || centeredPosition).x,
                  y: startPos - ratio * totalH,
                }));
              };
              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };
              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            }}
          >
            <div
              className="absolute w-2 left-0.5 rounded-full bg-foreground/20 hover:bg-foreground/35 transition-colors"
              style={{
                top: `${vThumbPos * 100}%`,
                height: `${Math.max(vThumbRatio * 100, 8)}%`,
              }}
            />
          </div>
        </>
      )}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={pos.x}
        y={pos.y}
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
            onAddCorner={handleAddCorner}
            onRemoveCorner={handleRemoveCorner}
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
            onTransform={(e: Konva.KonvaEventObject<Event>) => {
              const node = e.target;
              const evt = e.evt as MouseEvent;
              if (evt.shiftKey) {
                const currentRot = node.rotation();
                const snapped = Math.round(currentRot / 45) * 45;
                if (snapped !== currentRot) {
                  // Roteer om het midden van de node zodat positie niet verschuift
                  const w = node.width() * node.scaleX();
                  const h = node.height() * node.scaleY();
                  const cx = w / 2;
                  const cy = h / 2;
                  const toRad = Math.PI / 180;
                  const oldRad = currentRot * toRad;
                  const newRad = snapped * toRad;
                  // Bereken waar het midden lag en waar het naartoe gaat
                  const cosOld = Math.cos(oldRad), sinOld = Math.sin(oldRad);
                  const cosNew = Math.cos(newRad), sinNew = Math.sin(newRad);
                  const oldCx = node.x() + cx * cosOld - cy * sinOld;
                  const oldCy = node.y() + cx * sinOld + cy * cosOld;
                  const newX = oldCx - (cx * cosNew - cy * sinNew);
                  const newY = oldCy - (cx * sinNew + cy * cosNew);
                  node.position({ x: newX, y: newY });
                  node.rotation(snapped);
                }
              }
            }}
            onTransformEnd={handleTransformEnd}
          />
        </Layer>
      </Stage>
    </div>
  );
}
