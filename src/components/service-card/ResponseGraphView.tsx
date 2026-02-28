import { format } from 'date-fns';

interface ResponseGraphViewProps {
  serviceId: string;
  onHover: (label: string | null) => void;
}

export function ResponseGraphView({ serviceId, onHover }: ResponseGraphViewProps) {
  const points: { time: Date; value: number }[] = [];
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const now = new Date();
  for (let i = 0; i < 168; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const ms = 200 + (hash % 800) + Math.sin(i * 0.5) * 100;
    const time = new Date(now.getTime() - (167 - i) * 60 * 60 * 1000);
    points.push({ time, value: ms / 1000 });
  }

  const minVal = 0;
  const padded = 2;
  const chartH = 32;
  const chartW = 540;
  const oX = 4;
  const oY = 2;
  const vbW = oX + chartW + 50;
  const vbH = chartH + 10;
  const yTicks = [0, 1, 2];

  const dayLabels: { x: number; label: string }[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const frac = 1 - d / 6;
    dayLabels.push({ x: oX + frac * chartW, label: format(day, 'EEE').charAt(0) });
  }

  const total = points.length;
  const svgPoints = points.map((p, i) => {
    const x = oX + (i / (total - 1)) * chartW;
    const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M${oX},${oY + chartH} ` + points.map((p, i) => {
    const x = oX + (i / (total - 1)) * chartW;
    const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
    return `L${x},${y}`;
  }).join(' ') + ` L${oX + chartW},${oY + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full flex-1" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {yTicks.map((t, i) => {
        const y = oY + chartH - ((t - minVal) / padded) * chartH;
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
        const y = oY + chartH - ((t - minVal) / padded) * chartH;
        return <line key={i} x1={oX} x2={oX + chartW} y1={y} y2={y} className="stroke-border" strokeWidth="0.3" />;
      })}
      <path d={areaPath} fill="hsl(var(--primary))" opacity="0.1" />
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1" points={svgPoints} />
      {points.map((p, i) => {
        const x = oX + (i / (total - 1)) * chartW;
        const y = oY + chartH - ((p.value - minVal) / padded) * chartH;
        const label = `${format(p.time, 'EEE HH:mm')} ${(p.value * 1000).toFixed(0)}ms`;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.5"
            className="fill-transparent hover:fill-primary cursor-pointer"
            onMouseEnter={() => onHover(label)}
          />
        );
      })}
    </svg>
  );
}
