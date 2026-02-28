import { useState, useMemo } from 'react';
import { statusConfig } from '@/lib/status-helpers';
import type { ServiceStatus } from '@/lib/status-helpers';
import { format, subDays } from 'date-fns';
import { BarChart3, CalendarDays, Activity, Info } from 'lucide-react';
import { UptimeBarsView } from './service-card/UptimeBarsView';
import { CalendarView } from './service-card/CalendarView';
import { ResponseGraphView } from './service-card/ResponseGraphView';

interface ServiceFlipCardProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
}

function StatusDot({ status }: {status: ServiceStatus;}) {
  const cfg = statusConfig[status];
  return (
    <span className="relative flex h-3 w-3">
      {status !== 'operational' &&
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dotClass} opacity-75`} />
      }
      <span className={`relative inline-flex rounded-full h-3 w-3 ${cfg.dotClass}`} />
    </span>);

}

function generateMockUptime(serviceId: string): number[] {
  let hash = 0;
  for (let i = 0; i < serviceId.length; i++) {
    hash = (hash << 5) - hash + serviceId.charCodeAt(i) | 0;
  }
  const days: number[] = [];
  for (let i = 0; i < 90; i++) {
    hash = hash * 1103515245 + 12345 & 0x7fffffff;
    const rand = hash % 1000 / 1000;
    if (rand > 0.92) days.push(rand > 0.97 ? 0 : rand > 0.95 ? 1 : 2);else
    days.push(3);
  }
  return days;
}


export function ServiceFlipCard({ service }: ServiceFlipCardProps) {
  const [rotationX, setRotationX] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mouseInTopHalf, setMouseInTopHalf] = useState(true);
  const [backView, setBackView] = useState<'bars' | 'calendar' | 'graph'>('bars');
  const [viewKey, setViewKey] = useState(0);
  const [fading, setFading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const switchView = (view: typeof backView) => {
    if (view === backView) return;
    setFading(true);
    setTimeout(() => {
      setBackView(view);
      setViewKey((k) => k + 1);
      setFading(false);
    }, 150);
  };
  const cfg = statusConfig[service.status as ServiceStatus];
  const uptimeDays = useMemo(() => generateMockUptime(service.id), [service.id]);

  const uptimePercent = useMemo(() => {
    const good = uptimeDays.filter((d) => d >= 2).length;
    return (good / uptimeDays.length * 100).toFixed(2);
  }, [uptimeDays]);

  const statusLabels = ['Major Outage', 'Partial Outage', 'Degraded', 'Operational'];
  const isFlipped = Math.abs(Math.round(rotationX / 180)) % 2 === 1;

  return (
    <div
      className="relative h-[110px] cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const isTopHalf = clickY < rect.height / 2;
        const direction = isTopHalf ? 1 : -1;

        setRotationX((prev) => {
          const next = prev + direction * 180;
          return Math.abs(next) >= 3600 ? next % 360 : next;
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseInTopHalf(e.clientY - rect.top < rect.height / 2);
      }}>

      <div
        className={`absolute inset-0 transition-transform duration-500 ${!isFlipped && hovered ? (mouseInTopHalf ? 'animate-flip-wiggle' : 'animate-flip-wiggle-reverse') : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotationX}deg)`
        }}>

        {/* Front */}
        <div
          className="group absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}>

          <div className="p-4 flex flex-col justify-center h-full">
            {service.description && (
              <p className="text-sm invisible pl-6">&nbsp;</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={service.status as ServiceStatus} />
                <span className="text-lg font-medium text-card-foreground truncate">{service.name}</span>
                <Info size={16} className="text-muted-foreground shrink-0" />
              </div>
              <span className={`text-base font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground truncate pl-6 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] delay-0 group-hover:delay-200">{service.description}</p>
            )}
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors overflow-hidden p-4 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <StatusDot status={service.status as ServiceStatus} />
              <span className="text-sm font-medium text-card-foreground truncate">{service.name}</span>
              <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => switchView('bars')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'bars' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Uptime bars"
                >
                  <BarChart3 size={14} />
                </button>
                <button
                  onClick={() => switchView('calendar')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'calendar' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Calendar view"
                >
                  <CalendarDays size={14} />
                </button>
                <button
                  onClick={() => switchView('graph')}
                  className={`p-2 -m-1 rounded transition-colors ${backView === 'graph' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Response time"
                >
                  <Activity size={14} />
                </button>
              </div>
            </div>
            <span className="text-xs font-medium font-mono text-muted-foreground">{uptimePercent}% uptime</span>
          </div>
          <div className={`relative w-full flex-1 flex flex-col transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`} onMouseLeave={() => setHoveredDay(null)}>
              {backView === 'bars' && (
                <UptimeBarsView uptimeDays={uptimeDays} onHover={setHoveredDay} />
              )}
              {backView === 'calendar' && (
                <CalendarView uptimeDays={uptimeDays} onHover={setHoveredDay} />
              )}
              {backView === 'graph' && (
                <ResponseGraphView serviceId={service.id} onHover={setHoveredDay} />
              )}
            {backView === 'graph' && hoveredDay && (
              <span className="absolute top-0 left-0 text-xs font-medium text-foreground bg-card/80 px-1 rounded pointer-events-none">{hoveredDay}</span>
            )}
          </div>
          {backView !== 'graph' && (
            <div className="mt-auto pt-1 h-5">
              <span className="text-xs font-medium text-foreground truncate block">{hoveredDay ?? '\u00A0'}</span>
            </div>
          )}
        </div>
      </div>
    </div>);

}