"use client";

import { Rect, Text, Group, Circle } from "react-konva";
import { CropZone } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { snapToGrid, calculatePlantPositions } from "@/lib/garden/helpers";
import { useMemo } from "react";

interface CropZoneItemProps {
  zone: CropZone;
  plantData: PlantData;
  scale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export default function CropZoneItem({
  zone,
  plantData,
  scale,
  isSelected,
  onSelect,
  onDragEnd,
}: CropZoneItemProps) {
  const w = zone.widthCm * scale;
  const h = zone.heightCm * scale;
  const locked = zone.locked;

  const positions = useMemo(
    () => calculatePlantPositions(zone, plantData),
    [zone, plantData]
  );

  const dotRadius = Math.max(2, Math.min(4, plantData.spacingCm * scale * 0.15));

  return (
    <Group
      id={zone.id}
      x={zone.x * scale}
      y={zone.y * scale}
      rotation={zone.rotation}
      width={w}
      height={h}
      draggable={!locked}
      onClick={() => onSelect(zone.id)}
      onTap={() => onSelect(zone.id)}
      onDragEnd={(e) => {
        const newX = snapToGrid(e.target.x() / scale);
        const newY = snapToGrid(e.target.y() / scale);
        e.target.x(newX * scale);
        e.target.y(newY * scale);
        onDragEnd(zone.id, newX, newY);
      }}
    >
      {/* Achtergrond */}
      <Rect
        width={w}
        height={h}
        fill={plantData.color + "25"}
        stroke={isSelected ? "#1d4ed8" : plantData.color}
        strokeWidth={isSelected ? 2 : 1.5}
        cornerRadius={3}
      />

      {/* Stippengrid — individuele plantposities */}
      {positions.map((pos, i) => (
        <Circle
          key={i}
          x={pos.x * scale}
          y={pos.y * scale}
          radius={dotRadius}
          fill={plantData.color}
          opacity={0.5}
          listening={false}
        />
      ))}

      {/* Label: emoji + naam + aantal */}
      <Text
        text={`${plantData.icon} ${plantData.name}`}
        x={4}
        y={3}
        fontSize={Math.max(11, Math.min(13, w * 0.1))}
        fill="#1f2937"
        width={w - 8}
        listening={false}
      />
      <Text
        text={`${positions.length} planten`}
        x={4}
        y={h - 16}
        fontSize={10}
        fill="#6b7280"
        listening={false}
      />
      {locked && (
        <Text
          text="🔒"
          x={w - 18}
          y={4}
          fontSize={12}
          listening={false}
        />
      )}
    </Group>
  );
}
