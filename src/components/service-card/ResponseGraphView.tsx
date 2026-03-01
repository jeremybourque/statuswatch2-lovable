import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ResponseGraphViewProps {
  serviceId: string;
  onHover: (label: string | null) => void;
  onAvgChange?: (avg: number) => void;
}

export function ResponseGraphView({ serviceId, onHover, onAvgChange }: ResponseGraphViewProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points: { time: Date; value: number }[] = [];
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  for (let i = 0; i < 168; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const base = 300 + (hash % 3200) + Math.sin(i * 0.5) * 150;
    const ms = Math.max(300, Math.min(3500, base));
    const time = new Date(currentHour.getTime() - (167 - i) * 60 * 60 * 1000);
    points.push({ time, value: ms / 1000 });
  }

  const avgLast10 = points.slice(-10).reduce((s, p) => s + p.value, 0) / 10;
  useEffect(() => { onAvgChange?.(avgLast10); }, [avgLast10, onAvgChange]);

  const minVal = 0;
  const padded = 4;
  const chartH = 32;
  const chartW = 540;
  const oX = 4;
  const oY = 2;
  const vbW = oX + chartW + 10;
  const vbH = chartH + 10;
  const yTicks = [0, 2, 4];
  const total = points.length;

  const getX = (i: number) => oX + (i / (total - 1)) * chartW;
  const getY = (v: number) => oY + chartH - ((v - minVal) / padded) * chartH;

  const dayLabels: { x: number; label: string }[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const frac = 1 - d / 6;
    dayLabels.push({ x: oX + frac * chartW, label: format(day, 'EEE') });
  }

  const svgPoints = points.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ');

  const areaPath = `M${oX},${oY + chartH} ` + points.map((p, i) => `L${getX(i)},${getY(p.value)}`).join(' ') + ` L${oX + chartW},${oY + chartH} Z`;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full flex-1"
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
      onMouseLeave={() => { setHoveredIdx(null); onHover(null); }}
    >
      {yTicks.map((t, i) => {
        const y = getY(t);
        return (
          <text key={i} x={oX + chartW + 3} y={y + 2} textAnchor="start" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
            {t}
          </text>
        );
      })}
      {dayLabels.map((d, i) => (
        <text key={i} x={d.x} y={oY + chartH + 9} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '7px' }}>
          {d.label}
        </text>
      ))}
      {yTicks.map((t, i) => {
        const y = getY(t);
        return <line key={i} x1={oX} x2={oX + chartW} y1={y} y2={y} className="stroke-border" strokeWidth="0.3" />;
      })}
      {/* X-axis bottom line */}
      <line x1={oX} x2={oX + chartW} y1={oY + chartH} y2={oY + chartH} className="stroke-muted-foreground" strokeWidth="0.5" opacity="0.5" />
      <path d={areaPath} fill="hsl(var(--primary))" opacity="0.1" />
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1" points={svgPoints} />

      {/* Vertical cursor line */}
      {hoveredIdx !== null && (
        <line
          x1={getX(hoveredIdx)}
          x2={getX(hoveredIdx)}
          y1={oY}
          y2={oY + chartH}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          pointerEvents="none"
        />
      )}

      {/* Hovered point indicator */}
      {hoveredIdx !== null && (
        <circle
          cx={getX(hoveredIdx)}
          cy={getY(points[hoveredIdx].value)}
          r="3"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth="1"
          pointerEvents="none"
        />
      )}

      {/* Invisible hit targets */}
      {points.map((p, i) => {
        const x = getX(i);
        const label = `${format(p.time, 'EEE H:mm')} ● ${(p.value * 1000).toFixed(0)}ms`;
        return (
          <circle
            key={i}
            cx={x}
            cy={getY(p.value)}
            r="3"
            className="fill-transparent cursor-pointer"
            onMouseEnter={() => { setHoveredIdx(i); onHover(label); }}
          />
        );
      })}
    </svg>
  );
}
