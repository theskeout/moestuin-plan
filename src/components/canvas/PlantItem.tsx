"use client";

import { Circle, Text, Group } from "react-konva";
import { PlacedPlant } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { snapToGrid } from "@/lib/garden/helpers";

interface PlantItemProps {
  plant: PlacedPlant;
  plantData: PlantData;
  scale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

export default function PlantItem({
  plant,
  plantData,
  scale,
  isSelected,
  onSelect,
  onDragEnd,
}: PlantItemProps) {
  const radius = (plantData.spacingCm / 2) * scale;
  const minRadius = 8;
  const displayRadius = Math.max(radius, minRadius);

  return (
    <Group
      x={plant.x * scale}
      y={plant.y * scale}
      draggable
      onClick={() => onSelect(plant.id)}
      onTap={() => onSelect(plant.id)}
      onDragEnd={(e) => {
        const newX = snapToGrid(e.target.x() / scale);
        const newY = snapToGrid(e.target.y() / scale);
        e.target.x(newX * scale);
        e.target.y(newY * scale);
        onDragEnd(plant.id, newX, newY);
      }}
    >
      <Circle
        radius={displayRadius}
        fill={plantData.color}
        opacity={0.7}
        stroke={isSelected ? "#1d4ed8" : "#fff"}
        strokeWidth={isSelected ? 3 : 1}
      />
      <Text
        text={plantData.icon}
        fontSize={Math.max(displayRadius * 0.9, 12)}
        offsetX={Math.max(displayRadius * 0.45, 6)}
        offsetY={Math.max(displayRadius * 0.45, 6)}
      />
    </Group>
  );
}
