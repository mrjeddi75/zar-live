"use client";

import { useId } from "react";

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  trend: "up" | "down" | "flat";
  className?: string;
}

export function Sparkline({
  points,
  width = 120,
  height = 36,
  trend,
  className,
}: SparklineProps) {
  const gid = useId().replace(/[:]/g, "");
  if (points.length < 2) {
    return <div style={{ width, height }} className={className} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;

  const stepX = (width - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(2)},${height} L${xy[0][0].toFixed(2)},${height} Z`;

  const color = trend === "up" ? "#2fca8c" : trend === "down" ? "#ff5f6e" : "#8b93a7";
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#area-${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="2.6" fill={color} className="breathe" />
    </svg>
  );
}
