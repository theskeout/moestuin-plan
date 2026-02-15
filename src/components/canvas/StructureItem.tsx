"use client";

import { Rect, Text, Group, Circle } from "react-konva";
import { Structure } from "@/lib/garden/types";
import { snapToGrid } from "@/lib/garden/helpers";

interface StructureItemProps {
  structure: Structure;
  scale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const STRUCTURE_STYLES: Record<
  string,
  { fill: string; stroke: string; label: string; icon: string; dash?: number[] }
> = {
  kas: { fill: "rgba(147, 197, 253, 0.3)", stroke: "#3b82f6", label: "Kas", icon: "🏠", dash: [8, 4] },
  grondbak: { fill: "rgba(217, 180, 139, 0.3)", stroke: "#92400e", label: "Grondbak", icon: "📦" },
  pad: { fill: "rgba(156, 163, 175, 0.4)", stroke: "#6b7280", label: "Pad", icon: "🚶" },
  schuur: { fill: "rgba(107, 114, 128, 0.4)", stroke: "#374151", label: "Schuur", icon: "🏚️" },
  hek: { fill: "rgba(139, 90, 43, 0.35)", stroke: "#78350f", label: "Hek", icon: "🪵", dash: [4, 3] },
  boom: { fill: "rgba(76, 175, 80, 0.3)", stroke: "#2e7d32", label: "Boom", icon: "🌳" },
  compostbak: { fill: "rgba(120, 85, 40, 0.3)", stroke: "#5d4037", label: "Compostbak", icon: "♻️" },
  gras: { fill: "rgba(76, 175, 80, 0.2)", stroke: "#66bb6a", label: "Gras", icon: "🌱" },
};

const CUSTOM_DEFAULT_STYLE = { fill: "rgba(180, 180, 180, 0.3)", stroke: "#6b7280", label: "Structuur", icon: "📌" };

export default function StructureItem({
  structure,
  scale,
  isSelected,
  onSelect,
  onDragEnd,
}: StructureItemProps) {
  const baseStyle = STRUCTURE_STYLES[structure.type] || CUSTOM_DEFAULT_STYLE;
  const style = structure.type === "custom"
    ? { ...baseStyle, label: structure.customLabel || "Structuur", icon: structure.customIcon || "📌" }
    : baseStyle;
  const w = structure.widthCm * scale;
  const h = structure.heightCm * scale;
  const locked = structure.locked;
  const isBoom = structure.type === "boom";

  return (
    <Group
      id={`g-${structure.id}`}
      x={structure.x * scale}
      y={structure.y * scale}
      rotation={structure.rotation}
      draggable={!locked}
      onClick={() => onSelect(structure.id)}
      onTap={() => onSelect(structure.id)}
      onDragEnd={(e) => {
        if (locked) return;
        const newX = snapToGrid(e.target.x() / scale);
        const newY = snapToGrid(e.target.y() / scale);
        e.target.x(newX * scale);
        e.target.y(newY * scale);
        onDragEnd(structure.id, newX, newY);
      }}
    >
      {/* Invisible rect als Transformer-target */}
      <Rect
        id={structure.id}
        width={w}
        height={h}
        fill="transparent"
        listening={false}
      />
      {isBoom ? (
        <>
          <Circle
            x={w / 2}
            y={h / 2}
            radius={Math.min(w, h) / 2}
            fill={style.fill}
            stroke={isSelected ? "#1d4ed8" : style.stroke}
            strokeWidth={2}
          />
          <Text
            text={style.icon}
            x={w / 2 - 8}
            y={h / 2 - 8}
            fontSize={16}
            listening={false}
          />
          <Text
            text={style.label}
            x={0}
            y={h + 3}
            fontSize={11}
            fill="#374151"
            width={w}
            align="center"
            listening={false}
          />
        </>
      ) : (
        <>
          <Rect
            width={w}
            height={h}
            fill={style.fill}
            stroke={isSelected ? "#1d4ed8" : style.stroke}
            strokeWidth={2}
            dash={style.dash}
            cornerRadius={4}
          />
          <Text
            text={`${style.icon} ${style.label}`}
            x={4}
            y={4}
            fontSize={Math.max(12, Math.min(14, w * 0.12))}
            fill="#374151"
            width={w - 8}
            listening={false}
          />
          {structure.type !== "hek" && (
            <Text
              text={`${structure.widthCm}x${structure.heightCm}cm`}
              x={4}
              y={h - 18}
              fontSize={10}
              fill="#6b7280"
              listening={false}
            />
          )}
        </>
      )}
      {locked && (
        <Text
          text="🔒"
          x={isBoom ? w / 2 + Math.min(w, h) / 2 - 10 : w - 18}
          y={isBoom ? h / 2 - Math.min(w, h) / 2 : 4}
          fontSize={12}
          listening={false}
        />
      )}
    </Group>
  );
}
