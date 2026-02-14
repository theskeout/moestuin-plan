"use client";

import { Line, Circle } from "react-konva";
import { Point } from "@/lib/garden/types";

interface PlotOutlineProps {
  corners: Point[];
  scale: number;
  editable: boolean;
  onCornerDrag?: (index: number, newPos: Point) => void;
  onAddCorner?: (afterIndex: number, pos: Point) => void;
  onRemoveCorner?: (index: number) => void;
}

export default function PlotOutline({
  corners,
  scale,
  editable,
  onCornerDrag,
  onAddCorner,
  onRemoveCorner,
}: PlotOutlineProps) {
  const flatPoints = corners.flatMap((c) => [c.x * scale, c.y * scale]);
  // Sluit het polygoon
  if (corners.length > 0) {
    flatPoints.push(corners[0].x * scale, corners[0].y * scale);
  }

  // Middenpunten van elk segment (voor punt toevoegen)
  const midpoints = editable
    ? corners.map((c, i) => {
        const next = corners[(i + 1) % corners.length];
        return { x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 };
      })
    : [];

  return (
    <>
      <Line
        points={flatPoints}
        stroke="#16a34a"
        strokeWidth={2}
        fill="rgba(22, 163, 74, 0.08)"
        closed
      />
      {editable &&
        corners.map((corner, i) => (
          <Circle
            key={`corner-${i}`}
            x={corner.x * scale}
            y={corner.y * scale}
            radius={6}
            fill="#16a34a"
            stroke="#fff"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              if (onCornerDrag) {
                onCornerDrag(i, {
                  x: e.target.x() / scale,
                  y: e.target.y() / scale,
                });
              }
            }}
            onDblClick={() => {
              if (onRemoveCorner && corners.length > 3) {
                onRemoveCorner(i);
              }
            }}
            onDblTap={() => {
              if (onRemoveCorner && corners.length > 3) {
                onRemoveCorner(i);
              }
            }}
            style={{ cursor: "move" }}
          />
        ))}
      {editable &&
        midpoints.map((mid, i) => (
          <Circle
            key={`midpoint-${i}`}
            x={mid.x * scale}
            y={mid.y * scale}
            radius={4}
            fill="transparent"
            stroke="#16a34a"
            strokeWidth={1.5}
            dash={[2, 2]}
            opacity={0.5}
            hitStrokeWidth={12}
            onClick={() => {
              if (onAddCorner) {
                onAddCorner(i, mid);
              }
            }}
            onTap={() => {
              if (onAddCorner) {
                onAddCorner(i, mid);
              }
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "pointer";
              const circle = e.target as unknown as { opacity: (v: number) => void; fill: (v: string) => void; radius: (v: number) => void };
              circle.opacity(1);
              circle.fill("#16a34a40");
              circle.radius(5);
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "default";
              const circle = e.target as unknown as { opacity: (v: number) => void; fill: (v: string) => void; radius: (v: number) => void };
              circle.opacity(0.5);
              circle.fill("transparent");
              circle.radius(4);
            }}
          />
        ))}
    </>
  );
}
