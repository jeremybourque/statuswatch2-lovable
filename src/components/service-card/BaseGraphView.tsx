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
  const vbW = oX + chartW + 14;
  const vbH = chartH + 10;
  const total = points.length;

  const getX = (i: number) => oX + (i / (total - 1)) * chartW;
  const getY = (v: number) => oY + chartH - ((v - minVal) / yMax) * chartH;

  const startTime = points[0].time.getTime();
  const endTime = points[total - 1].time.getTime();
  const timeSpan = endTime - startTime;
  const getXFromTime = (t: number) => oX + ((t - startTime) / timeSpan) * chartW;

  const dayLabels: { x: number; label: string }[] = [];
  const midnightTicks: number[] = [];

  // Walk through each day in range, place labels at 12:00 and ticks at 0:00
  const startDate = new Date(startTime);
  const startHour = startDate.getHours();
  const startDay = new Date(startTime);
  startDay.setHours(0, 0, 0, 0);

  // If first datapoint is between 13:00-21:00, noon of that day is already past
  // so we won't get a label for it — add one at the first datapoint instead
  const needsFirstDayLabel = startHour >= 13 && startHour <= 21;

  for (let d = new Date(startDay); d.getTime() <= endTime + 24 * 60 * 60 * 1000; d.setDate(d.getDate() + 1)) {
    const noon = new Date(d);
    noon.setHours(12, 0, 0, 0);
    const noonT = noon.getTime();
    if (noonT >= startTime && noonT <= endTime) {
      dayLabels.push({ x: getXFromTime(noonT), label: format(noon, 'EEE') });
    }
    const midnightT = d.getTime();
    if (midnightT > startTime && midnightT <= endTime) {
      midnightTicks.push(getXFromTime(midnightT));
    }
  }

  // Add label for the first day at the first datapoint position if needed
  if (needsFirstDayLabel) {
    dayLabels.unshift({ x: getXFromTime(startTime), label: format(startDate, 'EEE') });
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
      {midnightTicks.map((x, i) => (
        <line key={`mt-${i}`} x1={x} x2={x} y1={oY + chartH} y2={oY + chartH + 3} className="stroke-muted-foreground" strokeWidth="0.5" opacity="0.5" />
      ))}
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
