"use client";

import { Rect, Text, Group, Line } from "react-konva";
import { Structure } from "@/lib/garden/types";
import { snapToGrid } from "@/lib/garden/helpers";

interface StructureItemProps {
  structure: Structure;
  scale: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

const STRUCTURE_STYLES: Record<
  Structure["type"],
  { fill: string; stroke: string; label: string; icon: string; dash?: number[] }
> = {
  kas: { fill: "rgba(147, 197, 253, 0.3)", stroke: "#3b82f6", label: "Kas", icon: "🏠", dash: [8, 4] },
  grondbak: { fill: "rgba(217, 180, 139, 0.3)", stroke: "#92400e", label: "Grondbak", icon: "📦" },
  pad: { fill: "rgba(156, 163, 175, 0.4)", stroke: "#6b7280", label: "Pad", icon: "🚶" },
  schuur: { fill: "rgba(107, 114, 128, 0.4)", stroke: "#374151", label: "Schuur", icon: "🏚️" },
};

export default function StructureItem({
  structure,
  scale,
  isSelected,
  onSelect,
  onDragEnd,
  onDelete,
}: StructureItemProps) {
  const style = STRUCTURE_STYLES[structure.type];
  const w = structure.widthCm * scale;
  const h = structure.heightCm * scale;

  return (
    <Group
      id={structure.id}
      x={structure.x * scale}
      y={structure.y * scale}
      width={w}
      height={h}
      draggable
      onClick={() => onSelect(structure.id)}
      onTap={() => onSelect(structure.id)}
      onDragEnd={(e) => {
        const newX = snapToGrid(e.target.x() / scale);
        const newY = snapToGrid(e.target.y() / scale);
        e.target.x(newX * scale);
        e.target.y(newY * scale);
        onDragEnd(structure.id, newX, newY);
      }}
    >
      <Rect
        width={w}
        height={h}
        fill={style.fill}
        stroke={isSelected ? "#1d4ed8" : style.stroke}
        strokeWidth={isSelected ? 3 : 2}
        dash={style.dash}
        cornerRadius={4}
      />
      {/* Label */}
      <Text
        text={`${style.icon} ${style.label}`}
        x={4}
        y={4}
        fontSize={Math.max(12, Math.min(14, w * 0.12))}
        fill="#374151"
        width={w - 8}
      />
      {/* Afmetingen */}
      <Text
        text={`${structure.widthCm}x${structure.heightCm}cm`}
        x={4}
        y={h - 18}
        fontSize={10}
        fill="#6b7280"
      />
      {/* Delete kruisje */}
      {isSelected && (
        <Group
          x={w - 10}
          y={-10}
          onClick={(e) => {
            e.cancelBubble = true;
            onDelete(structure.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onDelete(structure.id);
          }}
        >
          <Rect
            x={-10}
            y={-10}
            width={20}
            height={20}
            fill="#ef4444"
            cornerRadius={10}
          />
          <Line points={[-5, -5, 5, 5]} stroke="#fff" strokeWidth={2} />
          <Line points={[5, -5, -5, 5]} stroke="#fff" strokeWidth={2} />
        </Group>
      )}
    </Group>
  );
}
