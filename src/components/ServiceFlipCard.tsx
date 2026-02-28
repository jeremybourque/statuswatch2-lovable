import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { RotateCcw } from 'lucide-react';

interface ServiceFlipCardProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
}

function generateMockUptime(serviceId: string): number[] {
  // Deterministic pseudo-random based on service id
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = ((hash << 5) - hash + serviceId.charCodeAt(i)) | 0;
  }
  const days: number[] = [];
  for (let i = 0; i < 90; i++) {
    hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
    const rand = (hash % 1000) / 1000;
    // Most days are fully operational
    if (rand > 0.92) days.push(rand > 0.97 ? 0 : rand > 0.95 ? 1 : 2);
    else days.push(3);
  }
  return days; // 0=outage, 1=partial, 2=degraded, 3=operational
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
      className="relative h-[120px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card shadow-sm overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`absolute inset-y-0 left-0 w-1 ${cfg.dotClass}`} />
          <div className="p-4 pl-5 flex items-center justify-between h-full">
            <div>
              <p className="text-sm font-medium text-card-foreground">{service.name}</p>
              {service.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card shadow-sm overflow-hidden p-4"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-card-foreground">{service.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{uptimePercent}% uptime</span>
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">90 days</p>
          <div className="flex gap-[2px] flex-wrap">
            {uptimeDays.map((day, i) => (
              <div
                key={i}
                className={`h-3 w-[calc((100%-178px)/90)] min-w-[2px] flex-1 rounded-[1px] ${dayColors[day]} opacity-80 hover:opacity-100 transition-opacity`}
                title={`Day ${90 - i}: ${['Major Outage', 'Partial Outage', 'Degraded', 'Operational'][day]}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">90d ago</span>
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
