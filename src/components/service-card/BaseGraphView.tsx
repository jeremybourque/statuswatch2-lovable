import { useState } from 'react';
import { format } from 'date-fns';

export interface GraphPoint {
  time: Date;
  value: number;
}

export interface BaseGraphViewProps {
  points: GraphPoint[];
  yTicks: number[];
  yMax: number;
  formatLabel: (point: GraphPoint) => string;
  formatYTick?: (tick: number) => string;
  onHover: (label: string | null) => void;
}

export function BaseGraphView({ points, yTicks, yMax, formatLabel, formatYTick, onHover }: BaseGraphViewProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const minVal = 0;
  const chartH = 32;
  const chartW = 540;
  const oX = 4;
  const oY = 2;
  const vbW = oX + chartW + 10;
  const vbH = chartH + 10;
  const total = points.length;

  const getX = (i: number) => oX + (i / (total - 1)) * chartW;
  const getY = (v: number) => oY + chartH - ((v - minVal) / yMax) * chartH;

  const now = new Date();
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
            {formatYTick ? formatYTick(t) : t}
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
      <line x1={oX} x2={oX + chartW} y1={oY + chartH} y2={oY + chartH} className="stroke-muted-foreground" strokeWidth="0.5" opacity="0.5" />
      <path d={areaPath} fill="hsl(var(--primary))" opacity="0.1" />
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1" points={svgPoints} />

      {hoveredIdx !== null && (
        <line
          x1={getX(hoveredIdx)} x2={getX(hoveredIdx)}
          y1={oY} y2={oY + chartH}
          stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2,2" pointerEvents="none"
        />
      )}
      {hoveredIdx !== null && (
        <circle
          cx={getX(hoveredIdx)} cy={getY(points[hoveredIdx].value)}
          r="3" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="1" pointerEvents="none"
        />
      )}
      {points.map((p, i) => (
        <circle
          key={i} cx={getX(i)} cy={getY(p.value)} r="3"
          className="fill-transparent cursor-pointer"
          onMouseEnter={() => { setHoveredIdx(i); onHover(formatLabel(p)); }}
        />
      ))}
    </svg>
  );
}
