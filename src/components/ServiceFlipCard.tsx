import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { format, subDays } from 'date-fns';
import { RotateCcw } from 'lucide-react';

interface ServiceFlipCardProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className="relative flex h-3 w-3">
      {status !== 'operational' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dotClass} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${cfg.dotClass}`} />
    </span>
  );
}

function generateMockUptime(serviceId: string): number[] {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = ((hash << 5) - hash + serviceId.charCodeAt(i)) | 0;
  }
  const days: number[] = [];
  for (let i = 0; i < 90; i++) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
    const rand = (hash % 1000) / 1000;
    if (rand > 0.92) days.push(rand > 0.97 ? 0 : rand > 0.95 ? 1 : 2);
    else days.push(3);
  }
  return days;
}

const dayColors = [
  'bg-status-major-outage',
  'bg-status-partial-outage',
  'bg-status-degraded',
  'bg-status-operational',
];

export function ServiceFlipCard({ service }: ServiceFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter(d => d >= 2).length;
    return ((good / uptimeDays.length) * 100).toFixed(2);
  }, [uptimeDays]);

  return (
    <div
      className="relative h-[88px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-card hover:bg-accent/50 transition-colors overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="p-4 flex items-center justify-between h-full">
            <div className="flex items-center gap-3 min-w-0">
              <StatusDot status={service.status as ServiceStatus} />
              <span className="font-medium text-card-foreground truncate">{service.name}</span>
            </div>
            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-card hover:bg-accent/50 transition-colors overflow-hidden p-4"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-card-foreground truncate">{service.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium font-mono text-muted-foreground">{uptimePercent}%</span>
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div className="flex gap-[2px] items-end w-full">
            {uptimeDays.map((day, i) => {
              const date = subDays(new Date(), 89 - i);
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-0 h-7 rounded-sm ${dayColors[day]} hover:opacity-80 transition-opacity`}
                  title={`${format(date, 'MMM d, yyyy')}: ${['Major Outage', 'Partial Outage', 'Degraded', 'Operational'][day]}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
