import { subDays } from 'date-fns';
import type { GraphPoint, OutageOverlay } from './BaseGraphView';

const outageColors: Record<number, string> = {
  0: 'hsl(var(--status-major-outage))',
  1: 'hsl(var(--status-partial-outage))',
  2: 'hsl(var(--status-degraded))',
};

export interface OutageWindow {
  startTime: number;
  spikeEnd: number;  // spikes stop here
  endTime: number;    // overlay extends past here for recovery
  status: number;
}

const spikeMultipliers: Record<number, number> = {
  0: 2.8,  // major outage — big spike
  1: 2.0,  // partial outage
  2: 1.5,  // degraded
};

/**
 * Given 90-day uptime array, compute overlays for the last 7 days
 * and inject spikes into hourly graph points during outage periods.
 */
export function applyOutageEffects(
  points: GraphPoint[],
  uptimeDays: number[],
  yMax: number
): { modifiedPoints: GraphPoint[]; overlays: OutageOverlay[] } {
  const lastPointTime = points[points.length - 1]?.time.getTime() ?? 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overlays: OutageOverlay[] = [];
  const windows: OutageWindow[] = [];

  for (let i = 83; i < 90; i++) {
    const status = uptimeDays[i];
    if (status >= 3) continue; // operational, skip
    const date = subDays(new Date(), 89 - i);
    date.setHours(0, 0, 0, 0);
    const dayStart = date.getTime();

    const offsetHours = (i * 3 + 2) % 12 + 4; // 4-15
    const durationHours = status === 0 ? 6 : status === 1 ? 4 : 3;
    const ovStart = dayStart + offsetHours * 3600000;
    const spikeEnd = dayStart + (offsetHours + durationHours) * 3600000;
    let ovEnd = dayStart + (offsetHours + durationHours + 2) * 3600000; // extend 2 hours past spike for recovery

    // If this is the most recent day (today) with an active outage, extend overlay to the last datapoint
    if (i === 89) {
      ovEnd = Math.max(ovEnd, lastPointTime);
    }

    windows.push({ startTime: ovStart, spikeEnd, endTime: ovEnd, status });
    overlays.push({
      startTime: ovStart,
      endTime: ovEnd,
      color: outageColors[status],
    });
  }

  // Modify points: add spikes only during the core outage window (not the recovery tail)
  const modifiedPoints = points.map((p) => {
    const t = p.time.getTime();
    for (const w of windows) {
      if (t >= w.startTime && t <= w.spikeEnd) {
        const multiplier = spikeMultipliers[w.status] || 1;
        const spiked = Math.min(yMax, p.value * multiplier);
        return { ...p, value: spiked };
      }
    }
    return p;
  });

  return { modifiedPoints, overlays };
}
