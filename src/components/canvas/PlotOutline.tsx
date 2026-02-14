"use client";

import { Line, Circle } from "react-konva";
import { Point } from "@/lib/garden/types";

interface PlotOutlineProps {
  corners: Point[];
  scale: number;
  editable: boolean;
  onCornerDrag?: (index: number, newPos: Point) => void;
}

export default function PlotOutline({
  corners,
  scale,
  editable,
  onCornerDrag,
}: PlotOutlineProps) {
  const flatPoints = corners.flatMap((c) => [c.x * scale, c.y * scale]);
  // Sluit het polygoon
  if (corners.length > 0) {
    flatPoints.push(corners[0].x * scale, corners[0].y * scale);
  }

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
            style={{ cursor: "move" }}
          />
        ))}
    </>
  );
}
