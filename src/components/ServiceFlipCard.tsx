import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { ChevronDown } from 'lucide-react';

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
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter(d => d >= 2).length;
    return ((good / uptimeDays.length) * 100).toFixed(2);
  }, [uptimeDays]);

  return (
    <div className="bg-card hover:bg-accent/50 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={service.status as ServiceStatus} />
          <span className="font-medium text-card-foreground truncate">{service.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 ml-6">
            <div className="flex-1 min-w-0">
              <div className="flex gap-[2px] items-end w-full min-w-0">
                {uptimeDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex-1 min-w-0 h-6 rounded-sm transition-colors ${dayColors[day]} hover:opacity-80`}
                    title={`Day ${90 - i}: ${['Major Outage', 'Partial Outage', 'Degraded', 'Operational'][day]}`}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground shrink-0 w-16 text-right">
              {uptimePercent}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
