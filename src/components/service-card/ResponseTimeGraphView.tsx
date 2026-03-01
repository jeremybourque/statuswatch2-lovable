import { useEffect } from 'react';
import { format } from 'date-fns';
import { BaseGraphView, type GraphPoint } from './BaseGraphView';

interface ResponseTimeGraphViewProps {
  serviceId: string;
  onHover: (label: string | null) => void;
  onAvgChange?: (avg: number) => void;
}

function generatePoints(serviceId: string): GraphPoint[] {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const now = new Date();
  const points: GraphPoint[] = [];
  for (let i = 0; i < 168; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const r1 = (hash & 0xffff) / 0xffff;
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const r2 = (hash & 0xffff) / 0xffff;
    const gaussian = (r1 + r2) / 2;
    const ms = 350 + (gaussian - 0.5) * 300 + Math.sin(i * 0.3) * 30;
    const clamped = Math.max(50, Math.min(800, ms));
    const time = new Date(now.getTime() - (167 - i) * 60 * 60 * 1000);
    points.push({ time, value: clamped });
  }
  return points;
}

export function ResponseTimeGraphView({ serviceId, onHover, onAvgChange }: ResponseTimeGraphViewProps) {
  const points = generatePoints(serviceId);
  const avgLast10 = points.slice(-10).reduce((s, p) => s + p.value, 0) / 10;
  useEffect(() => { onAvgChange?.(avgLast10); }, [avgLast10, onAvgChange]);

  return (
    <BaseGraphView
      points={points}
      yTicks={[0, 400, 800]}
      yMax={800}
      formatLabel={(p) => `${format(p.time, 'EEE H:mm')} ● ${Math.round(p.value)}ms`}
      onHover={onHover}
    />
  );
}
