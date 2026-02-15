"use client";

import { Rect, Text, Group, Circle } from "react-konva";
import { CropZone, ZoneStatus } from "@/lib/garden/types";
import { PlantData } from "@/lib/plants/types";
import { snapToGrid, calculatePlantPositions, isFruitTree } from "@/lib/garden/helpers";
import { useMemo } from "react";

const STATUS_COLORS: Record<ZoneStatus, string> = {
  "planned": "#9ca3af",
  "sown-indoor": "#9333ea",
  "sown-outdoor": "#22c55e",
  "transplanted": "#06b6d4",
  "growing": "#16a34a",
  "harvesting": "#f97316",
  "done": "#6b7280",
};

const STATUS_LABELS: Record<ZoneStatus, string> = {
  "planned": "",
  "sown-indoor": "Gezaaid",
  "sown-outdoor": "Gezaaid",
  "transplanted": "Geplant",
  "growing": "Groeit",
  "harvesting": "Oogst",
  "done": "Klaar",
};

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
  const isTree = isFruitTree(zone.plantId);

  const positions = useMemo(
    () => calculatePlantPositions(zone, plantData),
    [zone, plantData]
  );

  const dotRadius = Math.max(2, Math.min(4, plantData.spacingCm * scale * 0.15));

  // Bij kleine bedden: labels buiten (eraan hangen) als de box < 50px hoog of breed
  const tooSmall = w < 50 || h < 40;
  const labelFontSize = Math.max(10, Math.min(13, w * 0.1));
  const bottomText = isTree
    ? `${zone.widthCm}cm`
    : `${zone.widthCm}x${zone.heightCm}cm (${positions.length}x)`;

  return (
    <Group
      id={zone.id}
      x={zone.x * scale}
      y={zone.y * scale}
      rotation={zone.rotation}
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
    {/* Invisible rect met id zodat Transformer alleen dit vak pakt */}
    <Rect
      id={zone.id}
      width={w}
      height={h}
      fill="transparent"
      listening={false}
    />
      {isTree ? (
        <>
          {/* Fruitboom: ronde zone net als Boom-structuur */}
          <Circle
            x={w / 2}
            y={h / 2}
            radius={Math.min(w, h) / 2}
            fill={plantData.color + "25"}
            stroke={isSelected ? "#1d4ed8" : plantData.color}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          <Text
            text={plantData.icon}
            x={w / 2 - 8}
            y={h / 2 - 8}
            fontSize={16}
            listening={false}
          />
          <Text
            text={plantData.name}
            x={0}
            y={h + 3}
            fontSize={11}
            fill="#1f2937"
            width={w}
            align="center"
            listening={false}
          />
          <Text
            text={bottomText}
            x={0}
            y={h + 16}
            fontSize={9}
            fill="#6b7280"
            width={w}
            align="center"
            listening={false}
          />
        </>
      ) : (
        <>
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

          {tooSmall ? (
            <>
              {/* Klein bed: labels hangen eraan (onder het bed) */}
              <Text
                text={`${plantData.icon} ${plantData.name}`}
                x={0}
                y={h + 3}
                fontSize={11}
                fill="#1f2937"
                listening={false}
              />
              <Text
                text={bottomText}
                x={0}
                y={h + 16}
                fontSize={9}
                fill="#6b7280"
                listening={false}
              />
            </>
          ) : (
            <>
              {/* Normaal bed: labels binnenin */}
              <Text
                text={`${plantData.icon} ${plantData.name}`}
                x={4}
                y={3}
                fontSize={labelFontSize}
                fill="#1f2937"
                width={w - 8}
                listening={false}
              />
              <Text
                text={bottomText}
                x={4}
                y={h - 16}
                fontSize={10}
                fill="#6b7280"
                listening={false}
              />
            </>
          )}
        </>
      )}

      {/* Status indicator */}
      {zone.status && zone.status !== "planned" && STATUS_LABELS[zone.status] && (
        <>
          <Circle
            x={isTree ? w / 2 - Math.min(w, h) / 2 + 6 : 6}
            y={isTree ? h / 2 - Math.min(w, h) / 2 + 6 : (tooSmall ? -6 : h - 6)}
            radius={4}
            fill={STATUS_COLORS[zone.status]}
            listening={false}
          />
          {!tooSmall && !isTree && w > 80 && (
            <Text
              text={STATUS_LABELS[zone.status]}
              x={14}
              y={h - 10}
              fontSize={8}
              fill={STATUS_COLORS[zone.status]}
              listening={false}
            />
          )}
        </>
      )}

      {locked && (
        <Text
          text="🔒"
          x={isTree ? w / 2 + Math.min(w, h) / 2 - 10 : (tooSmall ? w + 2 : w - 18)}
          y={isTree ? h / 2 - Math.min(w, h) / 2 : (tooSmall ? 0 : 4)}
          fontSize={12}
          listening={false}
        />
      )}
    </Group>
  );
}
