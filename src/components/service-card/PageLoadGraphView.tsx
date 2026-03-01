import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { BaseGraphView, type GraphPoint } from './BaseGraphView';
import { applyOutageEffects } from './outage-helpers';

interface PageLoadGraphViewProps {
  serviceId: string;
  uptimeDays: number[];
  onHover: (label: string | null) => void;
  onAvgChange?: (avg: number) => void;
}

function generatePoints(serviceId: string): GraphPoint[] {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const points: GraphPoint[] = [];
  for (let i = 0; i < 168; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const r1 = (hash & 0xffff) / 0xffff;
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const r2 = (hash & 0xffff) / 0xffff;
    const gaussian = (r1 + r2) / 2;
    const ms = 1500 + (gaussian - 0.5) * 1200 + Math.sin(i * 0.5) * 100;
    const clamped = Math.max(300, Math.min(3500, ms));
    const time = new Date(currentHour.getTime() - (167 - i) * 60 * 60 * 1000);
    points.push({ time, value: clamped / 1000 });
  }
  return points;
}

export function PageLoadGraphView({ serviceId, uptimeDays, onHover, onAvgChange }: PageLoadGraphViewProps) {
  const rawPoints = useMemo(() => generatePoints(serviceId), [serviceId]);
  const yMax = 4;
  const { modifiedPoints, overlays } = useMemo(
    () => applyOutageEffects(rawPoints, uptimeDays, yMax),
    [rawPoints, uptimeDays]
  );
  const avgLast10 = modifiedPoints.slice(-10).reduce((s, p) => s + p.value, 0) / 10;
  useEffect(() => { onAvgChange?.(avgLast10); }, [avgLast10, onAvgChange]);

  return (
    <BaseGraphView
      points={modifiedPoints}
      yTicks={[0, 2, 4]}
      yMax={yMax}
      formatLabel={(p) => `${format(p.time, 'EEE H:mm')} ● ${p.value.toFixed(2)}s`}
      onHover={onHover}
      overlays={overlays}
    />
  );
}
