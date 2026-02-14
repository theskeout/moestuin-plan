"use client";

import { Line, Text } from "react-konva";

interface GridLayerProps {
  widthCm: number;
  heightCm: number;
  scale: number; // pixels per cm
  visible: boolean;
}

export default function GridLayer({ widthCm, heightCm, scale, visible }: GridLayerProps) {
  if (!visible) return null;

  const gridSize = 10; // 10cm
  const lines = [];

  // Verticale lijnen
  for (let x = 0; x <= widthCm; x += gridSize) {
    const isMajor = x % 100 === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x * scale, 0, x * scale, heightCm * scale]}
        stroke={isMajor ? "#94a3b8" : "#e2e8f0"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
    if (isMajor && x > 0) {
      lines.push(
        <Text
          key={`vt-${x}`}
          x={x * scale + 2}
          y={2}
          text={`${x / 100}m`}
          fontSize={10}
          fill="#64748b"
        />
      );
    }
  }

  // Horizontale lijnen
  for (let y = 0; y <= heightCm; y += gridSize) {
    const isMajor = y % 100 === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y * scale, widthCm * scale, y * scale]}
        stroke={isMajor ? "#94a3b8" : "#e2e8f0"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
    if (isMajor && y > 0) {
      lines.push(
        <Text
          key={`ht-${y}`}
          x={2}
          y={y * scale + 2}
          text={`${y / 100}m`}
          fontSize={10}
          fill="#64748b"
        />
      );
    }
  }

  return <>{lines}</>;
}
